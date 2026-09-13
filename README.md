# courtier-console-v2

Console 3D cho một mô hình kết cấu thép — hai chế độ vẽ (`engineering` thủ
công, `realistic` từ GLB), panel thao tác, đo đạc, timeline thi công. Đọc file
này trước khi đụng vào code; nó nói cách chạy, luật không được phá, và những
cái bẫy đã có người trả giá rồi để khỏi phải trả lại.

---

## 1. Chạy nó

Node đúng bản trong `.nvmrc` (hiện là `v22.16.0`):

```
nvm use
npm install
```

Lệnh hay dùng:

```
npm run dev        # dev server, http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src --ext .ts,.tsx
npm run build      # tsc --noEmit && vite build
npm run preview    # serve bản dist đã build, http://localhost:4173
```

`http://localhost:5173/?gallery` (hoặc `4173/?gallery`) mở riêng trang design
system — bảng màu MEASURED/DERIVED, không có model 3D. Dùng khi cần soi token
mà không kéo theo canvas.

---

## 2. Hai chế độ

- **Engineering**: hình hộp vẽ thủ công, sinh ra từ `src/diagram/model.ts` —
  đây là generator duy nhất cho part, component và cây explorer, nên ba thứ
  đó không bao giờ lệch id nhau. Đây là chế độ đo đạc hoạt động.
- **Realistic**: nạp `public/structure_demo.glb` (nén Draco, giải nén qua
  `public/draco/`), chiếu sáng bằng HDRI (`public/env/site_2k.hdr`), qua một
  chuỗi postprocessing (AO ở High, tone mapping, SMAA).

Ở Realistic, cây Model explorer đọc thẳng member của GLB (tầng → loại cấu
kiện → member), còn Engineering vẫn dùng cây sinh từ `model.ts`.

Measure chạy ở cả hai mode. Điểm đo gắn với member của một model, nên đổi mode
thì xoá hết điểm — giữ lại sẽ ra con số sai mà trông như đúng.

Lỗ hổng đang biết, nói thẳng chứ không giấu:
- **Tiết diện tròn** (ống, thanh treo, bu lông): ứng viên snap là góc/cạnh
  bbox, có thể nằm ngoài vật liệu.
- **Timeline + Measure ở Realistic**: điểm theo pose lúc panel render lần cuối;
  kéo timeline không cập nhật số đo. Chưa test.
- **Section + Measure ở Realistic**: chưa test live.
- Raycast của three không xét `visible`; `isRendered` trong `snapping.ts` là
  luật duy nhất cho cả select lẫn measure. Đừng lọc hit ở chỗ khác.

---

## 3. Luật token màu

`src/design/tokens.css` là **file duy nhất** trong `src/` được phép chứa giá
trị màu thô (hex). Mọi nơi khác dùng `var(--…)`.

Token chia ba mức, ghi ngay cạnh giá trị trong `tokens.css`:
- **MEASURED** — đo trực tiếp từ ảnh tham chiếu bằng ImageMagick. Đã chốt,
  không "cải thiện" lại.
- **DERIVED** — dựng lại theo thang tint vì ảnh tham chiếu bị làm mờ ở vùng
  đó, chưa so được với gốc.
- **APPROVED** — một giá trị DERIVED đã được user duyệt sau khi so
  `?gallery` cạnh crop tham chiếu.

`src/diagram/palette.ts` đọc các token này qua `getComputedStyle` lúc module
load, **không có fallback nào** — thiếu token thì `throw` ngay kèm tên token,
cố tình, để không có màu nào lặng lẽ trôi lệch khỏi `tokens.css`.

Cổng chặn cho luật này:

```
grep -rnE '#[0-9a-fA-F]{3,8}' src --include='*.css' | grep -v tokens.css
```

Không ra dòng nào mới coi là qua.

---

## 4. Cổng chặn — chạy trước khi báo bất kỳ thay đổi nào xong

Năm cổng ở CHECKLIST §0, cộng grep debug-sweep. Chạy đủ mỗi lần, không có
ngoại lệ vì "chắc ổn":

```
npm run typecheck
npm run lint
grep -rnE '#[0-9a-fA-F]{3,8}' src --include='*.css' | grep -v tokens.css
grep -rn "__debug\|window\.__\|console\.log" src
```

- `npm run dev` render với **zero** console error.
- `npm run build` xong thì `npm run preview` cũng phải **zero** console
  error — **preview không phải bước tùy chọn**. `palette.ts` đọc CSS custom
  property lúc module load; thứ tự import ở dev server (mỗi module một file)
  không được đảm bảo giống thứ tự trong bundle production, và cascade CSS
  Modules cùng độ đặc hiệu (specificity) phân thắng thua theo đúng thứ tự
  import đó. Dev chạy đúng không chứng minh được gì về production.

---

## 5. Bẫy đã trả giá rồi

- **Custom property CSS chưa định nghĩa** trong `background` tính ra
  `transparent` một cách im lặng — không lỗi, không cảnh báo. Kiểm tra giá
  trị `getComputedStyle` thật, đừng chỉ kiểm tra "có class hay không".
- **`EffectComposer` của `postprocessing` set `renderer.autoClear = false`
  và không bao giờ trả lại.** `Effects.tsx` (fix ở commit `3291b75`) tự trả
  về `true` lúc unmount — thiếu bước này thì rời Realistic mode là canvas
  ngừng clear frame.
- **`translateX` ẩn pixel, không ẩn focus.** Drawer bên phải ở màn hẹp dùng
  `visibility` lệch pha với transition của `transform` (commit `30b5c1e`) —
  nếu chỉ trượt bằng `transform`, control bên trong drawer đã đóng vẫn nằm
  trong tab order.
- **Giữa hai CSS Module, độ đặc hiệu (specificity) bằng nhau thì module nào
  nằm sau trong bundle thắng** — thứ tự đó theo thứ tự import trong
  component, không theo thứ tự khai báo bên trong một file (commit
  `d23442f`) — build production mới lộ thứ tự thật; xem mục 4.
- **Một prop camera khai báo (declarative) không tự nói "làm lại lần nữa".**
  Bấm lại đúng shot đang active mà `position` không đổi thì React không
  re-apply gì cả. `CameraRig` nhận một nonce luôn đổi giá trị mỗi lần bấm,
  kể cả bấm lại shot cũ (commit `ed29795`).
- **Đừng tin ảnh chụp canvas qua CDP (`take_screenshot`)** — nó từng trả về
  byte giống hệt nhau cho hai trạng thái scene thật sự khác nhau. Đọc thẳng
  `canvas.toDataURL()` thay vào đó; cách đọc đó chỉ đáng tin vì `Canvas` bật
  `preserveDrawingBuffer: true` (`src/diagram/DiagramScene.tsx`) —
  `preserveDrawingBuffer` không sửa CDP, nó làm cho cách đọc `toDataURL()`
  hoạt động đúng.
- **OrbitControls có damping** — sau khi đổi camera, đợi ~2 giây trước khi
  chụp hay đo, không thì bắt được frame giữa chuyển động.
- **`innerText` bỏ qua chữ được CSS chuyển hoa** (`text-transform:
  uppercase`) — so khớp trên `textContent`, không phải `innerText`.
- **So hash canvas tuyệt đối quá khắt khe với frame PBR** — hash chính xác
  lệch nhau sau chu trình ISO → xoay → ISO, dù pixel-diff có ngưỡng cho ra
  0% khác biệt ở đúng cặp đó, và cũng 0% ở control không đổi input (nghỉ →
  nghỉ). Nguyên nhân lệch hash chưa xác định — dùng pixel-diff có ngưỡng,
  đừng so hash tuyệt đối. Control phải ra ~0% thì số đo mới dùng được; control
  lệch (scene chưa đứng yên) nghĩa là nhiễu lớn hơn tín hiệu — đợi frame ổn
  định rồi đo lại.
- **`.focus()` hay kiểm tra `aria-*` trên nhầm phần tử không chứng minh được
  gì.** Tên mà assistive tech đọc ra đến từ accessibility tree (accessible
  name), không phải `textContent` đọc tay — và `.focus()` trên phần tử
  `disabled` là no-op im lặng, dễ tạo kết quả "nhảy focus" giả.

---

## 6. Tài liệu khác

- `docs/CHECKLIST.md` — hợp đồng spec ↔ implementation: cổng chặn, bất biến,
  và những mục chưa xong, kèm dòng Nghiệm thu cho từng cái.
- `docs/FEATURES.md` — mọi tính năng app đang tỏ ra làm được, bấm thật bằng
  Playwright, không suy luận từ code.
- `docs/FEATURES-TODO.md` — tính năng rút từ khảo sát `bim-viewer`, ghi rõ
  lấy thuật toán nào và bỏ gì.
- `docs/RESEARCH-3D-REALISM.md` — ghi chú nguồn gốc (primary-source) cho các
  kỹ thuật làm scene three.js/r3f trông thật hơn.
