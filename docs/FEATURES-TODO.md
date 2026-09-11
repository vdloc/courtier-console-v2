# Tính năng cần thêm — rút từ bim-viewer

Nguồn khảo sát: `/home/vdloc/Documents/bim-viewer` (Vue 2 + element-ui + three 0.152,
MIT). Một agent đã đọc source và truy cơ chế từng tính năng; tôi đã tự kiểm lại
`Viewer3DUtils.ts` và `Measure.ts` trước khi đưa vào đây.

**Quy tắc**: chỉ lấy **thuật toán**, không lấy code. Toàn bộ tầng UI bên đó dính
chặt vào Vue/element-ui, không có gì port được. Mỗi mục dưới đây ghi rõ lấy gì,
bỏ gì, và tại sao.

Ưu tiên: P1 sửa thứ đang gãy · P2 thêm năng lực thật · P3 để sau.

---

## P1.1 — Camera fit / focus (sửa luôn BUG-1, D2, D3, D7)

Bên đó có `getCameraPositionByBboxAndCamera()` và `getCameraPositionByBboxAndView()`
trong `/home/vdloc/Documents/bim-viewer/src/core/utils/Viewer3DUtils.ts`. Ý tưởng
đáng lấy: **giữ nguyên hướng nhìn hiện tại, chỉ tính lại khoảng cách** —

    const dir = oldPostion.sub(look).normalize();
    const pos = dir.multiply(distanceVector).add(look);

Bay tới một part thì không giật camera về góc cố định, chỉ tiến lại gần. Đó là
hành vi đúng.

**Không lấy cách tính khoảng cách của họ.** Họ dùng
`distance = (dx + dy + dz) * 1.2` — tổng ba cạnh bbox, không hề dính tới `fov`
hay `aspect`. Đổi FOV hay đổi tỉ lệ khung là sai ngay. Ta dùng công thức thật:

    bbox → bounding sphere (tâm c, bán kính r)
    distance = r / sin(fov_radians / 2)
    nếu aspect < 1 thì chia thêm cho aspect (khung hẹp cần lùi xa hơn)
    nhân hệ số padding ~1.15

Việc phải làm:
- `Fit model`, `Focus selected`, `Reset view` có handler thật.
- Bấm lại đúng shot đang active phải đưa camera về — hiện là no-op (BUG-1).
  Nguyên nhân đã biết: prop `position` không đổi thì không re-apply. Cần một
  đường mệnh lệnh (ref tới controls/camera), không phải một prop khai báo.
- Chuyển góc nhìn thì tween, đừng nhảy. Họ tween hai pha — `target` trước
  500ms rồi `position` 1500ms, "ngoái nhìn trước khi đi". Cảm giác tốt hơn hẳn
  tween một pha.

Nghiệm thu: xoay chuột lung tung → `Reset view` đưa hash canvas về đúng baseline.
Chọn một part → `Focus selected` → part đó chiếm phần lớn khung, không bị cắt.

## P1.2 — Render theo yêu cầu

Họ tự viết `RafHelper` + cờ `renderEnabled`: mọi tương tác gọi `enableRender()`,
1000ms sau không có gì thì ngừng gọi `renderer.render()`.

Ta **không port** — R3F có sẵn `frameloop="demand"` + `invalidate()`. Nhưng phải
làm, vì hiện `<Canvas>` đang vẽ liên tục 60fps cho một scene đứng yên.

Cạm bẫy đã biết: `frameloop="demand"` mà quên `invalidate()` sau khi state đổi
thì màn hình đứng hình. Mọi đường đổi state của scene phải kích một frame. Đây
là loại lỗi mà typecheck không bắt được.

Nghiệm thu: scene đứng yên → không có frame nào được vẽ; mọi thao tác trong
FEATURES.md vẫn đổi hash canvas đúng như cũ.

## P1.3 — "Export view" biến thành ảnh thật

Nút đang chết (BUG-9). Bên đó: `canvas.toDataURL('image/png')`, và có comment
nhắc đúng cái bẫy — phải có `preserveDrawingBuffer: true` lúc tạo renderer, nếu
không buffer đã bị xoá trước khi đọc.

Ta **đã có sẵn cờ đó** trên `<Canvas>`. Nên đây là tính năng rẻ nhất trong file
này: một nút, một `toDataURL`, một thẻ `<a download>`.

Lưu ý nếu sau này bật `frameloop="demand"`: phải `invalidate()` và đợi frame vẽ
xong rồi mới đọc buffer.

---

## P2.1 — Section: tách clipping toàn cục và clipping theo material

Bên đó có ba bản section khác nhau. Điều đáng giá nhất, xác nhận trực tiếp cho
§2.1 đang làm:

1. **Họ gán `clippingPlanes` cho cả `LineSegments`**, không chỉ mesh. Đúng cái
   bẫy tôi đã cảnh báo implementor — edge không tự cắt theo mặt.
2. **Không bản nào bịt mặt cắt.** Một viewer BIM trưởng thành cũng chỉ dùng một
   `backFace` bán trong suốt. Quyết định để "cap" ngoài phạm vi §2.1 là đúng.
3. `GlobalPlaneSection` dùng `renderer.clippingPlanes` (một mặt phẳng, toàn
   scene, rẻ) còn bản theo object dùng `material.clippingPlanes`. Ta đang đi
   đường local vì phải giữ lại kích thước/nhãn — giữ nguyên lựa chọn đó.
4. Mẹo nhỏ đáng lấy: cộng `+0.1` vào hằng số mặt phẳng để chính hình vẽ của mặt
   cắt không tự cắt mình.

Bổ sung sau khi §2.1 xong: gizmo kéo được. Cách họ làm — chiếu chuột lên một
`PlaneGeometry(1e6, 1e6)` vô hình xoay về phía camera rồi suy ngược ra toạ độ.
Đơn giản và chạy được.

## P2.2 — Đo đạc: không có gì để lấy

Đây là kết quả quan trọng nhất của cuộc khảo sát, và là tin xấu.

**bim-viewer không có snap.** Không một chữ "snap" nào trong
`/home/vdloc/Documents/bim-viewer/src/core/measure/`. `getClosestIntersection()`
là `Raycaster.intersectObject(scene, true)` trần, lấy đúng điểm giao tam giác,
lọc mỗi khoảng cách tối đa 500. Người dùng bấm trúng đâu thì đo ở đấy.

Nghĩa là §2.2 không có bản mẫu để chép. Phải tự thiết kế. Đề xuất của tôi, xếp
theo công sức:

| Mức | Cách làm | Đánh đổi |
|---|---|---|
| Chỉ face | Đúng như họ: điểm giao tam giác | Rẻ nhất, nhưng số đo không bao giờ tròn — đo một dầm 7.2m ra 7.183m |
| Vertex trong bán kính pixel | Từ tam giác trúng, xét 3 đỉnh + các đỉnh lân cận, chiếu ra màn hình, lấy cái gần con trỏ nhất dưới ~12px | Vừa sức, và với model toàn hộp thì hầu như luôn snap đúng góc |
| Vertex + trung điểm cạnh + tâm mặt | Thêm ứng viên suy ra từ tam giác trúng, xếp hạng theo khoảng cách pixel, ưu tiên vertex > midpoint > face | Đúng kỳ vọng của kỹ sư, nhưng cần chỉ báo trực quan cho biết đang snap kiểu gì |

Khuyến nghị: **mức 3**, giới hạn trong tam giác trúng và các đỉnh của hộp chứa
part đó. Model của ta là hộp chữ nhật hết, nên tập ứng viên nhỏ và đoán được —
không cần spatial index.

Vẫn chờ anh quyết trước khi giao việc.

## P2.3 — Trục toạ độ góc màn hình

`CoordinateAxesViewport.ts`: một `WebGLRenderer` thứ hai nhỏ xíu +
`OrthographicCamera` riêng, mỗi frame đồng bộ **hướng** (không đồng bộ vị trí)
từ camera chính qua `camera.getWorldDirection()`.

Bên đó nó **không bấm được** — chỉ là la bàn, không phải view cube. Họ ghi view
cube vào TODO và chưa làm.

Với R3F thì rẻ hơn nhiều: `<GizmoHelper>` + `<GizmoViewport>` của drei, và bản
drei **bấm được** để nhảy về mặt chuẩn. Lấy luôn bản drei, tốt hơn bản gốc.

## P2.4 — Phím tắt

Của họ, đáng lấy ba phím: `F` bay tới cái đang chọn, `T` đặt lại tâm xoay vào
điểm vừa bấm, `Y` dựng thẳng hướng nhìn theo trục đứng. `T` đặc biệt hữu ích —
xoay quanh chỗ đang nhìn thay vì quanh tâm model.

Phụ thuộc P1.1 (đã có toán fit thì `F` gần như miễn phí).

---

## P3 — Ghi nhận, chưa làm

- **Instancing / merge geometry** (`InstantiateHelper`, `MergeHelper`): gom mesh
  theo cặp geometry+material rồi thay bằng `InstancedMesh`. Ta có 175 part, một
  `<mesh>` mỗi part. Chưa cần. §5 của CHECKLIST đã nói: **đo trước, đừng đoán**.
  Ghi lại đây để khi số part lên hàng nghìn thì biết chỗ mà tìm.
- **Culling theo bbox từng model**: họ cài getter/setter lên `.visible` để phân
  biệt "ẩn do frustum" và "ẩn do người dùng". Thông minh nhưng là bẫy bảo trì.
  Không lấy.
- **OutlinePass** cho highlight lựa chọn: hiện ta đổi màu + dày nét, đủ dùng.
- **Xuất GLTF/OBJ/DRACO**: có sẵn trong three, làm khi có ai cần.

---

## Dứt khoát không lấy

| Thứ | Lý do |
|---|---|
| Toàn bộ component Vue/element-ui | `vue-class-component`, `$store`, element-ui xuyên suốt. Không một dòng nào dùng lại được. |
| Model tree của họ | Dựng trên bản element-ui tree vá tay, chép vào `src/lib/`. Cây của ta đã chạy đúng và sinh từ một generator duy nhất — tốt hơn của họ, vì họ `scene.traverse()` lại từ đầu mỗi lần mở panel và giới hạn cứng `maxDepth = 5`. |
| Đường IFC | Import bị comment, `require()` động một `IFCLoader.js` vá tay trong `public/`, kèm comment "don't know why I cannot use instanceof". Nếu sau này cần IFC thì đi thẳng `web-ifc-three` bản mới. |
| Mẹo lấy mẫu bbox | Bỏ bớt con khi đông (chia 3/5/10/100) để đổi độ chính xác lấy tốc độ. 175 part thì vô nghĩa. |
| Máy trạng thái lệnh bằng tay | Mỗi handler tự đi huỷ các lệnh xung đột. Vỡ ngay khi thêm lệnh thứ n. |
| `unexplode()` theo số lần gọi | Đảo ngược bằng `factor = scale/(1+scale)` lặp `explodedTimes` lần. Ta tính từ vị trí gốc — đúng hơn. |
| Lọc tầng bằng regex tên object | `/(?:-?(?:\d+(?:\.5)?)F)(?=\W|$)/g` trên tên. Ta có `level` thật trong `model.ts`. |
| dat.GUI + chồng postprocessing | SAO/SSAO/Bloom/SSAA. Ta vẽ bản vẽ kỹ thuật, không phải ảnh render. |
