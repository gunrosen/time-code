# Sync Timecode

Trang web hiển thị time-code lớn để **nhiều camera cùng quay vào một màn hình**, sau đó đồng bộ mốc bắt đầu của các video với độ lệch **dưới 1 frame** (< 33ms ở 30fps).

## Dùng nhanh

1. Mở trang (GitHub Pages) trên một màn hình ≥ 60Hz: laptop, tablet, TV hoặc điện thoại.
2. **Chạm/click vào màn hình một lần** (hoặc bấm phím bất kỳ). Trang sẽ vào toàn màn hình và giữ màn hình luôn sáng. Trình duyệt bắt buộc phải có một thao tác của người dùng mới cho phép hai việc này. Nếu thoát toàn màn hình, chạm lại một lần là trang vào lại. Dòng trạng thái hiện `● giữ sáng` khi màn hình đang được giữ sáng, và hiện `chạm để toàn màn hình` khi chưa ở chế độ toàn màn hình. iPhone không hỗ trợ toàn màn hình cho trang web.
3. Bắt đầu quay cả 3 camera, rồi chĩa từng camera (hoặc cả 3 cùng lúc) vào màn hình vài giây.
4. Nhìn dòng trạng thái góc trên: nó phải hiện `60 Hz` (hoặc cao hơn) và **không chuyển đỏ** trong lúc quay. Màu đỏ nghĩa là trình duyệt vừa rớt frame; khi đó nên quay lại đoạn mốc.

## Màn hình hiển thị gì

| Phần tử | Đổi khi nào | Dùng để |
|---|---|---|
| Dải tag `START`/`STOP` (xanh lá/đỏ) | Khi nhấn giữ 1 giây | Đánh dấu task bắt đầu/kết thúc |
| Số to `HH:MM:SS.d` | Mỗi 100ms (một *slot*) | Người đọc giờ của slot |
| Thước quét 0–99ms (vạch vàng) | Mỗi lần màn hình làm tươi | Đọc mili-giây trong slot |
| Dải 24 ô đen/trắng (mã Gray) | Mỗi slot | Máy đọc slot, chịu được frame bị nhòe |
| QR | Mỗi slot | Máy đọc thời gian tuyệt đối của slot và trạng thái tag |

Giờ hiển thị là giờ của máy đang mở trang, theo múi giờ của trình duyệt.

**Vì sao chia hai lớp:** camera để auto-exposure trong nhà thường phơi sáng khoảng 1/30s, tức mỗi frame video "chụp dính" 2–3 lần đổi hình của màn hình. Phần thô (số, Gray, QR) đứng yên trong 100ms, nên mỗi slot luôn có frame sạch. Phần mịn là vạch vàng chạy liên tục: khi phơi sáng dài, vạch nhòe thành một vệt, và **tâm vệt chính là thời điểm giữa lúc phơi sáng** của frame đó.

## Đánh dấu task (START/STOP)

Trong một video có nhiều task liên tiếp (ví dụ rửa thực phẩm rồi nấu ăn), dùng dải tag ngay dưới dòng ngày giờ:

1. **Nhấn giữ 1 giây ở bất kỳ đâu** trên màn hình (hoặc giữ phím `Space`). Thanh sáng chạy ngang dải cho biết đang giữ; thả tay sớm là huỷ.
2. Giữ đủ 1 giây thì trạng thái đổi: `IDLE`/`STOP` → **`START`** (dải xanh lá), `START` → **`STOP`** (dải đỏ). Máy có hỗ trợ sẽ rung nhẹ.
3. Dải giữ nguyên trạng thái đến lần nhấn giữ tiếp theo, kèm giờ đã bấm, ví dụ `▶ START · từ 12:30:05.2`.
4. Sau khi bấm, người làm **liếc camera về màn hình** một lần. Không cần đúng lúc bấm: QR mang theo thời điểm bấm chính xác, nên liếc muộn vài giây vẫn đủ.

- Thời điểm ghi lại là lúc **bắt đầu nhấn giữ**, không phải lúc giữ đủ 1 giây.
- Bấm nhầm thì nhấn giữ thêm lần nữa để quay lại; khi xử lý chỉ cần bỏ cặp START/STOP quá ngắn.
- Trạng thái được lưu trên trình duyệt đó, nên lỡ reload trang thì tag vẫn còn.

**Cách AI đọc:** từ mỗi frame đọc được QR, lấy `STATE` và `eventMs`. Mỗi cặp (`STATE`, `eventMs`) khác nhau là một sự kiện, và `eventMs` chính là mốc START/STOP theo đồng hồ của màn hình (cùng đồng hồ đã dùng để đồng bộ video). Không cần biết frame nào nhìn thấy tag đầu tiên.

## Quy trình đồng bộ

Làm cho từng video:

1. Tìm một frame `f` mà ở đó số to / QR / dải Gray **rõ ràng**, không bị chồng hai giá trị.
2. Đọc thời gian bắt đầu slot `T_slot` từ QR, hoặc từ số to, hoặc từ dải Gray.
3. Đọc `phase` = vị trí **tâm vạch hoặc vệt vàng** trên thước, đơn vị ms (0–99).
4. Lấy presentation timestamp của frame `f`:
   ```bash
   ffprobe -v error -select_streams v:0 -show_entries frame=pts_time -of csv=p=0 video.mp4 | sed -n "$((f+1))p"
   ```
   Camera điện thoại thường ghi video **frame rate thay đổi (VFR)**, nên đừng dùng `f / 30` trừ khi chắc chắn video là CFR.
5. Tính:
   ```
   T_frame      = T_slot + phase
   start_video  = T_frame − pts(f)
   ```

Độ lệch giữa hai video là hiệu `start_video` của chúng. Nên đọc 3–5 frame ở các slot khác nhau rồi lấy trung vị để giảm sai số.

### Mẹo quay
- Đặt màn hình **gần giữa khung hình** của mỗi camera. Cảm biến rolling shutter đọc ảnh từ trên xuống, nên đặt ở cùng độ cao trong khung giúp sai lệch giữa các camera như nhau.
- Màn hình càng chiếm nhiều khung hình càng dễ đọc. QR và dải Gray được thiết kế để đọc từ xa.
- Nếu camera cho chỉnh shutter, dùng ≤ 1/120s khi quay mốc: vạch vàng sẽ gọn thay vì nhòe.
- Độ trễ hiển thị của màn hình (khoảng 1–3 frame) là **như nhau với mọi camera**, nên không ảnh hưởng độ lệch giữa các video. Nó chỉ quan trọng nếu bạn cần khớp với giờ tuyệt đối của hệ thống khác.

## Spec cho máy đọc

### QR
- Payload: `TC3:<slotStartEpochMs>:<tzOffsetMin>:<STATE>:<eventMs>`, ví dụ `TC3:1792390619900:420:START:1792390618496`.
  - `slotStartEpochMs`: Unix epoch (ms, UTC) của đầu slot, luôn là bội số của 100.
  - `tzOffsetMin`: độ lệch múi giờ của trình duyệt so với UTC, tính bằng phút, dương ở phía đông (UTC+07:00 = `420`).
  - `STATE`: `IDLE` (chưa đánh dấu lần nào), `START` hoặc `STOP`.
  - `eventMs`: Unix epoch (ms, UTC) lúc bắt đầu nhấn giữ để vào `STATE` hiện tại; bằng `0` khi `IDLE`.
- QR version 3 (29×29 module), mức sửa lỗi M, quiet zone 4 module, module đen trên nền trắng. Payload chỉ dùng ký tự alphanumeric của QR (`0-9 A-Z : -`).

### Dải mã Gray (24 ô)
```
[trắng][đen] b19 b18 … b0 [đen][trắng]
```
- 2 ô đầu và 2 ô cuối là ô tham chiếu: dùng để lấy ngưỡng sáng/tối và xác định chiều đọc.
- `b19..b0` là `gray(slotOfDay)`, MSB trước, ô trắng = 1. `slotOfDay = floor(ms_từ_nửa_đêm_local / 100)`, nằm trong khoảng 0…863 999.
- Giải mã: `n = g; for (s = g >> 1; s; s >>= 1) n ^= s;`, rồi `ms_từ_nửa_đêm_local = n × 100`.
- Màn hình hẹp (dọc) thì dải chia **2 hàng × 12 ô**, đọc từ trái sang phải, hàng trên trước.
- Nếu frame nằm vắt qua hai slot, chỉ đúng **1 ô** ra màu xám. Thử cả hai giá trị 0/1 cho ô đó, hoặc chọn frame khác.

### Thước quét
- Chiều ngang của thước tương ứng 0 → 100ms của slot hiện tại. Vạch chia lớn mỗi 10ms (có nhãn), vạch nhỏ mỗi 5ms.
- Vạch vàng (`#ffd400`) có tâm tại `phase = epochMs mod 100`. Với frame bị nhòe, lấy **trọng tâm độ sáng** của vệt vàng dọc theo trục ngang.
- `phase` đọc trên thước được cộng vào **slot đang hiện** trên số/QR/Gray trong cùng frame. Nếu vệt vàng bị cắt ở hai đầu thước (vắt qua ranh giới slot), hãy chọn frame khác.

## Phát triển

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build    # tsc + vite build → dist/
```

Cấu hình (độ dài slot, số bit Gray, ngưỡng phát hiện frame rớt…) nằm trong `src/config.ts`.

Deploy: push lên `main`, workflow `.github/workflows/deploy.yml` sẽ test, build và đăng lên GitHub Pages. Lần đầu cần vào **Settings → Pages → Build and deployment → Source: GitHub Actions**.
