# Time-code display site: đồng bộ mốc bắt đầu của 3 camera

## Context
Ba camera (30fps) cùng quay vào **một màn hình chung** đang chạy trang web này. Sau khi quay, người hoặc AI tìm trong mỗi video một frame đọc được thời gian `T` trên màn hình, rồi suy ra thời điểm bắt đầu của video:
`start_video = T − pts(f)`. Trong đó `pts(f)` là presentation timestamp của frame `f`, lấy bằng `ffprobe`. Nếu chắc chắn video là CFR thì dùng `f/30` cũng được.
Yêu cầu: **lệch dưới 1 frame (< 33ms ở 30fps)**. Repo `time-code` đang trống (remote `github.com/gunrosen/time-code`) và được host bằng **GitHub Pages**.

### Đã chốt cùng user
- Có 1 màn hình chung, camera quay 30fps.
- Bố cục: số to + dải mã Gray + QR.
- Giờ hiển thị: giờ thực theo múi giờ của trình duyệt.
- Host bằng GitHub Pages, deploy khi push `main`.
- Shutter camera **không chỉnh được hoặc chưa biết**, khoảng cách và loại màn hình **chưa rõ**. Vì vậy trang phải đọc được cả khi frame bị nhòe do phơi sáng dài (khoảng 1/30s), và phải dùng được cả ở gần lẫn ở xa.

### Non-goals
- Không viết tool/AI decode video. README chỉ mô tả spec để sau này AI đọc.
- Không đồng bộ nhiều thiết bị, không NTP, không backend.

### Anti-goals
- Trong cùng một lần vẽ (render), các phần tử hiển thị giá trị không khớp nhau.
- Trang bị cuộn, chữ số nhảy vị trí, màn hình tự tắt khi đang quay.
- Thiết kế chỉ đọc được khi shutter ngắn.

## Ý tưởng chính: mã thô đứng yên và thanh quét mịn
Điểm khác so với bản trước: nếu đổi số ở **mỗi** lần refresh (16.7ms) thì với phơi sáng khoảng 33ms, mỗi frame video chồng 2–3 giá trị. Kết quả là chữ ms nhòe, QR không decode được và mã Gray mất đảm bảo. Nên tôi tách làm hai lớp:

1. **Lớp thô (đứng yên theo slot 100ms):** số to, dải Gray và QR chỉ đổi giá trị **mỗi 100ms**, căn theo đồng hồ (`slot = floor(epochMs / 100)`). Mỗi slot kéo dài khoảng 3 frame camera, nên luôn có frame nằm trọn trong một slot, tức frame sạch để đọc. Frame nằm vắt qua ranh giới hai slot thì dải Gray chỉ có 1 ô xám.
2. **Lớp mịn (thanh quét, "sweep"):** một thước chia vạch 0–99ms nằm ngang, có một vạch sáng chạy từ trái sang phải trong mỗi slot, vị trí bằng `(epochMs mod 100) / 100`. Phơi sáng dài sẽ làm vạch nhòe thành một vệt, **tâm của vệt chính là thời điểm giữa lúc phơi sáng**. Người đọc nhìn tâm vệt trên thước, AI tính trọng tâm độ sáng. Phơi sáng ngắn thì chỉ thấy một vạch gọn.
   → `T = thời_gian_slot (từ số/QR/Gray) + ms_đọc_trên_thước`. Sai số khoảng ±8ms trên màn 60Hz, đủ cho yêu cầu dưới 33ms.

Độ trễ hiển thị và thiên lệch do refresh rời rạc (khoảng nửa chu kỳ refresh) là **như nhau với cả 3 camera**, nên không ảnh hưởng độ lệch tương đối. README sẽ ghi chú điều này cho trường hợp cần giờ tuyệt đối.

## Stack (lựa chọn của Claude)
- Vite 8 + TypeScript thuần, không framework. Không dùng `any`/`unknown`, không dùng `class`.
- `qrcode` (node-qrcode): dùng `QRCode.create(text, { errorCorrectionLevel: 'M' })` lấy `modules` (BitMatrix `size`, `get(r,c)`) rồi tự vẽ lên canvas. Chỉ generate lại khi slot đổi. Thư viện được bundle nên không cần CDN.
- `vitest` cho unit test.
- `base: './'` để không hard-code tên repo.
- Các hằng số như `SLOT_MS = 100`, số bit Gray và ngưỡng phát hiện frame rớt gom vào `src/config.ts`.

## Vòng render
- Dùng `requestAnimationFrame`. Mỗi callback tạo **một** snapshot `{ epochMs, slot, phaseMs }`, rồi tất cả renderer vẽ từ snapshot đó.
  - `epochMs = anchor + rafTimestamp`, với `anchor = Date.now() − performance.now()` lấy lúc load và lấy lại khi tab hiển thị trở lại. Không đọc `Date.now()` mỗi frame.
  - Số, Gray và QR chỉ cập nhật DOM/canvas khi `slot` đổi. Thanh quét vẽ lại mỗi frame.
  - Trên màn hình refresh cao (120/144Hz) thanh quét vẫn mượt, vì lớp thô không phụ thuộc tần số refresh.

### Các phần tử
1. **Số to** `HH:MM:SS.d`, trong đó `d` là phần mười giây, bằng đúng slot. Không hiện ms ở số to vì ms sẽ nhòe; ms đọc trên thước. Font `ui-monospace` + `tabular-nums`, chữ trắng trên nền đen, chiếm chiều ngang tối đa. Dòng nhỏ phía trên ghi `YYYY-MM-DD` và múi giờ (`UTC+07:00 Asia/Ho_Chi_Minh`, lấy qua `Intl`).
2. **Thước quét**: thanh ngang full-width, vạch chia mỗi 10ms có nhãn `0 10 … 90` và vạch nhỏ mỗi 5ms. Vạch sáng màu trắng hoặc vàng, rộng khoảng 1.5% chiều ngang. Thước nằm trên **một dải ngang** để chịu được rolling shutter.
3. **Dải Gray**: 24 ô gồm `[trắng][đen] + 20 bit gray(slot_trong_ngày) + [đen][trắng]`, MSB trước, bit 1 là ô trắng. `slot_trong_ngày = floor(ms_từ_nửa_đêm_local / 100)`, giá trị tối đa 863 999, vừa trong 20 bit. Ô to để đọc được từ xa.
4. **QR**: payload `TC2;<slotStartEpochMs>;<tzOffsetMin>`, mức M, quiet zone 4. Payload ngắn nên QR version nhỏ (khoảng 25 module), module to, đọc được từ xa.
5. Bỏ dòng `frame #` của mockup cũ, vì số đếm theo refresh không còn ý nghĩa cho việc đồng bộ. Thước quét thay vào chỗ đó.

### Responsive (ưu tiên đọc được từ xa)
- `100dvh`, `overflow: hidden`, không bao giờ cuộn.
- **Ngang:** số to ở trên; bên dưới, cột trái gồm thước quét và dải Gray, cột phải là QR vuông chiếm tối đa chiều cao còn lại.
- **Dọc:** xếp theo thứ tự số to, thước quét, QR, Gray. Dải Gray chia 2 hàng 12 ô nếu bề ngang hẹp.
- Kích thước tối thiểu: QR ≥ 35% cạnh ngắn của viewport, ô Gray ≥ 1/14 bề ngang.
- Canvas scale theo `devicePixelRatio` bằng `ResizeObserver`, tọa độ nguyên, tắt `imageSmoothingEnabled`.

### Tiện ích
- **Toàn màn hình** và **giữ màn hình sáng** (`navigator.wakeLock`, cần HTTPS mà Pages có sẵn; xin lại khi `visibilitychange`). Overlay nút tự ẩn sau 3 giây.
- **Status line nhỏ:** tần số refresh đo được (trung vị delta rAF), số **frame bị rớt** (delta > 1.5× trung vị) và badge cảnh báo khi vừa có frame rớt trong 2 giây gần nhất. Có thêm `● awake` khi wake lock đang bật.

## Cấu trúc file
| File | Nội dung |
|---|---|
| `index.html` | DOM: `#date`, `#time`, `canvas#sweep`, `canvas#strip`, `canvas#qr`, `#status`, `#controls` |
| `src/config.ts` | `SLOT_MS`, `GRAY_BITS`, ngưỡng frame rớt, thời gian auto-hide |
| `src/main.ts` | Vòng rAF, snapshot, điều phối renderer |
| `src/clock.ts` | `createClock()`, `toSnapshot(epochMs)`, `formatTime`, `formatDate`, `tzLabel`, `slotOfDay` |
| `src/gray.ts` | `toGray`, `fromGray`, `toBits` |
| `src/sweep.ts` | `drawSweep(ctx, phaseMs, layout)`: thước và vạch |
| `src/strip.ts` | `drawStrip(ctx, slotOfDay, layout)` |
| `src/qr.ts` | `buildPayload`, `drawQr` |
| `src/stats.ts` | `createFrameStats()`: `hz`, `dropped`, `recentDrop` |
| `src/controls.ts` | Fullscreen, wake lock, auto-hide |
| `src/style.css` | Theme đen, grid landscape/portrait |
| `src/*.test.ts` | Test `gray`, `clock`, `qr`, `stats` |
| `README.md` | Cách dùng; **quy trình đồng bộ từng bước** (chọn frame sạch, đọc slot qua QR/Gray/số, đọc ms trên thước bằng tâm vệt, lấy `pts` bằng ffprobe, công thức); spec Gray, QR và thước cho AI; mẹo quay (đặt màn hình gần giữa khung hình của mỗi camera để giảm lệch do rolling shutter, tránh frame rớt, màn ≥ 60Hz) |
| `.github/workflows/deploy.yml` | Node 22, `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact` (dist), `actions/deploy-pages`; trigger push `main` + `workflow_dispatch` |
| `docs/superpowers/specs/2026-10-19-timecode-display-design.md` | Bản design này |
| `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore` | Scaffold |

## Các bước triển khai
1. Scaffold Vite vanilla-ts, thêm `qrcode`, `@types/qrcode`, `vitest`. Script gồm `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`).
2. Viết theo TDD: `gray.ts`, `clock.ts` (snapshot, slot, format, múi giờ), `qr.ts` (payload), `stats.ts`.
3. Viết các renderer `sweep.ts`, `strip.ts`, `drawQr`, rồi `main.ts` và CSS responsive.
4. Viết `controls.ts`.
5. Viết README, workflow và design doc.
6. Commit theo conventional style. **Hỏi user trước khi push.** User bật *Settings → Pages → Source: GitHub Actions*; repo phải public nếu dùng tài khoản free.

## Verification
- `npm test`: Gray round-trip trên 0..863 999 và tính chất slot liền kề chỉ khác 1 bit; snapshot cho `slot`/`phaseMs` đúng ở các biên (x99 → x00, nửa đêm); `formatTime` đúng với múi giờ giả lập; payload đúng định dạng; stats phát hiện frame rớt.
- `npm run build` sạch lỗi TypeScript.
- `npm run dev`, rồi dùng Playwright chụp ở 390×844, 844×390 và 1440×900: không có thanh cuộn, số không tràn, QR vuông và đủ to. Dùng `browser_evaluate` để kiểm tra số to, payload QR và Gray khớp cùng slot, và thước quét chạy.
- Decode QR từ screenshot (dùng `jsQR` trong một script ở scratchpad) để xác nhận payload.
- Kiểm thực tế (user làm): quay màn hình bằng camera 30fps để auto-exposure, tua từng frame, rồi xác nhận: có frame sạch trong mỗi slot, QR decode được, tâm vệt trên thước tăng khoảng 33ms mỗi frame.
