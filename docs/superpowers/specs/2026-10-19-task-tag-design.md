# Tag START/STOP task trên màn hình time-code

## Context
Mỗi video có nhiều task liên tiếp, ví dụ rửa thực phẩm rồi nấu ăn. Cần một tag hiện trên màn hình time-code để camera quét vào, sau đó AI biết task **START** hay **STOP** ở thời điểm nào.

**Đã chốt với user:**
- 3 camera **đeo trên người** làm (góc nhìn thứ nhất), nên chỉ thấy màn hình khi người làm quay sang nhìn.
- Người bấm có thể là người điều phối hoặc chính người làm, vì vậy thao tác phải thật đơn giản.
- Chọn **phương án A**: tag hiện trên màn hình. **Không** làm log hay xuất file.
- Tag chỉ có **START / STOP**, không đánh số và không đặt tên task.
- Chuyển trạng thái bằng cách **nhấn giữ khoảng 1 giây** ở bất kỳ đâu trên màn hình. Thả tay sớm là huỷ.
- Tag **hiện liên tục cho đến lần bấm sau**. QR ghi kèm **thời điểm bấm** chính xác, nên camera liếc nhìn muộn vài giây vẫn biết task bắt đầu lúc nào.

**Non-goals:** không lưu log, không có backend, không quản lý tên hay số thứ tự task, không nhận dạng giọng nói.

## Thiết kế

### Trạng thái
- Có 3 trạng thái: `IDLE` (chưa bấm lần nào) → `START` → `STOP` → `START` → …
- Mỗi lần giữ đủ 1 giây sẽ chuyển trạng thái (`IDLE`/`STOP` → `START`, `START` → `STOP`), kèm `eventMs` là thời điểm bấm.
- **`eventMs` = lúc bắt đầu nhấn giữ** (`clock.epochAt(e.timeStamp)` của `pointerdown`), vì đó mới là ý định thật của người bấm. Không lấy lúc giữ đủ 1 giây. *(lựa chọn của Claude)*
- Bấm nhầm thì nhấn giữ thêm một lần nữa để quay lại trạng thái trước. Không làm chức năng undo riêng.
- Lưu `{state, eventMs}` vào `localStorage` để lỡ reload trang thì tag không bị mất. Mọi lần đọc/ghi đều bọc `try/catch`. *(lựa chọn của Claude)*

### Dải tag (khối mới, nằm giữa dòng ngày giờ ① và số to ③)
- Dải ngang full-width, luôn chiếm chỗ cố định để bố cục không nhảy khi đổi trạng thái:
  - `IDLE`: nền xám tối, chữ `Nhấn giữ 1 giây để START`.
  - `START`: nền **xanh lá**, chữ đen `▶ START · từ 12:30:05.2`.
  - `STOP`: nền **đỏ**, chữ trắng `■ STOP · từ 12:41:10.0`.
- Giờ trong dải là giờ local của `eventMs`, định dạng giống số to (đến 0.1 giây).
- **Phản hồi khi đang giữ:** một thanh tiến trình chạy dọc dải từ trái sang phải trong 1 giây. Thả tay sớm thì thanh reset. Giữ đủ thì đổi trạng thái và rung nhẹ (`navigator.vibrate`) nếu thiết bị hỗ trợ.
- Số to ③ thu nhỏ một chút để nhường chỗ cho dải. Kiểm tra lại bằng screenshot ở cả 3 kích thước để không bị cuộn hay tràn.

### Nhấn giữ
- Dùng `pointerdown` để bắt đầu đếm, `pointerup`/`pointercancel`/`pointerleave` để huỷ. Thời gian giữ là `HOLD_MS = 1000` trong `config.ts`.
- Trên bàn phím: giữ **phím Space** 1 giây cũng có tác dụng tương tự (bỏ qua sự kiện `repeat`).
- Chặn menu chạm-giữ và bôi đen chữ trên mobile: `user-select: none`, `-webkit-touch-callout: none`, `touch-action: none` trên `#app`, và `preventDefault` cho `contextmenu`.
- Việc vào toàn màn hình khi chạm hiện có (`click` → `requestFullscreen`) vẫn giữ nguyên. Nhấn giữ rồi thả cũng tính là một lần chạm, nên tiện thể vào toàn màn hình luôn.

### QR (đổi định dạng payload)
- Payload mới: `TC3:<slotStartMs>:<tzOffsetMin>:<STATE>:<eventMs>`.
  - `STATE` ∈ `IDLE` | `START` | `STOP`. Khi `IDLE` thì `eventMs = 0`.
  - Dùng dấu `:` thay cho `;` để QR mã hóa ở **chế độ alphanumeric** (chế độ này có `0-9 A-Z :` và `-`, nhưng không có `;`). Như vậy vừa với **version 3** (29×29 module). Payload dài nhất là 42 ký tự, trong khi giới hạn của v3-M alphanumeric là 61.
- `QR_PREFIX = 'TC3'`, `QR_VERSION = 3`.
- Module QR sẽ nhỏ hơn khoảng 15% so với v2. Phải kiểm tra lại khả năng decode ở độ phân giải thấp (xem phần Verification).
- Số to ③, thước ④ và dải Gray ⑤ giữ nguyên.

## File cần sửa
| File | Thay đổi |
|---|---|
| `src/config.ts` | `HOLD_MS`, `QR_PREFIX='TC3'`, `QR_VERSION=3`, key `localStorage` |
| `src/tag.ts` (mới) | Kiểu `TagState`, `nextTag(current, eventMs)`, `loadTag()` / `saveTag()`, `formatTagLabel(tag, offsetOf)` (dùng lại `toSnapshot` + `formatTime` trong `src/clock.ts`) |
| `src/hold.ts` (mới) | `setupHold(onProgress, onComplete)`: pointer và Space, trả về tiến trình 0..1 để vẽ thanh |
| `src/qr.ts` | `buildPayload(slotStartMs, tzOffsetMin, tag)` theo định dạng TC3 |
| `src/main.ts` | Tạo state tag, render dải (chỉ khi state hoặc tiến trình đổi), truyền `tag` vào `buildPayload`, đánh dấu `coarseDirty` khi đổi trạng thái để QR vẽ lại ngay |
| `index.html` | Thêm `<div id="tag">` với phần chữ và thanh tiến trình |
| `src/style.css` | Grid thêm hàng `tag` (cả bố cục ngang lẫn dọc), màu `--start`/`--stop`/`--idle`, chỉnh cỡ số to, các thuộc tính chặn chạm-giữ |
| `src/tag.test.ts`, `src/qr.test.ts` | Test chuyển trạng thái, định dạng payload TC3, payload dài nhất vừa v3, nhãn giờ local |
| `README.md` | Thêm mục "Đánh dấu task": cách nhấn giữ, ý nghĩa màu, spec QR TC3 mới (thay TC2) và cách AI suy ra mốc task từ `eventMs` |

## Verification
- `npm test`: chuyển `IDLE → START → STOP → START`; payload `TC3:…:START:…` đúng định dạng; payload dài nhất (tz `-720`) tạo được QR v3; `formatTagLabel` đúng múi giờ.
- `npm run build` không lỗi TypeScript.
- Playwright ở 390×844, 844×390 và 1440×900:
  - Screenshot các trạng thái `IDLE` / `START` / `STOP`: dải đúng màu, không cuộn, số to không tràn.
  - Mô phỏng nhấn giữ bằng `mouse.down`, chờ 1.1 giây, `mouse.up` → đổi trạng thái. Nhấn 0.4 giây rồi thả → **không** đổi.
  - Reload trang → trạng thái vẫn còn.
- Decode QR bằng `jsQR` từ canvas → payload khớp state và `eventMs`. Thu nhỏ QR xuống khoảng 85px (bằng cỡ QR trong video thử 480p) rồi decode lại để chắc v3 vẫn đọc được.
- Không push khi chưa hỏi user.

## Bổ sung: nút "Session mới" (về IDLE)
- Cử chỉ chính chỉ làm một việc: giữ đủ 1 giây ở bất kỳ đâu → đổi START ↔ STOP ngay (không chờ thả tay).
- Về `IDLE` bằng nút riêng `↺ Session mới` ở dòng trên cùng: chạm 1 lần → `Chạm lần nữa để xác nhận` (3 giây, `RESET_CONFIRM_MS`); chạm lần 2 → `IDLE` với `eventMs` = lúc chạm xác nhận.
- Nút luôn hiện (không tự ẩn) khi trạng thái khác `IDLE`; phần tử có `data-no-hold` không khởi động cử chỉ giữ.
- Chữ trên dải đổi `từ` → `lúc`; gợi ý IDLE là `Giữ 1 giây để START`.
- Đã cân nhắc và bỏ phương án "giữ 3 giây để về IDLE": một cử chỉ làm hai việc, khó hiểu khi tay bận.
