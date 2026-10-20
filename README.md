# Quản lý bán hàng & chuỗi tồn kho đa chi nhánh

Đồ án DBMS330284 — FIT, HCMUTE. React 18/Vite, Express và SQL Server; giữ cách gọi T-SQL thuần qua `mssql`.

## Cài đặt và chạy

Dùng Node.js **22.12 trở lên**, npm, SQL Server 2022 Developer hoặc Docker. Image SQL Server 2022 cần máy x86-64 phù hợp; bộ kiểm thử cục bộ cũng đã chạy trên Azure SQL Edge ARM64, nhưng không thay thế việc xác nhận trên SQL Server 2022 của máy nộp bài.

```sh
cp backend/.env.example backend/.env
npm ci --prefix backend
npm ci --prefix frontend
```

Điền `DB_PASSWORD` và bốn mật khẩu `DB_ADMIN_PASSWORD`, `DB_MANAGER_PASSWORD`, `DB_CASHIER_PASSWORD`, `DB_STOCK_PASSWORD` trong `backend/.env`. Chọn mật khẩu mạnh và khác nhau; không commit file này. Bốn biến cuối cần khi chạy `db:init`, không cần cho `db:migrate` hoặc chạy web. Login đã tồn tại không bị đổi mật khẩu bởi script bootstrap/migration.

```sh
npm run db:up
# Chỉ với CSDL mới/chưa có bảng:
npm run db:init
npm run frontend:build
npm run backend:start
```

Mở [http://localhost:5000](http://localhost:5000). Express phục vụ đúng bundle vừa build trong `backend/public`. `/health` chạy truy vấn CSDL và trả 503 nếu chưa sẵn sàng. SQL readiness được kiểm tra trước khi mở cổng HTTP. Windows có thể dùng `./start.ps1` **sau lần khởi tạo đầu tiên**; script dừng nếu Docker, migration hoặc build thất bại.

Để dùng SQL Server đang có, sửa `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Cổng mặc định thống nhất là **11433**; backend **5000**, Vite **5173**. Với container cũ ánh xạ 1433, đặt `DB_PORT=1433`, không khởi động thêm container trùng dữ liệu/cổng.

Chế độ phát triển:

```sh
npm run backend:start
# Terminal khác:
npm run frontend:dev
```

Frontend gọi `/api` cùng origin qua proxy, không hardcode `localhost:5000` trong bundle. Dev server/Docker chỉ bind loopback theo mặc định. Khi triển khai HTTPS, đặt `COOKIE_SECURE=true` và `APP_ORIGINS` thành origin thực tế. Chỉ mở `HOST=0.0.0.0` khi đã chủ động cấu hình mạng/reverse proxy.

## Nâng cấp CSDL có dữ liệu

**Không chạy file 00/01 để cập nhật dữ liệu đang dùng.** Đây là script dựng mới/reset; mặc định từ chối nếu đã có bảng. `node scripts/database.cjs init --reset` là thao tác **xóa dữ liệu**, chỉ dành cho CSDL demo có thể bỏ.

```sh
npm run db:migrate
```

Lệnh này:

1. Tạo full backup `COPY_ONLY, CHECKSUM` tên duy nhất trong thư mục backup của SQL Server và chạy `RESTORE VERIFYONLY`. CLI in đường dẫn trên server; cần copy/lưu backup ra nơi độc lập trước khi triển khai quan trọng.
2. Chạy toàn bộ migration trong **một transaction**. Không DROP TABLE, DELETE dữ liệu, reset identity hoặc đổi mật khẩu/login. Đơn còn hiệu lực có tổng tiền lệch chi tiết bị từ chối; lỗi ràng buộc khiến rollback. Cần đối soát dữ liệu nguồn trước khi chạy lại.
3. Cập nhật view, function, trigger, procedure và quyền; ghi `SchemaMigrations`. Có thể chạy lại. Các index được dựng lại nên cần cửa sổ bảo trì để tránh chặn truy vấn lâu.

Migration chốt tỷ lệ chiết khấu/thuế cho từng đơn. Dữ liệu cũ không lưu hạng khách tại thời điểm mua, nên đơn cũ được chốt theo cách tính cũ **tại thời điểm migration**; không thể khôi phục chính xác chính sách lịch sử đã bị mất. Cần đối soát chứng từ trước triển khai thực tế. Migration không đoán hoặc tự điều chỉnh tồn kho lịch sử đã sai.

Giữ backup để rollback ứng dụng/schema nếu cần. Khôi phục backup phải thực hiện có kế hoạch vì có thể làm mất giao dịch phát sinh sau backup. Có thể tạo backup độc lập bằng `npm run db:backup`. Restore là thao tác ghi đè: chỉ chạy `npm run db:restore -- --replace` khi đã đặt **DB_NAME đích** và **RESTORE_FILE trên máy SQL Server** rõ ràng. Script kiểm tra backup trước và trả CSDL về MULTI_USER nếu lỗi khi nó vẫn ONLINE; nếu SQL Server để DB ở trạng thái RESTORING cần DBA xử lý. Hai script backup/restore không phải migration tự động.

## Xác thực và phân quyền

Đăng nhập bằng SQL login đã cấu hình; mật khẩu chỉ gửi một lần tới backend, được giữ trong bộ nhớ server phục vụ kết nối. Trình duyệt chỉ nhận cookie session ngẫu nhiên **HttpOnly, SameSite=Strict**, không lưu mật khẩu/token trong localStorage. Session hết hạn sau 8 giờ, logout hủy session, khởi động lại backend yêu cầu đăng nhập lại. Store này dành cho một tiến trình; khi chạy nhiều instance cần session store dùng chung và cơ chế quản lý secret phù hợp.

| Login mặc định | Role | Phạm vi |
|---|---|---|
| Login_Admin | Role_Admin | Quản trị dữ liệu |
| Login_QuanLyChiNhanh | Role_QuanLyChiNhanh | Sản phẩm, tổ chức, bán hàng, nhập/chuyển kho, báo cáo; không đọc lương |
| Login_ThuNgan | Role_ThuNgan | Tra sản phẩm/khách/nhân viên không lương, tạo khách thường, bán hàng và hủy hợp lệ |
| Login_ThuKho | Role_ThuKho | Xem tồn kho, nhập/chuyển kho; không xem khách và báo cáo tài chính |

Role Quản lý hiện có phạm vi **toàn chuỗi**; chưa có mapping login → chi nhánh hay SQL Server RLS theo từng người. `WITH CHECK OPTION` của view chi nhánh 1 chỉ là ví dụ kiểm soát qua view. Không mô tả nó là RLS đầy đủ.

Các API nghiệp vụ từ chối request chưa đăng nhập; header `X-DB-User/X-DB-Password` cũ không còn được hỗ trợ. Ghi dữ liệu của role hạn chế đi qua procedure; không cấp quyền ghi trực tiếp bảng đơn/chi tiết.

## Nghiệp vụ và báo cáo

- Đơn mới chốt tỷ lệ VIP 10%, Kim Cương 15%, VAT 8%. `TongTien` lưu tiền gốc, chiết khấu/thuế được tính từ snapshot trên từng dòng. Hóa đơn cộng **tất cả** dòng. Tổng thanh toán bằng tổng tiền sau giảm đã làm tròn cộng thuế đã làm tròn từng dòng.
- Báo cáo doanh thu sản phẩm/chi nhánh/KPI/chi tiêu khách chỉ tính đơn **đã giao**, thống nhất tiền sau chiết khấu, chưa VAT. Báo cáo chi nhánh tách VAT và tổng thực thu.
- Vòng đời: `0 → 1 → 2 → 3`, hoặc `0/1/2 → 4`. Chứng từ hoàn tất không được sửa. Cả hai đường hủy đều hoàn tồn đúng một lần; xóa chi tiết đơn hủy không hoàn thêm.
- Khóa MaDH/MaSP của dòng là bất biến. Đổi sản phẩm bằng xóa dòng cũ/thêm dòng mới trong cùng transaction khi đơn còn mở. Kiểm tra tồn và khóa `UPDLOCK/HOLDLOCK` bảo vệ bán đồng thời.
- **Nhập Kho** trên màn hình báo cáo bổ sung tồn cho hàng mới, có nhật ký. Chuyển kho chỉ di chuyển tồn; hai đường chuyển dùng chung thứ tự khóa kho tăng dần.
- Không cho quản lý thay thế là chính nhân viên/cấp dưới gây vòng lặp. Nhân viên nghỉ việc hoặc sản phẩm ngừng bán không được lập đơn mới.

## Kiểm thử và sinh tải

```sh
npm test                       # Unit: hóa đơn nhiều dòng, role, session, validation, SQL đồng bộ
npm run sql:check               # File SQL tổng và migration đúng nguồn
npm run test:integration        # Tạo DBMSTest_* và login ngẫu nhiên, kiểm thử rồi dọn
```

Integration dùng thông tin quản trị SQL trong môi trường, nhưng **tự chọn CSDL và login tạm**, không ghi vào CSDL ứng dụng. Kiểm tra auth/RBAC, CRUD có quyền giới hạn, tồn kho/hủy, đồng thời, chứng từ bất biến, migration từ schema cũ, chạy lại, rollback khi dữ liệu không hợp lệ và recovery với đối chiếu dữ liệu. Backup của DB test được giữ trên server để chẩn đoán, cần chính sách dọn định kỳ. Không dùng số lượng assertion làm bằng chứng phủ hết nghiệp vụ.

Các file `test_deep_*.js`, `test_ultra_deep.js` là chẩn đoán lịch sử với assertion cũ, chỉ cho phép chạy khi `RUN_LEGACY_TESTS=true` và DB_NAME là `DBMSTest_*`. Lệnh test chính dùng bộ regression mới. Không chạy test ghi trên CSDL đang demo/nộp bài cần giữ.

`sp_SinhDuLieuMau_TestTai` chỉ chạy trong `DBMSTest_*` hoặc CSDL có đuôi `_Benchmark`. Nó cấp tồn cho fixture, giữ trigger hoạt động, tạo đơn theo vòng đời hợp lệ. Tối đa 100.000 đơn; đây không phải nghiệp vụ nhập hàng sản xuất. Kết quả Execution Plan phải được đo trên máy/dữ liệu thực tế; số liệu minh họa trong tài liệu không thay thế phép đo.

## Demo recovery an toàn

Chỉ dùng bản CSDL độc lập có đuôi `_RecoveryDemo` (hoặc DBMSTest_*), đã khởi tạo đủ schema/seed và không có kết nối ứng dụng:

```sh
# Đặt DB_NAME thành tên bản demo độc lập trong môi trường trước khi chạy:
npm run db:recovery
```

Script tự lấy thời điểm an toàn thực tế, áp dụng STOPAT cho các log và đối chiếu số đơn, chi tiết, tổng tiền sau restore. Script từ chối chạy lên CSDL ứng dụng mặc định. Demo có thao tác xóa và restore; không dùng dữ liệu cần giữ.

## Chỉnh sửa SQL

Sửa file thành phần 01–09 rồi chạy `npm run sql:build`. Công cụ sinh `00_KHOITAO_TOANBO_CSDL_RUN_ALL.sql` và `migrations/20261020_safe_retail.sql` từ cùng nguồn; CI/test kiểm tra sai lệch. Không sửa thủ công hai file sinh tự động.

Đợt sửa này không tạo báo cáo học thuật 50–100 trang, slide hay bằng chứng benchmark thay cho nhóm. Cần hoàn thiện các artifact nộp bài riêng theo kế hoạch môn học.
