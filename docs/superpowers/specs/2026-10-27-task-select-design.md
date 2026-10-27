# Chọn task trước khi quay, mã task trong time-code

## Context
Hiện trường quay 3 camera (L/H/R) vào màn hình time-code để đồng bộ. Mỗi phiên quay làm **một task** (một "mã vòng" `V01…V76` trong `ref/KichBan-HienTruong.csv`, gồm 5 bước lặp nhiều lần). Đến nay mã task chỉ ghi tay ngoài hệ thống, nên khi ghép video với kịch bản phải tra lại. Yêu cầu của user (2026-10-27):

1. Có file JSON danh sách task và các bước, tham khảo hai file trong `ref/`, ID dễ tích hợp vào `gdsphyai` về sau.
2. Chọn task là **bắt buộc** trước khi quay; mã task phải nằm trong time-code (QR) để máy đọc lấy được.

Phiên này chạy tự động nên các lựa chọn dưới đây là của Claude, user kiểm tra lại.

## Catalog `src/tasks.json`
- Sinh bằng `scripts/build_tasks.py` từ hai CSV trong `ref/` (không sửa tay; `--check` để CI/so khớp).
- **Task** = một "mã vòng" của KichBan. **Step** = 5 bước trong vòng.
- Mã:
  - `V01…V76`: giữ nguyên mã vòng của KichBan.
  - `P01…P21`: 21 nhóm trong file PLAN (Master Micky) không khớp đủ 5 bước với KichBan. Tên task do Claude đặt theo kiểu "Đồ vật - hoạt động". 4 nhóm là biến thể của task KichBan (khác một vài bước) ghi `variantOf` (`P01→V04`, `P03→V07`, `P07→V24`, `P09→V37`).
  - 7 nhóm PLAN khớp đủ 5 bước (V01, V02, V05, V18, V22, V33, V61) không tạo mã mới, chỉ thêm `"plan"` vào `sources`.
  - `OTHER`: "Khác - không có mã việc phù hợp", đứng đầu danh sách trong section riêng, không có bước (bổ sung theo yêu cầu user 2026-10-27).
  - Step: `<task>-<thứ tự>`, ví dụ `V22-3`.
  - Mã chỉ dùng ký tự alphanumeric của QR (`0-9 A-Z -`) và dài ≤ 8 ký tự để vừa QR version 3.
- Cấu trúc:
  ```json
  { "version": 1, "sections": [{ "id": "general", "name": "…" }],
    "tasks": [{ "code": "V22", "name": "Thư từ - chuẩn bị bộ gửi", "section": "general",
                "sources": ["kichban", "plan"], "variantOf": null,
                "steps": [{ "code": "V22-1", "order": 1, "nameVi": "…", "nameEn": "…",
                            "description": "…", "props": ["…"], "wristcamNote": "…" }] }] }
  ```
- Tích hợp `gdsphyai`: schema hiện không có bảng task catalog; `ProjectTask.taskName` và `QATrimJob.taskName` là chữ tự do, `ProjectTask.episodeMetadata` là JSON. Mã `code` là khóa ổn định để (a) tạo bảng catalog mới với `code` unique như `Project.code`/`Device.code`, hoặc (b) ghi `{taskCode, stepCode}` vào `episodeMetadata`/`cut_info.json` trước khi có bảng. `sync-time-poc` đã nhận `--round V22` nên dùng chung mã.

## Luồng trên trang
1. Mở trang: nếu chưa có task (localStorage `timecode.task`) thì **màn chọn task** phủ toàn bộ, không có nút đóng. Không chọn thì không giữ-để-START được (overlay có `data-no-hold`).
2. Màn chọn task: ô tìm (mã hoặc tên, không dấu cũng được), danh sách theo section, chạm một task → xem 5 bước (tên VI/EN, mô tả, đạo cụ, lưu ý wristcam) → `Chọn task này`. Task đang chọn được đánh dấu.
3. Sau khi chọn: dòng **mã task + tên** hiện ngay trên dải START/STOP (mã to để camera thấy), QR mang mã task. Nút `Đổi task` ở dòng trên cùng mở lại màn chọn (có nút `Đóng`); nút ẩn khi đang `START` để không đổi task giữa chừng.
4. `↺ Session mới` (về IDLE) đồng thời **xóa task** và mở lại màn chọn, task cũ vẫn được đánh dấu để chọn lại bằng một chạm. Lý do: "chọn task trước khi quay" áp dụng cho mỗi phiên.
5. Dải tag khi IDLE mà chưa có task: `Chọn task để bắt đầu`.

## QR
- Payload mới `TC4:<slotStartMs>:<tzOffsetMin>:<STATE>:<eventMs>:<TASK>`; `TASK` là mã task, hoặc `-` khi chưa chọn (chỉ xảy ra khi `IDLE`).
- Đổi prefix `TC3→TC4` để máy đọc phân biệt số trường. Dài nhất 50 ký tự < 61 (v3-M alphanumeric), version QR giữ 3.
- `sync-time-poc/sync_poc/timecode.py` nhận cả TC3 (không task) và TC4 (có `task`).

## File
| File | Thay đổi |
|---|---|
| `scripts/build_tasks.py`, `src/tasks.json` | mới |
| `src/tasks.ts` (+test) | kiểu `Task`/`Step`, `findTask`, `filterTasks` (không dấu), `loadTaskCode`/`saveTaskCode` |
| `src/picker.ts` | overlay chọn task: danh sách / chi tiết / tìm kiếm |
| `src/qr.ts`, `src/config.ts` (+test) | `TC4`, thêm trường task |
| `src/tag.ts` (+test) | nhãn IDLE khi chưa có task |
| `src/hold.ts` | phím Space trong `[data-no-hold]` (ô tìm) không kích hoạt giữ |
| `src/main.ts`, `index.html`, `src/style.css` | dòng task, nút `Đổi task`, wiring picker, reset xóa task |
| `tsconfig.json` | `resolveJsonModule` |
| `README.md` | bước chọn task, spec TC4, mô tả `tasks.json` |

## Verification
- `npm test`: catalog hợp lệ (mã duy nhất, 5 bước, mã alphanumeric ≤ 8), lọc không dấu, payload TC4 và payload dài nhất vừa v3, nhãn IDLE.
- `npm run build`.
- Chạy dev + trình duyệt: mở trang lần đầu thấy màn chọn; chọn V22 → dòng task hiện, QR decode ra `…:V22`; `Đổi task` ẩn khi START; `Session mới` mở lại màn chọn.
- Không commit/push khi chưa hỏi user.
