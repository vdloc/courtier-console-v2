# Danh sách tính năng hiện có — và kết quả e2e

Liệt kê mọi thứ app đang *tỏ ra* là làm được, tính ở commit `5121aab`.
Mỗi dòng được bấm thật bằng Playwright, không suy luận từ code.

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
| A1 | Tên dự án | Lấy từ `projectName` trong store | **PASS** — "Northgate Plant Extension" từ store |
| A2 | Meta + revision | Hằng số từ `mockData` | **PASS** — STEEL FRAME · 4 × 3 BAYS · G+3 / REV C |
| A3 | Nút Help | | **DEAD** — Bấm: DOM không đổi, không dialog |
| A4 | Nút Search | | **DEAD** — Bấm: DOM không đổi, không dialog |
| A5 | Nút "Export view" | | **DEAD** — Bấm: DOM không đổi, không tải file |

## B. Model explorer (`ObjectTree`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| B1 | Cây render | Đếm số dòng khớp nhãn "N rows" | **PASS** — 103 rows |
| B2 | Ô lọc | Gõ chuỗi → chỉ còn dòng khớp, cộng tổ tiên của chúng | **PASS** — "Pipe" → 5 dòng, giữ đúng tổ tiên |
| B3 | Đóng/mở container | Bấm dòng có con thì gập/mở | **PASS** — Gập Level 01: 103 → 47 → 103 |
| B4 | Chọn component | Bấm dòng lá → Properties đổ đầy | **PASS** — Properties đổ đầy UC 254×254×89, 378.9 kg |
| B5 | Ẩn/hiện từng dòng | Nút con mắt → part biến mất khỏi viewport | **PASS** — Ẩn 1 dòng: 175 → 174, nhãn đổi Hide→Show |
| B6 | Isolate / Show all ở header | Link đổi theo `hidden.size` | **PASS** — Link đổi Isolate ↔ Show all |
| B7 | Cuộn tới dòng được chọn | Chọn từ viewport → dòng tự cuộn vào tầm nhìn | **PASS** — Chọn từ viewport, dòng cuộn vào tầm nhìn |
| B8 | Chấm trạng thái | Màu theo `status` | **PASS** — 2 màu thật: #1E8E3E, #E37400 |

## C. Structure layers (`Layers`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| C1 | Checkbox từng layer | Tắt → part thuộc layer đó biến mất | **PASS** — Tắt Foundation: 175 → 155, canvas đổi |
| C2 | Show all / Hide all | Bật tắt cả 6 layer | **PASS** — Hide all → 0, Show all → 175 |

## D. View controls (`ViewControls`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| D1 | 4 góc máy ảnh (Front/Side/ISO/Joint) | Camera nhảy vị trí | **PASS** — front/side/joint/iso ra 4 hash khác nhau |
| D2 | Fit model | | **DEAD** — Không handler; canvas hash không đổi |
| D3 | Focus selected | Disabled khi chưa chọn gì | **DEAD** — Không handler (disabled đúng khi chưa chọn) |
| D4 | Explode | Các part tách ra khỏi tâm | **PASS** — Hash đổi, bật tắt về đúng trạng thái cũ |
| D5 | Tour | | **FAKE** — Chỉ set state; canvas hash y hệt |
| D6 | Statistics | Hiện bảng số liệu chồng lên viewport | **PASS** — Bảng hiện, số liệu đúng — nhưng xem BUG-2 |
| D7 | Reset view | | **DEAD** — Không handler; canvas hash không đổi |
| D8 | 4 display mode | Chỉ `realistic` có tác dụng (ẩn kích thước) | **FAKE** — Chỉ Realistic có tác dụng. analysis/construction = engineering, hash trùng khít |
| D9 | Measure (bật/tắt) | Hiện chip "measuring" | **PASS** — Chip "measuring" hiện |
| D10 | Isolate | Ẩn mọi thứ trừ cái đang chọn | **PASS** — 1/175, hidden 174 |
| D11 | Show all | Hiện lại tất cả | **PASS** — Về 175/175 |
| D12 | Lưu viewpoint có tên | Thêm dòng vào danh sách | **PASS** — Thêm được dòng mới |
| D13 | Xoá viewpoint | Bớt dòng | **PASS** — Xoá được |
| D14 | Section: enable/axis/position/flip | §2.1 — đang sửa | **FAKE** — enable/axis/position/flip: 6 hash giống hệt nhau |

## E. Measure (`MeasurePanel`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| E1 | Start/stop measuring | | **PASS** — Nhãn đổi, chip hiện |
| E2 | 5 chế độ đo | Đổi chế độ thì xoá điểm đang có | **PASS** — Đổi chế độ xoá điểm — xem BUG-5 |
| E3 | Dòng gợi ý theo chế độ | | **PASS** — Đúng theo MODE_HINTS |
| E4 | Số đo hiển thị | | **FAKE** — Hardcode 7.200 m / 90.0° / 8.640 m² trong readout() |
| E5 | Danh sách điểm | | **PASS** — 2 điểm mock |
| E6 | Undo / Clear | Disabled khi không còn điểm | **PASS** — Disabled đúng khi hết điểm |
| E7 | Callout "cần thêm N điểm" | | **PASS**  |

## F. Properties (`PropertyPanel`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| F1 | Trạng thái rỗng | Chưa chọn gì thì có hướng dẫn | **PASS**  |
| F2 | Các nhóm trường | Identity / Classification / Geometry / Material | **PASS** — Đủ 4 nhóm |
| F3 | Điều hướng "Connected to" | Bấm id liên kết → chọn phần tử đó | **PASS** — Bấm Concrete_Pad_Foundation_C2 → chọn đúng |
| F4 | Chip trạng thái | Tone theo `status` | **PASS** — Installed → tone ok |

## G. Construction sequence (`Timeline`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| G1 | Slider tiến độ | Kéo → part hiện ra theo thứ tự thi công | **PASS** — progress 0 vs 1: canvas hash khác — xem BUG-2 |
| G2 | Play / Pause | | **FAKE** — Play 1.5s: 0.0s/18s không nhúc nhích; nút đổi thành Pause |
| G3 | Reset | Về 0 | **PASS**  |
| G4 | Mốc phase + phase đang chạy | | **PASS** — Phase đúng theo giây |
| G5 | Đồng hồ giây | | **PASS**  |

## H. Viewport (`Viewport` + `DiagramScene`)

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| H1 | Canvas vẽ được | | **PASS**  |
| H2 | Bấm vào part → chọn | Properties đổ đầy, dòng cây sáng lên | **PASS** — Bấm giữa canvas → Steel_Beam_Y_L01_C2 |
| H3 | Bấm chỗ trống → bỏ chọn | | **PASS** — Bấm góc trống → bỏ chọn |
| H4 | Chip overlay | mode, shot, measuring, section, exploded | **PASS**  |
| H5 | Bảng statistics | Parts drawn / total / hidden đếm đúng | **BUG** — Xem BUG-2: bỏ qua progress |
| H6 | Kích thước + nhãn KaTeX | 4 nhãn, không có chữ "Phi" trần | **PASS** — 4 nhãn KaTeX, Φ_p render đúng ký tự Φ |
| H7 | Orbit control | Kéo chuột xoay được | **PASS** — Kéo chuột: hash đổi — nhưng xem BUG-1 |

## I. Toàn cục

| # | Tính năng | Kỳ vọng | Kết quả |
|---|---|---|---|
| I1 | Route `?gallery` | Trang design system | **PASS** — Trang design system, không canvas |
| I2 | Không cuộn ngang ở 1280px | | **PASS** — 1600/1280/1100/900: không cuộn ngang |
| I3 | Zero console error | | **PASS** — 0 console error |
| I4 | Bàn phím | Dòng cây có `tabIndex`, Enter/Space chọn được | **PASS** — outline 2px #1B75EC trên dòng cây và nút |

---

## Lỗi tìm được (xếp theo mức độ)

Chạy ngày 2026-09-11 trên `http://localhost:5190`, Chromium 1600×900.
Phương pháp: hash pixel của canvas trước/sau mỗi thao tác — một điều khiển
"có hiệu lực" phải làm hash đổi. Ghi chú trung thực: nửa sau của lần chạy diễn
ra khi implementor đã bắt đầu sửa `DiagramScene.tsx` cho §2.1. BUG-1 đã được
chạy lại lần cuối trên cây làm việc lúc đó và vẫn tái hiện; các mục còn lại nằm
ngoài file họ đang sửa.

### BUG-1 — Không có đường quay lại góc nhìn cũ (nặng)

Xoay chuột xong thì không cách nào khôi phục. Bấm lại đúng góc đang active
(ISO khi `shot === 'iso'`) cho ra hash **y hệt** trạng thái sau khi xoay — không
xảy ra gì. `Reset view` và `Fit model` đều không có handler. Đường duy nhất là
bấm sang góc khác rồi bấm ngược lại.

    baseline   -75337bd2
    sau khi xoay  5951436
    bấm lại ISO   5951436   ← không đổi một byte

Nguyên nhân: `<PerspectiveCamera position={SHOT_POSITION[shot]}>` chỉ đổi prop
khi `shot` đổi giá trị; `setShot('iso')` khi đang là `'iso'` không tạo render
mới, còn `OrbitControls` thì giữ camera ở chỗ người dùng bỏ nó lại.

### BUG-2 — Bảng Statistics nói dối về số part đang vẽ (nặng)

`Viewport.tsx` đếm `PARTS.filter(layers && !hidden)` nhưng bỏ qua `progress`.
Kéo timeline về 0: bảng vẫn ghi **"Parts drawn 175"** trong khi canvas chỉ vẽ
móng (hash đổi rõ, chứng minh scene có đổi). Bảng duy nhất trong app tự nhận là
báo cáo sự thật lại mâu thuẫn với thứ đang nhìn thấy.

### BUG-3 — Ba nút khác nhau cùng chữ "Show all" (vừa)

| Ở đâu | Làm gì |
|---|---|
| Structure layers | bật lại 6 layer |
| Tools | xoá tập `hidden` |
| Model explorer (khi có gì bị ẩn) | xoá tập `hidden` |

Trong lần test đầu tôi tự bấm nhầm: sau `Hide all` (layer) rồi bấm "Show all"
của Tools, số vẫn là 0 — tưởng là lỗi. Người dùng sẽ nhầm y hệt.

### BUG-4 — Hai display mode hứa suông (vừa)

`Analysis — "Shaded by load path"` và `Construction — "Ghosted ahead of the
sequence"` cho hash **trùng khít** với `Engineering`. Chỉ `Realistic` có tác
dụng thật (ẩn kích thước). Dòng mô tả dưới mỗi nút đang mô tả thứ không tồn tại.

### BUG-5 — Điểm đo chỉ có thể giảm, không bao giờ tăng (vừa)

Không có đường nào thêm điểm. Đổi chế độ đo gọi `setMeasureMode` → xoá sạch
`measurePoints`. Nên chỉ cần đổi chế độ một lần là panel rỗng vĩnh viễn cho tới
khi F5. Cộng với BUG-6: số đo hiển thị là hằng số hardcode trong `readout()`.

### BUG-6 — Dưới 1280px thì không xem được Properties (vừa)

Media query ẩn cả cột phải. Bấm chọn một part vẫn chạy, nhưng không còn chỗ nào
hiển thị kết quả — chọn xong không thấy gì.

### BUG-7 — Viewpoint chỉ ghi, không đọc (nhẹ)

Lưu được, xoá được, nhưng bấm vào một viewpoint không khôi phục gì. Nó lưu
`mode` và cái tên, không lưu camera.

### BUG-8 — Lọc không khớp thì panel trắng trơn (nhẹ)

Gõ chuỗi không khớp: header ghi "0 rows", thân panel trống hoàn toàn, không một
dòng chữ nào. §5 của CHECKLIST cấm đúng chuyện này.

### BUG-9 — Núm chết (nhẹ)

`Tour`, `Fit model`, `Focus selected`, `Reset view`, `Help`, `Search`,
`Export view` — bấm không ra gì. `quality` và `hovered` được ghi vào store mà
không ai đọc.
