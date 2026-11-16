# HỆ THỐNG ĐỊNH VỊ HÀNG HÓA & KIỂM KHO (Phiên bản 1.4)

## Mục tiêu
Quản lý vị trí lưu trữ thực tế, cấu trúc kho linh hoạt, tra cứu tồn kho KiotViet theo chi nhánh, kiểm kho thông thường và kiểm kê xe theo IMEI/SK/SM.

## Tính năng chính
1. Phân quyền nhân sự theo chi nhánh (ADMIN, QUẢN LÝ, NHÂN VIÊN, XEM).
2. Đồng bộ danh mục sản phẩm dùng chung từ KiotViet (tự động hàng ngày và thủ công).
3. Quản lý cấu trúc vị trí linh hoạt (khu vực, kệ, tầng, sọt, ngăn) với tên hiển thị đầy đủ tự động từ mã định danh nội bộ (UUID/Key).
4. Tra cứu sản phẩm & tồn kho KiotViet trực tiếp theo chi nhánh, không lưu đè tồn kho cũ.
5. Quản lý QR vị trí và quét mã QR xem danh sách sản phẩm.
6. Bố trí mới, bổ sung và thay đổi vị trí sản phẩm với lịch sử đầy đủ.
7. Phiên kiểm kho thông thường với chốt tồn KiotViet, hỗ trợ nhiều nhân sự kiểm cùng mã sản phẩm ở các khu vực khác nhau mà không khóa toàn bộ.
8. Kiểm kê xe điện theo IMEI, số khung (SK), số máy (SM) với tính năng tách chuỗi và tìm kiếm một phần mã.
9. Báo cáo chênh lệch, nhật ký thao tác (Audit Logs).
