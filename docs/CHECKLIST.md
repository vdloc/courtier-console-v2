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
- [ ] `src/diagram/model.ts` vẫn là generator duy nhất — parts, component record và cây explorer đều dẫn xuất từ nó, nên id không thể lệch nhau

---

## 2. Những control đang nói dối

Mấy cái này đều render, nhận input, ghi vào store — và không đổi gì trong
viewport. Một control không làm gì còn tệ hơn là không có. Đây là phần ưu tiên.

### 2.1 Mặt cắt không cắt — ĐÃ XONG

- Hiện trạng: `sectionEnabled` / `sectionAxis` / `sectionPosition` / `sectionFlipped` nằm trong `viewSlice`. `ViewControls` điều khiển cả bốn. `Viewport` hiện chip "section". `DiagramScene` không hề đọc chúng.
- Phải: hình học bị clip thật, theo trục đã chọn, tại vị trí đã chọn, theo chiều đã chọn.
- Nghiệm thu: ảnh chụp ở ba vị trí slider trên cùng một trục cho ra ba lát cắt khác nhau; flip đảo nửa nào còn lại; tắt thì model trở lại nguyên vẹn. **Đã chạy — xem báo cáo trong commit message.**
- Ngoài phạm vi: bịt mặt cắt (cap), gizmo mặt cắt trong scene.

### 2.2 Đo đạc không pick được

- Hiện trạng: `measureSlice` giữ điểm mock từ `mockData`. `MeasurePanel` liệt kê chúng. Không cú click nào trong viewport sinh ra điểm.
- Phải: pick trong viewport thêm một điểm thật; loại snap và object id là thật; giá trị báo ra tính từ toạ độ đã pick.
- Đang chờ: ngữ nghĩa snap (vertex / edge / face / centre) phải được quyết trước khi code. Không đoán.
- Nghiệm thu: pick hai đỉnh có khoảng cách biết trước trong model sinh ra, và panel báo đúng khoảng cách đó.

### 2.3 Nút Play của timeline không chạy

- Hiện trạng: `play()` set `playback: 'playing'` và không có gì đẩy `progress`. Nút đổi nhãn; model đứng im.
- Phải: khi playing, `progress` chạy hết `duration` rồi dừng ở 1 với `playback: 'finished'`.
- Nghiệm thu: bấm Play, ghi nhận các part hiện ra đúng thứ tự phase mà không đụng vào slider.
- Lưu ý: vòng rAF thuộc về component, không thuộc slice — store không chứa timer.

### 2.4 `quality` được ghi, không ai đọc

- Phải: hoặc điều khiển một thứ thật (giới hạn DPR, antialias, ngân sách draw), hoặc xoá khỏi `viewSlice` và `ViewControls`. Cả hai đều chấp nhận được; núm chết thì không.

### 2.5 `hovered` được ghi, không ai đọc

- Phải: hover một dòng trong cây thì part sáng lên, và hover part thì dòng sáng lên — hoặc bỏ luôn field. Cùng luật với trên.

---

## 3. Dữ liệu phải nói thật

- [ ] `status` của component phải có ý nghĩa — hiện chỉ trang trí cho dòng, không điều khiển gì
- [ ] `connected[]` trong `PropertyPanel` đi tới được: click một id liên kết thì chọn đúng phần tử đó
- [ ] Quyết và ghi lại: model tiếp tục được sinh ra, hay nạp từ GLB. Sinh ra hiện là điểm mạnh — id nhất quán do cấu tạo — và bản GLB không được làm mất điều đó.

---

## 4. Design system, vẫn chưa chốt

- [ ] Nửa DERIVED của `tokens.css` chưa từng được so với ảnh tham chiếu. Neutral, semantic, và mọi màu chữ đều dựng lại theo thang tint, không phải đo được.
- [ ] Nghiệm thu: chụp `?gallery` ở 1846×922 đặt cạnh crop tham chiếu, và ghi phán quyết của user vào `tokens.css` — giá trị nào qua được thì nâng từ DERIVED lên APPROVED.
- [ ] Giá trị MEASURED là đã chốt. Đừng "cải thiện" chúng.

---

## 5. Độ bền chưa ai hỏi tới

- [ ] Không cuộn ngang ở 1280px. Dưới mức đó panel phải bị ẩn bởi media query; xác nhận không gãy thứ gì khác.
- [ ] Bàn phím: mọi control tới được và dùng được không cần chuột; focus nhìn thấy ở mọi nơi.
- [ ] Trạng thái rỗng và cực đoan: tắt hết layer, ẩn hết, `progress` bằng 0, filter không khớp gì. Không cái nào được throw hay render panel trắng mà không giải thích.
- [ ] Scene 175 part vẽ một `<mesh>` mỗi part. Đo chi phí frame trước khi cho là cần instancing — và đo lại trước khi tuyên bố instancing có tác dụng.

---

## 6. Vệ sinh repo

- [ ] Commit message mang phần lý do đã cố ý không để trong comment
- [ ] Không `dist/`, không file tạm, không dòng `.gitignore` trùng
- [ ] Có `README` nói cách chạy, luật token là gì, và những cái bẫy đã trả giá rồi
