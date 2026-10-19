# HE THONG QUAN LY BAN HANG VA CHUOI TON KHO DA CHI NHANH

TRUONG DAI HOC SU PHAM KY THUAT TP. HO CHI MINH (HCMUTE)  
KHOA CONG NGHE THONG TIN - BO MON HE THONG THONG TIN  
HOC PHAN: HE QUAN TRI CO SO DU LIEU (DBMS330284)  
GIANG VIEN HUONG DAN: TS. PHAN THI THE  

DANH SACH THANH VIEN THUC HIEN:
1. Quach Tai Loi (20%)
2. Phan Thien Khoi (20%)
3. Huynh Van Banh (20%)
4. Hoang Gia Kiet (20%)
5. Tran Nhat Tan (20%)

---

## 1. TONG QUAN DU AN VA KIEN TRUC HE THONG

Du an xay dung he thong quan ly ban hang va chuoi ton kho da chi nhanh, ap dung kien truc da tang (Multi-tier Architecture) voi mo hinh thiet ke Clean Architecture tai Backend ket hop React.js tai Frontend va he quan tri co so du lieu quan he Microsoft SQL Server 2022.

### 1.1. Cac tang kien truc

- Tang Co so du lieu: Microsoft SQL Server 2022 Enterprise/Developer Edition chay tren Docker Container. Trien khai day du cac rang buoc toan ven, 5 Khung nhin (Views va Indexed Views), 5 Ham nguoi dung (Scalar, iTVF, mTVF), 5 Trigger nang cao (kiem soat ton kho, audit log bien dong gia, tich diem VIP, chong gian lan ke toan) va 5 Thu tuc/Giao dich ACID kiem soat dong thoi (Concurrency Control voi khoa UPDLOCK + HOLDLOCK).
- Tang Backend: Node.js va Express.js trien khai theo Clean Architecture (Domain, Usecases, Infrastructure, Presentation), giao tiep truc tiep qua driver thuan mssql, tich hop co che kiem soat loi tap trung va xac thuc phan quyen Native CSDL.
- Tang Frontend: React 18, Vite va he thong UI Dashboard duoc thiet ke theo Design System hien dai, phan tach ro rang giua cac man hinh nghiep vu: Dang nhap RBAC, Quan ly san pham, Quan tri to chuc (Chi nhanh, Nhan su, Khach hang), Don hang va hoa don, Tra cuu va bao cao thong ke.

---

## 2. BANG MAU THIET KE GIAO DIEN (DESIGN SYSTEM PALETTE)

| Vai tro | Ten mau | Ma HEX | Cach dung thuc te |
| :--- | :--- | :--- | :--- |
| Nen chinh (App BG) | Light Cool Gray | #F8FAFC | Nen toan trang, khong de trang tinh de card noi len |
| Nen Card / Table | Pure White | #FFFFFF | Nen cua bang danh sach chi nhanh, card chi so |
| Duong vien (Border) | Border Gray | #E2E8F0 | Ke vien bang du lieu, phan tach sidebar |
| Primary (Chu dao) | Deep Indigo Blue | #2563EB | Nut "Them chi nhanh", tab dang chon, lien ket |
| Secondary / Sidebar | Slate Dark | #0F172A | Nen Sidebar menu quan tri hoac icon phu |
| Text chinh | Slate 900 | #0F172A | Tieu de, ten chi nhanh, so lieu KPI |
| Text phu | Slate 500 | #64748B | Dia chi, ngay tao, ma hoa don, nhan phu |

---

## 3. THONG TIN DICH VU VA CONG MANG (PORTS CONFIGURATION)

Do mot so dai cong tren he dieu hanh Windows (nhu 14333 va 3000) nam trong danh sach loai tru cua Hyper-V/WSL (Excluded Port Ranges), he thong da duoc chuan hoa cac cong ket noi nhu sau:

| Dich vu | Cong nghe | Cong (Port) | Dia chi truy cap |
| :--- | :--- | :---: | :--- |
| Giao dien Frontend (Dev) | React 18, Vite | 5173 | http://localhost:5173 |
| May chu Backend & Web Production | Node.js Express | 5000 | http://localhost:5000 |
| Co so du lieu SQL Server | Docker Container | 11433 | localhost,11433 |

---

## 4. YEU CAU MOI TRUONG CAI DAT (PREREQUISITES)

De van hanh toan bo du an, may tinh can cai dat truoc:
- He dieu hanh: Windows 10/11, Linux (Ubuntu/Debian) hoac macOS.
- Docker va Docker Desktop: Phien ban 20.10 tro len (ho tro docker compose).
- Node.js: Phien ban LTS 18.x, 20.x hoac 22.x tro len.
- Trinh quan ly goi: npm phien ban 9.x tro len.
- Git: Phien ban 2.x tro len.

---

## 5. HUONG DAN KHOI CHAY DU AN (EXECUTION GUIDE)

### Cach 1: Khoi chay nhanh toan bo he thong (Khuyen dung)

He thong da duoc dong goi tap lenh tu dong. Nguoi dung mo PowerShell tai thu muc goc du an (`E:\DBMS`) va thuc thi:

```powershell
./start.ps1
```

Tap lenh se tu dong:
1. Khoi dong Container Microsoft SQL Server tren cong 11433.
2. Khoi dong Backend Express API tren cong 5000.
3. Khoi dong Frontend React tren cong 5173.

---

### Cach 2: Khoi chay tung thanh phan thu cong (Manual Step-by-Step)

#### Buoc 1: Khoi dong Co so du lieu SQL Server

Tu thu muc goc du an, khoi chay Container bang Docker Compose:

```bash
docker compose up -d
```

Kiem tra trang thai hoat dong cua Container:

```bash
docker compose ps
```

Container `sqlserver_dbms_cothe` phai o trang thai `Up` va anh xa cong `0.0.0.0:11433->1433/tcp`.

#### Buoc 2: Khoi tao du lieu (Neu Container chay lan dau)

Neu du lieu chua duoc tao trong Container, co the thuc thi script khoi tao toan bo CSDL (bao gom bang, du lieu mau, views, functions, triggers, procedures, roles):

```bash
docker exec -i sqlserver_dbms_cothe /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "PasswordAdmin@2026" -C -i /database/00_KHOITAO_TOANBO_CSDL_RUN_ALL.sql
```

Hoac su dung Azure Data Studio / SQL Server Management Studio (SSMS) ket noi vao `localhost,11433` voi tai khoan `sa` / `PasswordAdmin@2026` va thuc thi file `database/00_KHOITAO_TOANBO_CSDL_RUN_ALL.sql`.

#### Buoc 3: Cai dat va khoi chay Backend API

Di chuyen vao thu muc `backend`:

```bash
cd backend
npm install
node src/server.js
```

Backend se khoi dong tai `http://localhost:5000` va hien thi thong bao:
`Kiem tra ket noi CSDL SQL Server: THANH CONG`.

#### Buoc 4: Cai dat va khoi chay Frontend React

Mo mot cua so Terminal moi va di chuyen vao thu muc `frontend`:

```bash
cd frontend
npm install
npm run dev
```

Frontend se khoi dong tai `http://localhost:5173`. Mo trinh duyet va truy cap dia chi tren de su dung ung dung.

---

## 6. DANH SACH TAI KHOAN DANG NHAP VA PHAN QUYEN CSDL (RBAC MATRIX)

He thong ap dung nghiem ngat nguyen ly Dac quyen toi thieu (Least Privilege). Nguoi dung co the su dung cac nut chon nhanh (Presets) tai man hinh Dang nhap:

| Tai khoan SQL Login | Mat khau mac dinh | Database Role | Quyen han nghiep vu chi tiet |
| :--- | :--- | :--- | :--- |
| Login_Admin | AdminPassword@2026 | Role_Admin | Toan quyen kiem soat co so du lieu (CONTROL DATABASE), quan tri nguoi dung va cau hinh he thong. |
| Login_QuanLyChiNhanh | ManagerPassword@2026 | Role_QuanLyChiNhanh | Xem bao cao ton kho xep hang, doanh thu chi nhanh, danh gia KPI nhan vien, dieu chuyen kho noi bo va lien chi nhanh. Bi cam xem truc tiep bang luong nhan vien. |
| Login_ThuNgan | CashierPassword@2026 | Role_ThuNgan | Lap don hang, in hoa don phuc hop, tra cuu thong tin khach hang VIP va tinh chiet khau. Bi cam tuyet doi xoa don hang da giao va xem thong tin luong nhan su. |
| Login_ThuKho | StockPassword@2026 | Role_ThuKho | Kiem tra ton kho xep hang, thuc hien thu tuc dieu chuyen kho. Bi cam xem thong tin khach hang, don hang va nhan su. |
| sa | PasswordAdmin@2026 | sysadmin | Tai khoan quan tri goc cua Microsoft SQL Server 2022. |

---

## 7. HUONG DAN CHAY BO KIEM THU TU DONG (AUTOMATED TEST SUITES)

He thong tich hop 3 bo kiem thu tu dong chuyen sau, kiem tra toan bo 121 tieu chi toan ven tu muc CSDL den API:

### 7.1. Chay bo kiem thu chuyen sau toan dien (Ultra-Deep Suite - 40 Tests)

Kiem tra 5 Khung nhin, 5 Ham, 5 Trigger, 15 REST API Endpoints, ma tran bao mat 4 Roles va tranh chap dong thoi Concurrency (UPDLOCK + HOLDLOCK):

```bash
node backend/test_ultra_deep.js
```

### 7.2. Chay bo kiem thu toan ven rang buoc he thong (Full System Suite - 47 Tests)

Kiem tra 11 bang, khoa chinh, 12 khoa ngoai, cac rang buoc CHECK, UNIQUE va ma loi HTTP phan hoi:

```bash
node backend/test_deep_full_system.js
```

### 7.3. Chay bo kiem thu luong nghiep vu ban hang (Business Workflow Suite - 34 Tests)

Kiem tra quy trinh tao don POS, chiem dung ton kho, hoan ton khi huy don, thang hang VIP tu dong va chong ban am:

```bash
node backend/test_deep_business.js
```

---

## 8. CAU TRUC THU MUC DU AN

```text
E:\DBMS\
├── backend\                               # May chu API Node.js Express (Clean Architecture)
│   ├── public\                            # Ban build production cua Frontend (duoc Express serve tai :5000)
│   ├── src\
│   │   ├── core\
│   │   │   ├── domain\                    # Entities va Interfaces Repository
│   │   │   └── usecases\                  # Cac nghiep vu Use Cases he thong
│   │   ├── infrastructure\
│   │   │   ├── database\                  # Ket noi SqlServerConnectionFactory (Singleton Pool)
│   │   │   └── repositories\              # Trien khai truy van thuan SQL Server (Raw Driver)
│   │   └── presentation\
│   │       ├── controllers\               # Controllers tiep nhan Request va tra ve JSON
│   │       ├── middlewares\               # Xac thuc Context CSDL va xu ly loi tap trung
│   │       └── routes\                    # Dinh nghia cac duong dan API
│   ├── test_ultra_deep.js                 # Bo kiem thu tu dong chuyen sau
│   ├── test_deep_full_system.js           # Bo kiem thu toan ven he thong
│   ├── test_deep_business.js              # Bo kiem thu nghiep vu ban hang
│   ├── package.json
│   └── .env                               # Bien moi truong ket noi CSDL
│
├── database\                              # Tap hop 11 scripts SQL Server kien truc chuan
│   ├── 00_KHOITAO_TOANBO_CSDL_RUN_ALL.sql # Script khoi tao tong the tat ca doi tuong
│   ├── 01_TaoCSDL_Bang_RangBuoc.sql       # 11 bang va rang buoc toan ven
│   ├── 02_DuLieuMau_Testing.sql           # Du lieu kiem thu ban dau va Stored Proc sinh tai
│   ├── 03_KhungNhin_Views.sql             # 5 Khung nhin (v_BaoCaoTonKho_XepHang, Indexed View...)
│   ├── 04_Ham_Functions.sql               # 5 Ham UDF, iTVF, mTVF
│   ├── 05_Trigger_RangBuocNangCao.sql     # 5 Triggers da dong (Multi-row) va Audit Log
│   ├── 06_ChiMuc_Indexes_Performance.sql  # 5 Nonclustered Indexes toi uu hieu nang
│   ├── 07_ThuTuc_StoredProcedures.sql     # 5 Thu tuc luu tru xu ly du lieu
│   ├── 08_GiaoDich_Transactions_Concurrency.sql # 5 Giao dich ACID va kiem soat tranh chap
│   ├── 09_BaoMat_PhanQuyen_Roles.sql      # 4 Logins, 4 Roles va ma tran Least Privilege
│   └── 10_KichBan_PhucHoiSuCo_Recovery.sql# Kich ban sao luu va phuc hoi Point-in-time
│
├── frontend\                              # Giao dien nguoi dung React.js (Vite)
│   ├── src\
│   │   ├── api\                           # apiClient.js ket noi REST API
│   │   ├── screens\                       # 5 Man hinh chuyen nghiep day du
│   │   │   ├── LoginScreen.jsx            # Man hinh dang nhap RBAC
│   │   │   ├── ProductScreen.jsx          # Quan ly san pham & tim kiem nang cao
│   │   │   ├── OrganizationScreen.jsx     # Chi nhanh, Cay nhan su & Khach hang VIP
│   │   │   ├── OrderScreen.jsx            # Don hang, In hoa don & Giu cho ton kho
│   │   │   └── ReportScreen.jsx           # Bao cao ton kho xep hang, Doanh thu, KPI
│   │   ├── App.jsx                        # Layout Sidebar Slate Dark va Topbar Pure White
│   │   ├── index.css                      # Bang mau thiet ke chuan do nguoi dung quy dinh
│   │   └── main.jsx
│   ├── vite.config.js                     # Cau hinh Proxy va bind host 0.0.0.0
│   └── package.json
│
├── docker-compose.yml                     # Cau hinh khoi dong SQL Server 2022 tren cong 11433
├── start.ps1                              # Script PowerShell khoi chay 1-click toan bo he thong
├── package.json                           # Root package.json quan ly lenh chung
└── README.md                              # Tai lieu huong dan ky thuat du an
```
