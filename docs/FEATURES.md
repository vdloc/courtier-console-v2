# Danh sách tính năng hiện có — và kết quả e2e

Liệt kê mọi thứ app đang *tỏ ra* là làm được, tính ở commit `e18ac61`.
Mỗi dòng được bấm thật — `page.mouse`, bàn phím, hoặc click nút thật qua
Playwright/CDP — không suy luận từ code. Số đo trên canvas là pixel-diff có
ngưỡng (10/kênh màu), luôn có control không-thao-tác đọc ra ~0% trước khi tin
một con số khác 0%, và luôn đợi camera đứng yên (`OrbitControls` có damping,
một cú chuyển góc cần khoảng 1s để dừng hẳn — đo sớm hơn cho ra số giữa
chừng, không phải số cuối).

Ký hiệu:

| | |
|---|---|
| PASS | Làm đúng thứ nó hứa |
| FAKE | Có phản hồi UI nhưng không tác động gì tới model/viewport — điều khiển nói dối |
| DEAD | Không có handler; bấm không xảy ra chuyện gì |
| BUG | Có ý định làm, nhưng làm sai |

Cột "Kết quả" để trống nghĩa là chưa chạy.

---

## A. Thanh trên cùng (`TopBar`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| A1 | Tên dự án | Lấy từ `projectName` trong store | **PASS** — "Northgate Plant Extension" |
| A2 | Meta + revision | Hằng số từ `mockData` | **PASS** — STEEL FRAME · 4 × 3 BAYS · G+3 / REV C |
| A3 | Nút "Export view" | Tải một PNG thật của canvas | **PASS** — bấm thật, chặn `<a download>`, decode PNG: 980×774, 120 màu khác nhau lấy mẫu, không phải ảnh trắng |

`AppBar.tsx` (Help, Search — cả hai đều DEAD ở lần chạy trước) đã bị xoá khỏi
codebase (commit `409c24b`); không còn gì để chạy lại.

## B. Model explorer (`ObjectTree`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| B1 | Cây render | Đếm số dòng khớp nhãn "N rows" | **PASS** — 103 rows (engineering) |
| B2 | Ô lọc | Gõ chuỗi → chỉ còn dòng khớp, cộng tổ tiên | **PASS** — "Pipe" → 5 dòng, đúng tổ tiên |
| B2b | Lọc xuyên qua level đang gập | Filter tìm được part chỉ có ở L02/L03 dù hai level này mặc định gập | **PASS** — gõ "Steel_Beam_X_L03_A1" (part chỉ tồn tại ở L03): 4 dòng, không có "No matches"; caret trên "Level 03"/"Floor Framing" là chevron-down (đang mở do filter, không đọc nhầm `collapsed`) |
| B3 | Đóng/mở container | Bấm dòng có con thì gập/mở | **PASS** — Gập Level 01: 103 → 47 → 103 |
| B4 | Chọn component | Bấm dòng lá → Properties đổ đầy | **PASS** — UC 254×254×89, 378.9 kg |
| B5 | Ẩn/hiện từng dòng | Nút con mắt → part biến mất khỏi viewport | **PASS** — pixel-diff > 0, nhãn đổi Hide→Show |
| B6 | Isolate / Show all ở header | Link đổi theo `hidden.size` | **PASS** — pixel-diff 28% khi isolate, link đổi Isolate ↔ Show all |
| B7 | Cuộn tới dòng được chọn | Chọn từ viewport → dòng tự cuộn vào tầm nhìn | **PASS** — `scrollTop` đổi 0 → 1971 thật, dòng nằm trong vùng nhìn thấy |
| B8 | Chấm trạng thái | Màu theo `status` | **PASS** — 3 màu đọc bằng `getComputedStyle`, khớp đúng token (`--ok`, `--warn`, `--border`) |
| B9 | Cây GLB ở Realistic | Tree đọc member thật của GLB | **PASS** — chuyển Realistic, tìm "steel": 261 dòng khớp, giữ nguyên số dòng trước/sau khi B2b đổi code (kiểm bằng `git stash` một file, so kết quả) |
| B10 | Windowing khi kết quả lớn | Query > 300 kết quả vẫn giới hạn số dòng DOM | **PASS** — query "e" ở Realistic: header báo 3345 dòng, DOM chỉ dựng 46 |

## C. Structure layers (`Layers`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| C1 | Checkbox từng layer | Tắt → part thuộc layer đó biến mất | **PASS** — Tắt Foundation: 175 → 155, pixel-diff 9.5% |
| C2 | "Hide layers" / "Show layers" | Bật tắt cả 6 layer | **PASS** — Hide layers → 0, Show layers → 175 |

## D. View controls (`ViewControls`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| D1 | 4 góc máy ảnh (Front/Side/ISO/Joint) | Camera nhảy vị trí, 4 góc phân biệt | **PASS** — 6 cặp pixel-diff từ 26% đến 85%, đều lớn |
| D2 | Fit model | Đưa cả model vào khung | **PASS** — pixel-diff 86% |
| D3 | Focus selected | Disabled khi chưa chọn; zoom vào phần đã chọn | **PASS** — disabled đúng khi chưa chọn; sau khi chọn, pixel-diff 94% |
| D4 | Explode | Các part tách ra khỏi tâm, bật/tắt về đúng | **PASS** — bật 18.6%, tắt về lại đúng baseline (diff 0%) |
| D5 | (đã xoá) | | Tour và các display mode giả từng ở đây đã bị xoá ở `da1384a` — không còn gì để chạy |
| D6 | Statistics | Hiện bảng số liệu chồng lên viewport | **PASS** — bảng hiện, số liệu đúng — xem thêm BUG-2 |
| D7 | Reset view | Về khung nhìn mặc định | **PASS** — pixel-diff 85% từ trạng thái đã xoay |
| D8 | 2 display mode (Realistic / Engineering) | Chuyển hẳn giữa model thủ công và GLB | **PASS** — pixel-diff 99.96%, panel Quality chỉ hiện ở Realistic |
| D8b | Quality (High/Balanced/Fast) | Chỉ hiện ở Realistic; đổi AO + độ phân giải shadow map | **PASS** — mỗi lần đổi tier, pixel-diff ~5% |
| D9 | Measure (bật/tắt) | Hiện chip "measuring" | **PASS** |
| D10 | Isolate | Ẩn mọi thứ trừ cái đang chọn | **PASS** — cùng cơ chế đã đo ở B6 |
| D11 | Show all | Hiện lại tất cả | **PASS** — 0 → 175 |
| D12 | Lưu viewpoint có tên | Thêm dòng vào danh sách | **PASS** |
| D13 | Xoá viewpoint | Bớt dòng | **PASS** |
| D14 | Section: enable/axis/position/flip | | **PASS** — đổi axis và flip cho pixel-diff 100%; enable/position ở đúng góc test cho diff nhỏ (~0.05-0.08%, không phải 0% tuyệt đối) — không còn là "6 hash giống hệt nhau" của lần chạy trước |

## E. Measure (`MeasurePanel`) — cả hai chế độ

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| E1 | Start/stop measuring | | **PASS** |
| E2 | 5 chế độ đo | Đổi chế độ thì xoá điểm đang có | **PASS** — đổi sang Angle: 2 điểm → 0, hint đổi đúng |
| E3 | Dòng gợi ý theo chế độ | | **PASS** |
| E4 | Số đo hiển thị | Tính từ toạ độ pick thật, không hardcode | **PASS** — Engineering: 2 điểm cách nhau tính tay ra 0.075 m, khớp readout. Realistic: 2 điểm trên GLB, tính tay √(9.799²+0.821²+7.985²) = 12.67 m, khớp readout hệt |
| E5 | Danh sách điểm | Toạ độ thật, có object/level pick được | **PASS** |
| E6 | Undo / Clear | Disabled khi không còn điểm | **PASS** — cả hai disabled khi rỗng, Undo bớt đúng 1 điểm |
| E7 | Callout "cần thêm N điểm" | | **PASS** |
| E8 | Measure hoạt động ở Realistic | Pick trên mesh GLB, không còn bị khoá | **PASS** — xem E4; nút Measure không `disabled` ở Realistic |

## F. Properties (`PropertyPanel`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| F1 | Trạng thái rỗng | Chưa chọn gì thì có hướng dẫn | **PASS** |
| F2 | Các nhóm trường | Identity / Classification / Geometry / Material (+ Connected to khi có) | **PASS** — đủ 5 nhóm khi có liên kết |
| F3 | Điều hướng "Connected to" | Bấm id liên kết → chọn phần tử đó | **PASS** — bấm Concrete_Pad_Foundation_A1 → chọn đúng |
| F4 | Chip trạng thái | Tone theo `status` | **PASS** — đọc `getComputedStyle`, Installed ra đúng rgb(30, 142, 62) = `--ok` |

## G. Construction sequence (`Timeline`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| G1 | Slider tiến độ | Kéo → part hiện ra theo thứ tự thi công | **PASS** — progress 0: Parts drawn = 20 (đúng bằng số Foundation tính tay, 5 cột × 4 hàng), không phải 175 — xem BUG-2 |
| G2 | Play / Pause | Đồng hồ chạy thật theo thời gian thực | **PASS** — Play, đợi 2s thật: 0.0s → 2.8s. Pause: đợi thêm 1s thật, đồng hồ đứng yên |
| G3 | Reset | Về 0 | **PASS** |
| G4 | Mốc phase + phase đang chạy | | **PASS** — "Foundations" đúng lúc 0s |
| G5 | Đồng hồ giây | | **PASS** |

## H. Viewport (`Viewport` + `DiagramScene`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| H1 | Canvas vẽ được | | **PASS** — xuyên suốt các mục khác |
| H2 | Bấm vào part → chọn | `page.mouse.click` toạ độ thật trên canvas | **PASS** — bấm giữa canvas → chọn đúng Steel_Beam_X_L01_C3 |
| H3 | Bấm chỗ trống → bỏ chọn | | **PASS** |
| H4 | Chip overlay | mode, shot, measuring, section, exploded | **PASS** |
| H5 | Bảng statistics | Parts drawn / total / hidden đếm đúng, kể cả progress | **PASS** — xem BUG-2, không còn bỏ qua `progress` |
| H6 | Kích thước + nhãn KaTeX | 4 nhãn, không có chữ "Phi" trần | **PASS** — 4 nhãn `.katex`, Φ render đúng ký tự |
| H7 | Orbit control | Kéo chuột xoay được | **PASS** — `page.mouse` kéo thật, pixel-diff 40%, control không-thao-tác đọc 0% |

## I. Toàn cục

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| I1 | Route `?gallery` | Trang design system | **PASS** |
| I2 | Không cuộn ngang | 1600/1280/1100/900 | **PASS** — `scrollWidth > clientWidth` là false ở cả 4 mức |
| I3 | Zero console error | Suốt phiên chạy, không chỉ lúc tải trang | **PASS** — 0 error qua toàn bộ phiên test (hàng chục thao tác thật) |
| I4 | Bàn phím | Dòng cây có `tabIndex`, Enter/Space chọn được | **PASS** — outline 2px rgb(27, 117, 236) = `--primary`, Enter gập/chọn đúng |

---

## BUG-1..9 — nghiệm lại

Cột "Kết quả" dưới đây là của lần chạy này (`e18ac61`), không phải lần cũ.

| # | Tóm tắt lỗi gốc | Sửa ở commit | Kết quả nghiệm lại |
|---|---|---|---|
| BUG-1 | Không có đường quay lại góc nhìn cũ sau khi xoay | `ed29795` | **PASS** — bấm lại đúng shot (ISO) đang active sau khi xoay: pixel-diff 44%, không còn là no-op |
| BUG-2 | Statistics nói dối, bỏ qua `progress` | `ed29795` | **PASS** — progress=0: Parts drawn=20, đúng bằng số Foundation tính tay |
| BUG-3 | Ba nút khác nhau cùng chữ "Show all" | `c5a8093` | **PASS** — Layers giờ là "Hide layers"/"Show layers"; hai nút "Show all" còn lại (Tools, Model explorer) vẫn cố ý gọi cùng `showEverything()` — đây là trùng có chủ đích, không phải lỗi |
| BUG-4 | Hai display mode hứa suông (Analysis, Construction) | `da1384a` | **PASS** — hai mode giả đã bị xoá; chỉ còn Realistic/Engineering, cả hai đều có tác dụng thật (D8 PASS) |
| BUG-5 | Điểm đo chỉ giảm, không tăng | `bfc4225` | **PASS** — pick thêm điểm hoạt động ở cả hai chế độ (xem E4/E8) |
| BUG-6 | Dưới 1280px không xem được Properties | `30b5c1e` | **PASS** — không nghiệm lại chi tiết ở lần chạy này (đã xác nhận kỹ ở đợt sửa); I2 xác nhận không phá gì ở 900px |
| BUG-7 | Viewpoint chỉ ghi, không đọc | `e421972` | **PASS**, có bổ sung — xem mục riêng "BUG-7 follow-up" bên dưới |
| BUG-8 | Lọc không khớp thì panel trắng trơn | `d23442f` | **PASS** — "No matches for…" hiện đúng, có nút Clear filter |
| BUG-9 | Núm chết (Tour, Fit model, Focus selected, Reset view, Help, Search, Export view) | `da1384a`, `ed29795`, `588364c`, `409c24b` | **PASS** — Fit/Focus/Reset đều PASS (D2/D3/D7); Export view PASS (A3); Tour/Help/Search đã bị xoá cùng AppBar |

---

## BUG-7 follow-up — camera cũ khi lưu viewpoint

Yêu cầu: thử tái hiện việc lưu viewpoint chụp lại camera cũ (stale) mà
researcher từng thấy. Bốn kịch bản, cả bốn chạy trên `e18ac61`:

1. **Lưu ngay sau khi xoay chuột** — **KHÔNG tái hiện được.** Lưu → xoay →
   restore cho pixel-diff 39% ngay sau khi restore, nhưng đó là animation
   `OrbitControls` (damping) đang chạy, chưa phải trạng thái cuối. Đợi đủ —
   10 lần đọc cách nhau 500ms, tất cả 0% — thì restore khớp baseline ISO ban
   đầu tuyệt đối (diff 0%). Đây là bẫy đo đạc (xem `README.md` §5), không
   phải lỗi app.
2. **Lưu trong lúc Fit/Reset đang tween** — **TÁI HIỆN ĐƯỢC.** Bấm "Fit
   model" và bấm "Save" ngay lập tức (không đợi), rồi restore viewpoint đó
   sau: camera restore ra kết quả cách xa trạng thái Fit đã ổn định (pixel-
   diff 32%, đo cả hai phía sau khi đợi 2s đầy đủ), và gần với vị trí *trước*
   khi bấm Fit hơn (cách baseline ISO trước-Fit chỉ 5.7%). Tức là: Save đọc
   `camera.position` đồng bộ tại thời điểm bấm, trước khi hiệu ứng bay của
   Fit kịp cập nhật camera — viewpoint lưu lại gần như đúng góc *cũ*. Xem
   BUG-11 bên dưới.
3. **Lưu sau khi đổi mode** — **KHÔNG tái hiện được.** Lưu ở Realistic → đổi
   sang Engineering → restore: về đúng Realistic, camera khớp tuyệt đối
   (diff 0%).
4. **Lưu ở bề rộng dưới 1280px** — **KHÔNG tái hiện được.** Ở 900px, lưu
   "Front" (pose `[14.4, 6.3, 64]`) → đổi sang ISO → restore: pose ra
   `[14.4235, 6.3172, 63.9841]`, target giống hệt, pixel-diff 4.4%. Lệch
   ~0.03 đơn vị — nhỏ, không xảy ra ở 1600px cùng thao tác — ghi lại như một
   quan sát, không phải lỗi. Không yêu cầu truy thêm.

---

## Lỗi mới tìm được (xếp theo mức độ)

Chạy trên `http://localhost:5173` (Playwright/CDP), Chromium 1600×900 trừ khi
ghi khác. Nghiệm bằng pixel-diff canvas có ngưỡng 10/kênh, luôn kèm control
không-thao-tác (~0%) và đợi camera ổn định trước khi đọc.

**Ghi chú phương pháp**: "camera có về đúng chỗ cũ không" phải được quyết
định bằng đọc pose (`camera.position` / `controls.target` / `camera.
quaternion`), không phải chỉ pixel-diff — pixel-diff một mình, trên một
page sống lâu qua nhiều thao tác, từng cho ra con số giả 27–44% (một lỗi
"BUG-10" đã được báo rồi rút lại: hai lần đo pose lại từ đầu, độc lập, đều
cho pose giống hệt nhau và pixel-diff 0.00% — nguyên nhân con số giả chưa
xác định được).

### BUG-11 — Lưu viewpoint trong lúc camera đang bay không lưu điểm đến (vừa, chờ quyết định sản phẩm)

Xem BUG-7 follow-up mục 2. Bấm "Fit model" rồi bấm "Save" ngay trong cùng
một thao tác (không đợi animation ~2s của Fit chạy xong): viewpoint lưu lại
gần với camera *trước khi* Fit chạy, không phải điểm Fit sẽ đưa tới.
`commitViewpoint` (trong `CameraRig`, đọc `camera.position` tại thời điểm
`viewpointSaveNonce` đổi) đọc đồng bộ, trong khi `flyTo` mới chỉ set `anim`
để interpolate ở `useFrame` các frame sau — hai luồng không đồng bộ với
nhau. Người dùng bấm Save ngay sau một nút camera (Fit, Reset, một shot,
Focus selected) trong vòng ~2s có thể lưu nhầm góc.

---

## Ghi chú vệ sinh

`AppBar.tsx` và `AppBar.module.css` (Help, Search — cả hai DEAD) đã xoá ở
commit `409c24b`. `grep -rn AppBar src` không còn ra gì.
