# Sync Timecode

Trang web hiển thị time-code lớn để **nhiều camera cùng quay vào một màn hình**, sau đó đồng bộ mốc bắt đầu của các video với độ lệch **dưới 1 frame** (< 33ms ở 30fps).

## Dùng nhanh

1. Mở trang (bản deploy trên Vercel) trên một màn hình ≥ 60Hz: laptop, tablet, TV hoặc điện thoại.
2. **Chọn task** trong màn hình chọn task hiện ra đầu tiên (xem [Chọn task](#chọn-task)). Chưa chọn thì không START được.
3. **Chạm/click vào màn hình một lần** (hoặc bấm phím bất kỳ). Trang sẽ vào toàn màn hình và giữ màn hình luôn sáng. Trình duyệt bắt buộc phải có một thao tác của người dùng mới cho phép hai việc này. Nếu thoát toàn màn hình, chạm lại một lần là trang vào lại. Dòng trạng thái hiện `● giữ sáng` khi màn hình đang được giữ sáng, và hiện `chạm để toàn màn hình` khi chưa ở chế độ toàn màn hình. iPhone không hỗ trợ toàn màn hình cho trang web.
4. **Bật quay cả 3 camera trước.**
5. Người làm quay đầu/người về phía màn hình sao cho **cả 3 camera cùng thấy rõ màn hình**, rồi **giữ 1 giây** để `START` task đầu tiên (xem [Đánh dấu task](#đánh-dấu-task-startstop)). Giữ tay trên **vùng số giờ to hoặc dải màu**, đừng che QR và thước quét.
6. **Nhìn màn hình thêm khoảng 2 giây** sau khi dải chuyển xanh, rồi mới bắt đầu làm task. Đoạn này vừa là mốc đồng bộ 3 camera, vừa là mốc bắt đầu task đầu tiên. Không cần một bước sync riêng.
7. Các task sau: giữ 1 giây để `STOP`/`START` và liếc camera về màn hình như bình thường. Mỗi lần liếc cũng là thêm một điểm đồng bộ.
8. Nhìn dòng trạng thái góc trên: nó phải hiện `60 Hz` (hoặc cao hơn) và **không chuyển đỏ** trong lúc camera đang nhìn màn hình. Màu đỏ nghĩa là trình duyệt vừa rớt frame; khi đó nên nhìn lại màn hình thêm vài giây.

> **Sync và START không lẫn nhau:** cùng một frame QR mang cả **time-code đang chạy** (`slotStartEpochMs` + vạch vàng, dùng để đồng bộ) lẫn **thời điểm bấm** (`eventMs`, dùng để cắt task). Đồng bộ luôn đọc time-code đang chạy, không dùng `eventMs`.

## Màn hình hiển thị gì

| Phần tử | Đổi khi nào | Dùng để |
|---|---|---|
| Dòng mã task (`V22` + tên) | Khi chọn task | Người và camera biết phiên này quay task nào |
| Dải tag `START`/`STOP` (xanh lá/đỏ) | Khi nhấn giữ 1 giây | Đánh dấu task bắt đầu/kết thúc |
| Số to `HH:MM:SS.d` | Mỗi 100ms (một *slot*) | Người đọc giờ của slot |
| Thước quét 0–99ms (vạch vàng) | Mỗi lần màn hình làm tươi | Đọc mili-giây trong slot |
| Dải 24 ô đen/trắng (mã Gray) | Mỗi slot | Máy đọc slot, chịu được frame bị nhòe |
| QR | Mỗi slot | Máy đọc thời gian tuyệt đối của slot, trạng thái tag và mã task |

Giờ hiển thị là giờ của máy đang mở trang, theo múi giờ của trình duyệt.

## Chọn task

Mỗi phiên quay làm **một task** (một "mã vòng" `V01`…`V76` trong kịch bản hiện trường, gồm 5 bước lặp nhiều lần). Phải chọn task trước khi `START`:

1. Mở trang lần đầu (hoặc sau `↺ Session mới`) thì màn hình **Chọn task** phủ toàn bộ, không có nút đóng. Gõ mã hoặc tên để lọc (không dấu cũng được, ví dụ `phong bi` ra `V22`), chạm một task để xem 5 bước (tên VI/EN, mô tả, đạo cụ, lưu ý wristcam), rồi chạm `Chọn V22`.
2. Mã và tên task hiện ngay trên dải START/STOP. Mã cỡ to để camera có thể đọc được cả khi QR quá nhỏ.
3. `Đổi task` ở dòng trên cùng mở lại màn hình chọn (lúc này có nút `Đóng`). Nút ẩn khi đang `START`: phải `STOP` trước rồi mới đổi task. Một video có thể chứa nhiều task nối tiếp: `STOP` → `Đổi task` → `START`.
4. `↺ Session mới` vừa đưa dải về `IDLE` vừa **xóa task** và mở lại màn hình chọn; task cũ được đánh dấu sẵn để chọn lại bằng một chạm.
5. Task đã chọn được lưu trên trình duyệt (`localStorage`) như tag, reload không mất.

Danh sách task nằm trong `src/tasks.json`, sinh bằng `python3 scripts/build_tasks.py` từ hai file trong `ref/` (`KichBan-HienTruong.csv` là nguồn chính; `[MICKY] Master.xlsx - 1. PLAN.csv` bổ sung các nhóm chưa có mã vòng, được gán mã `P01`…). Đầu danh sách có `OTHER` (`Khác - không có mã việc phù hợp`, không có bước) cho phiên quay không khớp task nào. Mã task chỉ dùng ký tự `0-9 A-Z -` và dài tối đa 8 ký tự để vừa QR. Mỗi task có `code`, `name`, `section`, `sources`, `variantOf` và 5 `steps` (`code` dạng `V22-3`, `order`, `nameVi`, `nameEn`, `description`, `props`, `wristcamNote`). Sửa CSV xong chạy lại script; `--check` báo lỗi khi JSON cũ.

**Vì sao chia hai lớp:** camera để auto-exposure trong nhà thường phơi sáng khoảng 1/30s, tức mỗi frame video "chụp dính" 2–3 lần đổi hình của màn hình. Phần thô (số, Gray, QR) đứng yên trong 100ms, nên mỗi slot luôn có frame sạch. Phần mịn là vạch vàng chạy liên tục: khi phơi sáng dài, vạch nhòe thành một vệt, và **tâm vệt chính là thời điểm giữa lúc phơi sáng** của frame đó.

## Đánh dấu task (START/STOP)

Trong một video có nhiều task liên tiếp (ví dụ rửa thực phẩm rồi nấu ăn), dùng dải tag ngay dưới dòng ngày giờ:

1. **Giữ 1 giây ở bất kỳ đâu** trên màn hình (hoặc giữ phím `Space`). Thanh sáng chạy ngang dải; thả tay trước 1 giây là huỷ.
2. Giữ đủ 1 giây là trạng thái **đổi ngay** (không cần thả tay), máy có hỗ trợ sẽ rung nhẹ: `IDLE`/`STOP` → **`START`** (dải xanh lá), `START` → **`STOP`** (dải đỏ).
3. Dải giữ nguyên trạng thái đến lần giữ tiếp theo, kèm giờ đã bấm, ví dụ `▶ START lúc 12:30:05.2`.
4. Sau khi bấm, người làm **liếc camera về màn hình** một lần. Không cần đúng lúc bấm: QR mang theo thời điểm bấm chính xác, nên liếc muộn vài giây vẫn đủ.

**Bắt đầu session quay mới:** chạm nút **`↺ Session mới`** ở góc trên bên phải, nút đổi thành `Chạm lần nữa để xác nhận`; chạm thêm lần nữa trong 3 giây thì dải về `IDLE`. Không chạm lần hai thì nút tự trở lại như cũ. Nút chỉ hiện khi dải không ở `IDLE`, và giữ trên nút không làm đổi START/STOP.

- Thời điểm START/STOP là lúc **bắt đầu giữ**, không phải lúc đủ 1 giây. Thời điểm về `IDLE` là lúc chạm xác nhận.
- Bấm nhầm thì giữ thêm lần nữa để quay lại; khi xử lý chỉ cần bỏ cặp START/STOP quá ngắn.
- Trạng thái được lưu trên trình duyệt đó, nên lỡ reload trang thì tag vẫn còn.

**Cách AI đọc:** từ mỗi frame đọc được QR, lấy `STATE`, `eventMs` và `TASK`. Mỗi cặp (`STATE`, `eventMs`) khác nhau là một sự kiện, và `eventMs` chính là mốc START/STOP theo đồng hồ của màn hình (cùng đồng hồ đã dùng để đồng bộ video). Không cần biết frame nào nhìn thấy tag đầu tiên. `IDLE` với `eventMs` khác 0 là mốc **bắt đầu session mới**; nếu trước đó đang `START` thì coi như task đó kết thúc tại mốc này. `TASK` của frame `START` cho biết đoạn đó thuộc task nào (tra `src/tasks.json` để lấy tên và 5 bước).

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

Frame dùng để đồng bộ thường là đoạn nhìn màn hình lúc `START` task đầu tiên. Các lần liếc màn hình sau đó (mỗi lần `STOP`/`START`) cho thêm điểm đồng bộ rải khắp video, giúp kiểm tra và bù nếu timestamp của file bị nhảy hoặc camera chạy lệch fps (ví dụ 29.97 thay vì 30).

### Mẹo quay
- Đặt màn hình **gần giữa khung hình** của mỗi camera. Cảm biến rolling shutter đọc ảnh từ trên xuống, nên đặt ở cùng độ cao trong khung giúp sai lệch giữa các camera như nhau.
- Màn hình càng chiếm nhiều khung hình càng dễ đọc. QR và dải Gray được thiết kế để đọc từ xa.
- Nếu camera cho chỉnh shutter, dùng ≤ 1/120s khi quay mốc: vạch vàng sẽ gọn thay vì nhòe.
- Độ trễ hiển thị của màn hình (khoảng 1–3 frame) là **như nhau với mọi camera**, nên không ảnh hưởng độ lệch giữa các video. Nó chỉ quan trọng nếu bạn cần khớp với giờ tuyệt đối của hệ thống khác.

## Spec cho máy đọc

### QR
- Payload: `TC4:<slotStartEpochMs>:<tzOffsetMin>:<STATE>:<eventMs>:<TASK>`, ví dụ `TC4:1792390619900:420:START:1792390618496:V22`.
  - `slotStartEpochMs`: Unix epoch (ms, UTC) của đầu slot, luôn là bội số của 100.
  - `tzOffsetMin`: độ lệch múi giờ của trình duyệt so với UTC, tính bằng phút, dương ở phía đông (UTC+07:00 = `420`).
  - `STATE`: `IDLE` (chưa đánh dấu lần nào), `START` hoặc `STOP`.
  - `eventMs`: Unix epoch (ms, UTC) lúc bắt đầu nhấn giữ để vào `STATE` hiện tại. Với `IDLE`: `0` nếu chưa từng đánh dấu trên trình duyệt này, khác `0` là lúc reset về session mới.
  - `TASK`: mã task đang chọn (`code` trong `src/tasks.json`, ví dụ `V22`, `P03`), hoặc `-` khi chưa chọn (chỉ gặp khi `IDLE`).
- Bản cũ `TC3:…` có 5 trường, không có `TASK`. Máy đọc nên nhận cả hai theo prefix.
- QR version 3 (29×29 module), mức sửa lỗi M, quiet zone 4 module, module đen trên nền trắng. Payload chỉ dùng ký tự alphanumeric của QR (`0-9 A-Z : -`); dài nhất 50 ký tự, dưới giới hạn 61 của v3-M.

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

Cấu hình (độ dài slot, số bit Gray, ngưỡng phát hiện frame rớt…) nằm trong `src/config.ts`. Danh sách task: `src/tasks.json`, sinh lại bằng `python3 scripts/build_tasks.py` (xem [Chọn task](#chọn-task)).

Deploy: Vercel tự build (`npm run build` → `dist/`) và deploy khi push lên `main`. Workflow `.github/workflows/ci.yml` chạy test và build cho mỗi lần push/PR, không deploy.
