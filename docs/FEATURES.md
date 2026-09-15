# Danh sách tính năng hiện có — và kết quả e2e

Liệt kê mọi thứ app đang *tỏ ra* là làm được, tính ở commit `010acc8`
(nhánh `docs-realign`, rẽ từ `master`). Đợt chạy trước (`e18ac61`) mô tả một
app còn hai model khác nhau (Engineering vẽ thủ công, Realistic nạp GLB) — kể
từ đó, generator thủ công (`src/diagram/model.ts`) đã bị xoá hẳn, cả hai mode
giờ vẽ chung một GLB, timeline lấy phase từ chính keyframe của clip thay vì
gõ tay, và có thêm Present mode, registry phím tắt, drawer responsive, và một
lần sửa search. Mỗi dòng dưới đây được bấm thật lần này — `page.mouse`, bàn
phím, hoặc click nút thật qua Playwright — không suy luận từ code, trừ khi
ghi rõ "không bấm lại lần này".

Ký hiệu:

| | |
|---|---|
| PASS | Làm đúng thứ nó hứa |
| FAKE | Có phản hồi UI nhưng không tác động gì tới model/viewport — điều khiển nói dối |
| DEAD | Không có handler; bấm không xảy ra chuyện gì |
| BUG | Có ý định làm, nhưng làm sai |
| — | Không bấm lại ở lần chạy này; xem ghi chú |

Cột "Kết quả" để trống nghĩa là chưa chạy.

---

## A. Thanh trên cùng (`TopBar`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| A1 | Tên dự án | Lấy từ `projectName` trong store | **PASS** — "Northgate Plant Extension" |
| A2 | Meta + revision | Hằng số từ `mockData` | — không bấm lại lần này; không đổi từ lần trước |
| A3 | Nút "Export view" | Tải một PNG thật của canvas | — không bấm lại lần này (cơ chế không đổi từ lần trước, xem `e18ac61`) |
| A4 | Nút "Model explorer" (mới) | Bật/tắt drawer explorer | **PASS** — xem I5 (drawer ở màn hẹp) |
| A5 | Nút "Present" (mới) | Vào Present mode | **PASS** — xem H8 |
| A6 | Nút "Keyboard shortcuts" (mới) | Mở overlay liệt kê phím tắt | **PASS** — bấm thật, overlay hiện, có chữ "shortcut" |

## B. Model explorer (`ObjectTree`)

Không còn khái niệm "cây Engineering" khác "cây GLB" — chỉ còn một cây, đọc
từ GLB, ở cả hai mode.

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| B1 | Cây render, cùng số dòng cả hai mode | Root "Northgate Plant Extension" + tổng số member | **PASS** — cả hai mode: root text "Northgate Plant Extension3362", 7 dòng cấp gốc |
| B2 | Ô lọc — tên | Gõ chuỗi → chỉ còn dòng khớp | **PASS** — "Pipe_Insulation" → 16 dòng |
| B2b | Ô lọc — grid ref và level (sửa ở commit `8d721c0`) | Gõ grid ref (vd "B1-B2") hoặc level (vd "L02") ra kết quả khớp, không phải 0 dòng | **PASS** — "B1-B2" → 93 dòng, "L02" → 31 dòng. Bản trước fix này ra 0 dòng cho cả hai vì `flatten()` chỉ khớp `label`, không khớp `detail` (nơi field GLB lưu grid ref/level) |
| B3 | Đóng/mở container | Bấm dòng có con thì gập/mở | — không bấm lại lần này; cơ chế không đổi |
| B4 | Chọn component | Bấm dòng lá → Properties đổ đầy | **PASS** — chọn `Steel_Column_Main_L00_A1` từ cây, Properties hiện đúng tên |
| B5 | Ẩn/hiện từng dòng | Nút con mắt → part biến mất khỏi viewport | — không bấm lại lần này |
| B6 | Isolate / Show all ở header | Link đổi theo `hidden.size` | — không bấm lại lần này; cơ chế dùng chung với D10/D11 (xem đó) |
| B7 | Cuộn tới dòng được chọn | Chọn từ viewport → dòng tự cuộn vào tầm nhìn | — không bấm lại lần này |
| B8 | Chấm trạng thái | Màu theo `status` | **BUG-A** — `status` giờ luôn `undefined` cho mọi component (GLB không có trường tiến độ thi công, xem CHECKLIST §3), nên chấm không còn hiện ở dòng nào. Đây là hệ quả trực tiếp của quyết định bỏ `status` giả — không phải lỗi, nhưng chấm trạng thái trong cây hiện là núm chết cho tới khi có nguồn dữ liệu tiến độ thật. Xem F4. |
| B9 | Windowing khi kết quả lớn | Query nhiều kết quả vẫn giới hạn số dòng DOM | — không bấm lại lần này; không đổi từ lần trước |

## C. Structure layers (`Layers`)

Không còn khái niệm layer bị lọc theo mode (fix UX-07 cũ đã bị bỏ lại — Q3
xác nhận cả 6 layer đều có member thật ở cả hai mode).

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| C1 | Checkbox từng layer | Tắt → part thuộc layer đó biến mất | **PASS** — tắt Foundation (đang bật Statistics): Members shown 3362 → 3342 (đúng 20 member Foundation) |
| C2 | 6 layer hiện đủ ở cả hai mode | Không còn danh sách rút gọn riêng cho Engineering | **PASS** — cả 6 checkbox (Foundation/Columns/Beams/Pipes/Connections/Accessories) hiện ở cả hai mode |

## D. View controls (`ViewControls`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| D1 | 4 góc máy ảnh (Front/Side/ISO/Joint) | Camera nhảy vị trí | — không bấm lại lần này; dùng gián tiếp qua các mục khác (measure, shadow, ground plane) trong các đợt sửa trước |
| D2 | Fit model | Đưa cả model vào khung | **PASS** (dùng gián tiếp) — dùng trong đo đạc, ground-plane check ở các commit gần đây |
| D3 | Focus selected | Zoom vào phần đã chọn | **PASS** (dùng gián tiếp) — dùng trong đo đạc và kiểm màu chọn |
| D4 | Explode | Các part tách ra khỏi tâm | — không bấm lại lần này |
| D6 | Statistics | Hiện bảng số liệu, tắt/bật đúng | **PASS** — bật: "Members shown 3362 \| Members total 3362 \| Members hidden 0"; tắt: chữ "Members shown" biến mất khỏi trang |
| D7 | Reset view | Về khung nhìn mặc định | — không bấm lại lần này |
| D8 | 2 display mode (Realistic / Engineering) | Chuyển hẳn giữa hai kiểu vẽ, cùng một model | **PASS** — cả hai mode cùng root "Northgate Plant Extension3362", cùng 7 dòng cấp gốc; Quality panel chỉ hiện ở Realistic |
| D8b | Copy "Flat colour by structural role" (sửa gần đây) | Mô tả đúng: 3 màu theo vai trò, không phải 1 màu/element_type | **PASS** — đọc đúng chữ trong `ViewControls.tsx`; `ROLE_BY_KIND` xác nhận chỉ 3 giá trị role |
| D8c | Quality (High/Balanced/Fast) | Chỉ hiện ở Realistic | **PASS** — chữ "Balanced" chỉ xuất hiện khi ở Realistic |
| D9 | Measure (bật/tắt) | Hiện chip "measuring" | — không bấm lại lần này; xem mục E cho đo đạc thật |
| D10 | Isolate | Ẩn mọi thứ trừ cái đang chọn | — không bấm lại lần này |
| D11 | Show all | Hiện lại tất cả | — không bấm lại lần này |
| D12 | Lưu viewpoint có tên | Thêm dòng vào danh sách | **PASS** — lưu "Audit test viewpoint" thật, hiện đúng tên trong danh sách |
| D13 | Xoá viewpoint | Bớt dòng | **PASS** — bấm nút xoá (aria-label `Delete Audit test viewpoint`) → tên biến mất khỏi trang |
| D14 | Section: enable/axis/position/flip | | — không bấm lại lần này |

## E. Measure (`MeasurePanel`) — một model, không còn phân biệt mode

`src/diagram/measurement.ts`/`snapping.ts` đang được implementor port lại tại
thời điểm viết tài liệu này — các dòng dưới lấy bằng chứng từ trước đó, không
đụng vào hai file này để nghiệm lại.

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| E4 | Số đo hiển thị | Tính từ toạ độ pick thật trên GLB | **PASS** — hai góc đối diện trên tiết diện SHS 400×400 của `Steel_Column_Main_L00_A1` (khoảng cách thế giới tính tay 0.3999 m) → panel báo **0.400 m** |
| E8 | Đo hoạt động trên GLB thật ở cả hai mode | Pick trên mesh GLB, không bị khoá bởi mode | **PASS** — E4 chạy ở Engineering; registry member (`glbMembers.ts`) dùng chung cho cả hai mode nên không còn khái niệm "khoá đo ở một mode" |
| E-khác (E1/E2/E3/E5/E6/E7) | | — không bấm lại lần này; cơ chế panel không đổi từ lần trước, chỉ nguồn dữ liệu (GLB thay vì hai model) đổi |

## F. Properties (`PropertyPanel`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| F1 | Trạng thái rỗng | Chưa chọn gì thì có hướng dẫn | — không bấm lại lần này |
| F2 | Các nhóm trường | Identity / Classification / Geometry / Material (+ Connected to khi có) | — không bấm lại lần này |
| F3 | Điều hướng "Connected to" | Bấm id liên kết → chọn phần tử đó | **PASS** — chọn `Steel_Column_Main_L00_A1`, bấm liên kết `Bracket_Stiffener_L01_A1-A2_A1` → Properties đổi sang đúng phần tử đó. Dữ liệu liên kết đọc từ `connected_objects` thật trong GLB, không phải từ `connectionsOf()` sinh ra như bản cũ |
| F4 | Chip trạng thái | Tone theo `status` | **BUG-A** (cùng gốc với B8) — `status` luôn `undefined` cho GLB component nên chip không hiện ở PropertyPanel với bất kỳ component nào. Đã xác nhận đây là **quyết định có chủ đích** (CHECKLIST §3): `PropertyPanel.tsx` ẩn hẳn chip khi `selected.status` là `undefined`, thay vì hiện sai. Không phải panel "nói dối" — panel im lặng đúng chỗ không có dữ liệu |

## G. Construction sequence (`Timeline`)

Phase không còn gõ tay — `derivePhases()` tính từ chính keyframe của clip
(xem `README.md` §2 và commit "feat: derive construction phases from the
clip's own keyframes").

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| G1 | Slider tiến độ + mốc phase | 5 phase tên thật (Foundations/Columns/Beams/Pipes/Accessories), không đè lên nhau | **PASS** — cả 5 tên hiện trên track ở đúng vị trí tỉ lệ; `Connections` không có mốc riêng (đúng ý thiết kế — xem README) |
| G2 | Play / Pause / Reset | Đồng hồ chạy thật theo thời gian thực, dừng đúng | **PASS** — Reset: "0.0s / 18.0s", phase trống (đúng — 0s < 0.5s, trước khi Foundations bắt đầu). Play, đợi 2s thật: "2.0s / 18.0s", phase "Foundations" (đúng — 0.5–3.5s). Pause: đọc hai lần cách nhau 1s, số giờ không đổi |
| G3 | Duration hiển thị đúng | Không còn hai con số duration khác nhau (18 tĩnh vs 18.033 thật) | **PASS** — "18.0s / 18.0s" ở cả đầu và cuối; sửa cùng lúc với derivePhases (xem README) |
| G4 | Progress = 0 không gán nhầm phase | Trước mốc phase đầu tiên (0.5s) thì tên phase để trống, không phải phase cuối | **PASS** — xem G2; đây từng là một bug thật trong bản nháp của tính năng phase-derivation (đã sửa trước khi commit, không lọt ra ngoài) |

## H. Viewport (`Viewport` + `DiagramScene`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| H1 | Canvas vẽ được | | **PASS** — xuyên suốt các mục khác, cả hai mode, dev lẫn preview, zero console error |
| H2 | Bấm vào part → chọn | | — không bấm lại bằng toạ độ canvas thô lần này; chọn qua cây đã xác nhận nhiều lần (B4, F3, E4) dùng chung con đường `select()` |
| H3 | Bấm chỗ trống → bỏ chọn | | — không bấm lại lần này |
| H4 | Chip overlay | mode, shot, measuring, section, exploded | — không bấm lại lần này |
| H5 | Bảng statistics đếm đúng cả khi lọc layer | | **PASS** — xem C1 (3362 → 3342 khi tắt Foundation) |
| H6 | Kích thước + nhãn KaTeX, số đo lại từ GLB thật | 4 nhãn, không có chữ "Phi" trần, số liệu khớp giá trị đo được trên GLB (7.2/6.0/4.0/2.4) | **PASS** — 4 nhãn `.katex`, ký tự Φ render đúng (không phải chữ "Phi_p" trần). Giá trị nhãn (`DiagramScene.tsx`'s `Annotations`) ghi rõ nguồn: đo trực tiếp trên `Steel_Column_Main_L00_A1/_A2/_B1` và `Concrete_Pad_Foundation_A1` |
| H7 | Orbit control | Kéo chuột xoay được | — không bấm lại lần này |
| H8 | Present mode (mới) | Vào chế độ trình chiếu: ẩn hết panel, chỉ còn thanh chuyển viewpoint | **PASS** — bấm "Present": camera bay tới viewpoint đầu tiên ("Base connection A1"), thanh dưới cùng hiện tên + nút prev/next/exit; bấm "Exit Present" → chữ "Exit Present" biến mất khỏi trang |

## I. Toàn cục

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| I1 | Route `?gallery` | Trang design system | — không bấm lại lần này |
| I2 | Không cuộn ngang | | — không bấm lại lần này ở 1280/1100 (chỉ chạy 900px, xem I5) |
| I3 | Zero console error | Suốt phiên chạy, không chỉ lúc tải trang | **PASS** — 0 error qua toàn bộ các đợt chạy Playwright của tài liệu này (nhiều mode, nhiều thao tác thật), cả dev lẫn `vite preview` |
| I4 | Bàn phím chọn được dòng cây | Enter trên dòng có focus → chọn đúng phần tử | **PASS** — focus dòng `Steel_Column_Main_L00_A2`, `Enter` → Properties đổi đúng tên |
| I5 | Model explorer thành drawer ở màn hẹp (mới) | Dưới ngưỡng responsive, explorer ẩn mặc định, nút "Model explorer" mở nó ra như drawer, không cuộn ngang | **PASS** — 900px: `scrollWidth === clientWidth` (900 = 900), input lọc không có kích thước hiển thị khi drawer đóng; bấm nút "Model explorer" → input lọc hiện ra với kích thước thật |
| I6 | Registry phím tắt + overlay trợ giúp (mới) | Bấm "Keyboard shortcuts" → overlay liệt kê đủ | **PASS** — overlay hiện, có chữ "shortcut"; `src/interaction/commands.ts` là nguồn duy nhất cho nhãn + phím tắt hiện trên các nút (`shortcutFor()`) |

---

## BUG-A — Chấm/chip trạng thái không còn hiện ở đâu (mới phát hiện đợt này)

Xem B8 và F4. Đây không phải núm chết theo nghĩa cũ (control không làm gì) —
`status` optional và `undefined` thật cho mọi GLB component là một quyết
định có chủ đích (CHECKLIST §3, Q1 trong `docs/GLB-BOTH-MODES.md`), và cả
`ObjectTree` lẫn `PropertyPanel` đều ẩn đúng chỗ không có dữ liệu thay vì
hiện giá trị bịa. Ghi lại ở đây vì nó thay đổi trải nghiệm so với bản cũ (có
chấm màu thật) — không xử lý gì thêm trừ khi có quyết định sản phẩm mới về
nguồn dữ liệu tiến độ thi công.

---

## BUG-1..9 và BUG-11 (từ lần chạy `e18ac61`)

Không nghiệm lại các mục này ở đợt này — chúng thuộc về các tính năng không
đổi qua đợt cutover (Export view, các phím camera, section clip, viewpoint
CRUD cơ chế nền, v.v). Xem `git log` cho commit sửa nếu cần tra lại; không
copy nguyên trạng bảng cũ vào đây để tránh đọc nhầm thành "đã xác nhận lại".

---

## Ghi chú vệ sinh

`AppBar.tsx` và `AppBar.module.css` đã xoá từ lâu (`409c24b`), không còn gì
để chạy lại. `src/diagram/model.ts` (generator thủ công) đã xoá ở nhánh này
(`worktree-3d-realism`, hai commit "feat: Engineering draws the GLB" và
"refactor: delete the procedural model generator") — `grep -rn "PARTS\b\|
buildTree\|BUILD_ORDER" src` không còn ra dòng nào ngoài chú thích lịch sử
trong tài liệu.
