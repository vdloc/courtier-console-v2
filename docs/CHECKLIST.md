# Checklist — những gì phải đúng trước khi app này coi là xong

File này là hợp đồng giữa người ra spec và người implement. Một mục không
"xong" vì đã có code cho nó; nó xong khi dòng **Nghiệm thu** đã được chạy thật
và kết quả đã được báo lại.

Thứ tự là cố ý. Không nhảy cóc nếu user chưa quyết.

> Ghi chú: file này viết bằng tiếng Việt. **Copy trong UI của app vẫn là tiếng
> Anh** — đó là quyết định riêng, không đổi.

---

## 0. Cổng chặn — mọi thay đổi, không ngoại lệ

Chạy trước khi báo bất kỳ mục nào hoàn thành. Đủ cả năm, mỗi lần.

- [ ] `npm run typecheck` thoát 0
- [ ] `npm run lint` thoát 0
- [ ] `grep -rnE '#[0-9a-fA-F]{3,8}' src --include='*.css' | grep -v tokens.css` không ra gì
- [ ] Dev server render với **zero** console error
- [ ] Với bất cứ thứ gì đụng tới thứ tự load module, import, hay bundle: bản production chạy qua `vite preview` cũng phải zero console error — `palette.ts` đọc CSS custom property lúc module load, và thứ tự import ở dev không phải bằng chứng

Báo lại đã chạy cổng nào và nó in ra gì. "Chắc ổn" không phải là cổng.

---

## 1. Bất biến — phá một cái là lỗi, kể cả khi tính năng chạy

- [ ] `src/design/tokens.css` là file duy nhất chứa giá trị màu thô
- [ ] `src/diagram/palette.ts` không có fallback; thiếu token thì throw kèm tên token
- [ ] Luật hex của ESLint không bị nới, tắt, hay override theo file
- [ ] Radix chỉ cấp hành vi, không bao giờ cấp giao diện; mỗi primitive mặc CSS Module riêng
- [ ] Không có type của renderer (`Object3D`, `Vector3`, `Plane`, …) ở bất kỳ đâu trong `src/store/`
- [ ] Panel nhận zero prop, đọc store qua selector
- [ ] Comment một tới hai dòng, chỉ ở chỗ code không tự nói được; lý do đi vào commit message
- [x] `src/diagram/realistic/StructureGlb.tsx` là nguồn duy nhất cho cả hai mode — Engineering không còn vẽ model sinh ra riêng; id trong viewport và Model Explorer đều đọc từ GLB nên không thể lệch nhau. `src/diagram/model.ts` đã bị xoá hẳn (không còn tồn tại làm file) — xem §3

---

## 2. Những control đang nói dối

Mấy cái này đều render, nhận input, ghi vào store — và không đổi gì trong
viewport. Một control không làm gì còn tệ hơn là không có. Đây là phần ưu tiên.

### 2.1 Mặt cắt không cắt — ĐÃ XONG

- Hiện trạng: `sectionEnabled` / `sectionAxis` / `sectionPosition` / `sectionFlipped` nằm trong `viewSlice`. `ViewControls` điều khiển cả bốn. `Viewport` hiện chip "section". `DiagramScene` không hề đọc chúng.
- Phải: hình học bị clip thật, theo trục đã chọn, tại vị trí đã chọn, theo chiều đã chọn.
- Nghiệm thu: ảnh chụp ở ba vị trí slider trên cùng một trục cho ra ba lát cắt khác nhau; flip đảo nửa nào còn lại; tắt thì model trở lại nguyên vẹn. **Đã chạy — xem báo cáo trong commit message.**
- Ngoài phạm vi: bịt mặt cắt (cap), gizmo mặt cắt trong scene.

### 2.2 Đo đạc không pick được — ĐÃ XONG

- Hiện trạng cũ (đã lỗi thời): `measureSlice` từng giữ điểm mock; không cú click nào sinh điểm thật.
- Hiện tại: pick trong viewport (`StructureGlb.tsx`'s `onClick`, qua `snapToFeature` trong `snapping.ts`) thêm điểm thật; `partId` là tên member GLB thật, loại snap (vertex/midpoint/edge/face) tính từ hình học thật. `docs/FEATURES.md` mục E ghi lại kết quả bấm thật.
- Ngoài phạm vi của mục này: `src/diagram/measurement.ts` và `src/diagram/snapping.ts` đang được implementor port lại (xem ghi chú ở đầu file này) — không đụng, không "sửa" claim ở đây thay việc đọc code thật.

### 2.3 Nút Play của timeline không chạy — ĐÃ XONG

- `play()`/`tick()` trong `timelineSlice.ts` cùng vòng rAF ở `Timeline.tsx`'s `usePlaybackLoop` đẩy `progress` thật theo thời gian thực; dừng ở 1 với `playback: 'finished'`. Nghiệm thu ở `docs/FEATURES.md` mục G2.
- rAF vẫn ở component (`Timeline.tsx`), không phải slice — đúng như thiết kế ban đầu.

### 2.4 `quality` được ghi, không ai đọc — ĐÃ XONG

- Bốn chỗ đọc thật: kích thước shadow map (`RealisticScene.tsx`), bật/tắt N8AO (`Effects.tsx`), bật/tắt + độ phân giải `ContactShadows` (`RealisticScene.tsx`), và tỉ lệ khoảng cách LOD cull (`StructureGlb.tsx`'s `refreshVisibility`, qua `LOD_SCALE`).

### 2.5 `hovered` được ghi, không ai đọc — ĐÃ XONG (đã xoá field)

- `grep -rn hovered src` không còn ra dòng nào — field đã bị xoá khỏi store, không phải được nối vào một hành vi hover thật.

---

## 3. Dữ liệu phải nói thật

- [x] `status` — quyết định: bản GLB không có trường tiến độ thi công. `ComponentInfo.status` là optional (`Status | undefined`); mọi component đọc từ GLB đều `undefined`, không còn bịa `'Installed'` như bản cũ. `PropertyPanel` ẩn hẳn chip khi không có giá trị, thay vì hiện một trạng thái sai. Không phải "trang trí không điều khiển gì" nữa — là một trường thật, hiện đúng không có dữ liệu.
- [x] `connected[]` trong `PropertyPanel` đi tới được: click một id liên kết thì chọn đúng phần tử đó — nghiệm lại ở `docs/FEATURES.md` mục F3, đọc từ `connected_objects` thật trong GLB.
- [x] Quyết và ghi lại: **nạp từ GLB**, không sinh ra nữa. `src/diagram/model.ts` đã bị xoá (commit "refactor: delete the procedural model generator"). Id nhất quán không còn do cấu tạo của generator, mà do chỉ còn một nguồn duy nhất (`StructureGlb.tsx`) cho cả viewport lẫn Model Explorer — xem §1.

---

## 4. Design system, vẫn chưa chốt

- [ ] Nửa DERIVED của `tokens.css` chưa từng được so với ảnh tham chiếu. Neutral, semantic, và mọi màu chữ đều dựng lại theo thang tint, không phải đo được.
- [ ] Nghiệm thu: chụp `?gallery` ở 1846×922 đặt cạnh crop tham chiếu, và ghi phán quyết của user vào `tokens.css` — giá trị nào qua được thì nâng từ DERIVED lên APPROVED.
- [ ] Giá trị MEASURED là đã chốt. Đừng "cải thiện" chúng.

---

## 5. Độ bền chưa ai hỏi tới

- [x] Không cuộn ngang ở 900px (`scrollWidth === clientWidth`, đo thật lần này). Model Explorer không chỉ "bị ẩn" ở màn hẹp — nó thành drawer bấm nút mở/đóng (`explorerOpen` trong `viewSlice`, nút "Model explorer" ở `TopBar`), nghiệm ở `docs/FEATURES.md`.
- [x] Bàn phím: registry lệnh + phím tắt thật (`src/interaction/commands.ts`), overlay "Keyboard shortcuts" liệt kê đủ — bấm thật lần này, xem `docs/FEATURES.md`.
- [ ] Trạng thái rỗng và cực đoan: tắt hết layer, ẩn hết, `progress` bằng 0, filter không khớp gì. Không cái nào được throw hay render panel trắng mà không giải thích.
- [ ] Scene giờ là 3362 member GLB, một `<mesh>` mỗi member (con số "175 part" là của generator thủ công đã xoá). Đã đo và sửa một phần: shadow pass giảm 612 → 228 draw call (-63%) bằng cách chỉ cho cấu kiện kết cấu chính đổ bóng (`STRUCTURAL_TYPES`, không đổi `receiveShadow`) — xem commit "perf: connection-level parts stop casting shadows". Beauty pass (vẽ màu) vẫn một draw call mỗi mesh, chưa đo lại xem có cần instancing/batching hay không — quyết định đó bị hoãn có chủ đích vì per-member identity (select/isolate/hide/explode/section/measure) đều khoá theo mesh riêng lẻ (registry `glbMembers.ts`), và một lần gộp mesh ẩu sẽ phá cả sáu hành vi đó.
- [x] `<Canvas>` không còn vẽ liên tục 60fps cho scene đứng yên — `frameloop="demand"` (`src/diagram/DiagramScene.tsx`), cộng `StoreInvalidator` subscribe nguyên store gọi `invalidate()` trên mọi thay đổi (rẻ hơn dò từng field, và đúng bẫy đã cảnh báo ở `docs/FEATURES-TODO.md` P1.2: quên invalidate thì đứng hình). Tween camera tự invalidate mỗi bước; `OrbitControls` của drei tự invalidate khi đổi. Nghiệm ở `vite preview`, không đứng hình, không lỗi console.

---

## 6. Vệ sinh repo

- [ ] Commit message mang phần lý do đã cố ý không để trong comment
- [ ] Không `dist/`, không file tạm, không dòng `.gitignore` trùng
- [ ] Có `README` nói cách chạy, luật token là gì, và những cái bẫy đã trả giá rồi
