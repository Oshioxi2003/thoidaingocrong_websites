# 🚀 Hướng Dẫn Deploy Website Thời Đại Ngọc Rồng

> **Stack:** Vite + React (Frontend) | Express.js (Backend, port 3001) | MySQL
>
> **Mục tiêu:** Deploy trên VPS Linux dùng **aaPanel** + **PM2** + **Apache** (reverse proxy)

---

## 📋 Yêu Cầu

- VPS Linux (Ubuntu/CentOS) đã cài **aaPanel**
- **Node.js** ≥ 18 (cài qua aaPanel → App Store → Node.js)
- **MySQL** (cài qua aaPanel → App Store → MySQL)
- **Apache** (cài qua aaPanel → App Store → Apache)
- **PM2** (cài global: `npm install -g pm2`)

---

## 1️⃣ Chuẩn Bị Database

### Tạo database trên aaPanel

1. Vào **aaPanel** → **Databases** → **Add database**
2. Điền thông tin:
   - **Database name:** `nro`
   - **Username:** `nro_user` (hoặc tuỳ ý)
   - **Password:** đặt mật khẩu mạnh
   - **Access:** `Local server` (127.0.0.1)
3. Nhấn **Submit**

### Import database

```bash
# Import file SQL vào database
mysql -u nro_user -p nro < /path/to/database/nro.sql
```

Hoặc dùng **phpMyAdmin** trên aaPanel để import.

---

## 2️⃣ Upload Source Code Lên VPS

### Cách 1: Git clone

```bash
cd /www/wwwroot
git clone <your-repo-url> thoidaingocrong
cd thoidaingocrong
```

### Cách 2: Upload qua aaPanel File Manager

1. Vào **aaPanel** → **Files** → chọn thư mục `/www/wwwroot/`
2. Upload file `.zip` project → giải nén

---

## 3️⃣ Cấu Hình Environment

Tạo file `.env` tại thư mục gốc project:

```bash
cd /www/wwwroot/thoidaingocrong
nano .env
```

Nội dung:

```env
# Database MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=nro_user
DB_PASSWORD=your_strong_password
DB_NAME=nro

# Server
SERVER_PORT=3001

# JWT
JWT_SECRET=your_random_secret_key_here

# Bank Deposit (API sieuthicode.net)
BANK_NAME=ACB
BANK_ACCOUNT_NAME=DINH THI NGOC BICH
BANK_ACCOUNT_NUMBER=48932127
BANK_API_TOKEN=your_token_here
```

> ⚠️ **Lưu ý:** Thay đổi `DB_PASSWORD`, `JWT_SECRET`, `BANK_API_TOKEN` theo thông tin thực tế của bạn.

---

## 4️⃣ Cài Dependencies & Build Frontend

```bash
cd /www/wwwroot/thoidaingocrong

# Cài dependencies
npm install

# Build frontend (tạo thư mục dist/)
npm run build
```

Sau khi build xong, thư mục `dist/` sẽ chứa file HTML/CSS/JS tĩnh. Server Express sẽ tự serve thư mục này khi `NODE_ENV=production`.

---

## 5️⃣ Chạy Backend Bằng PM2

### Tạo file cấu hình PM2

Tạo file `ecosystem.config.cjs` tại thư mục gốc project:

```bash
nano /www/wwwroot/thoidaingocrong/ecosystem.config.cjs
```

Nội dung:

```javascript
module.exports = {
  apps: [
    {
      name: 'thoidaingocrong',
      script: 'server/server.js',
      cwd: '/www/wwwroot/thoidaingocrong',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        SERVER_PORT: 3001,
      },
      // Auto restart nếu crash
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // Log
      error_file: '/www/wwwroot/thoidaingocrong/logs/error.log',
      out_file: '/www/wwwroot/thoidaingocrong/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
```

### Khởi chạy PM2

```bash
cd /www/wwwroot/thoidaingocrong

# Tạo thư mục logs
mkdir -p logs

# Khởi chạy
pm2 start ecosystem.config.cjs

# Kiểm tra trạng thái
pm2 status

# Xem logs real-time
pm2 logs thoidaingocrong

# Lưu danh sách PM2 (tự start khi reboot VPS)
pm2 save
pm2 startup
```

### Hoặc chạy bằng aaPanel Node Project Manager

1. Vào **aaPanel** → **Website** → **Node Project**
2. Nhấn **Add Node project**
3. Điền thông tin:
   - **Path:** `/www/wwwroot/thoidaingocrong`
   - **Name:** `thoidaingocrong`
   - **Run opt:** `Custom Command` → nhập `node server/server.js`
   - **Port:** `3001`
   - **User:** `www`
   - **Node:** chọn version ≥ 18
4. Nhấn **Confirm**

> 💡 Nếu dùng **aaPanel Node Project Manager**, nó sẽ tự dùng PM2 bên trong để quản lý process. Không cần chạy `pm2 start` thủ công nữa.

---

## 6️⃣ Cấu Hình Apache Reverse Proxy

### Tạo website trên aaPanel

1. Vào **aaPanel** → **Website** → **Add site**
2. Điền thông tin:
   - **Domain:** `yourdomain.com` (hoặc IP:port)
   - **PHP Version:** `Pure Static` (không cần PHP)
   - **Root directory:** `/www/wwwroot/thoidaingocrong/dist`
3. Nhấn **Submit**

### Cấu hình Reverse Proxy

1. Vào site vừa tạo → **Reverse proxy** (hoặc **Conf** để chỉnh Apache config)
2. Nhấn **Add reverse proxy**
   - **Proxy name:** `api`
   - **Target URL:** `http://127.0.0.1:3001`
   - **Send domain:** `$host`
3. Nhấn **Submit**

### Hoặc chỉnh trực tiếp file Apache VirtualHost

Nếu cần tuỳ chỉnh chi tiết, vào **Conf** của site và thêm cấu hình:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    DocumentRoot /www/wwwroot/thoidaingocrong/dist

    # Bật các module cần thiết
    # (đã enable sẵn trên aaPanel: proxy, proxy_http, rewrite)

    # Reverse proxy: /api, /download, /media → backend Express (port 3001)
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:3001/api
    ProxyPassReverse /api http://127.0.0.1:3001/api

    ProxyPass /download http://127.0.0.1:3001/download
    ProxyPassReverse /download http://127.0.0.1:3001/download

    ProxyPass /media http://127.0.0.1:3001/media
    ProxyPassReverse /media http://127.0.0.1:3001/media

    # Frontend SPA: mọi route khác → index.html
    <Directory /www/wwwroot/thoidaingocrong/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    RewriteEngine On
    # Không rewrite nếu file/thư mục thực sự tồn tại
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-f
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-d
    # Không rewrite /api, /download, /media (đã proxy)
    RewriteCond %{REQUEST_URI} !^/api
    RewriteCond %{REQUEST_URI} !^/download
    RewriteCond %{REQUEST_URI} !^/media
    # Redirect tất cả về index.html (React SPA routing)
    RewriteRule ^ /index.html [L]

    # Logs
    ErrorLog /www/wwwlogs/thoidaingocrong-error.log
    CustomLog /www/wwwlogs/thoidaingocrong-access.log combined
</VirtualHost>
```

> ⚠️ **Quan trọng:** Đảm bảo đã enable các module Apache:
> ```bash
> a2enmod proxy proxy_http rewrite
> systemctl restart apache2
> ```

---

## 7️⃣ Cấu Hình SSL (HTTPS) — Khuyến Nghị

1. Vào **aaPanel** → **Website** → chọn site → **SSL**
2. Chọn **Let's Encrypt** → nhập domain → **Apply**
3. Bật **Force HTTPS**

Hoặc thêm VirtualHost SSL thủ công:

```apache
<VirtualHost *:443>
    ServerName yourdomain.com

    SSLEngine on
    SSLCertificateFile /path/to/fullchain.pem
    SSLCertificateKeyFile /path/to/privkey.pem

    # ...giống cấu hình port 80 ở trên...
    DocumentRoot /www/wwwroot/thoidaingocrong/dist
    ProxyPreserveHost On
    ProxyPass /api http://127.0.0.1:3001/api
    ProxyPassReverse /api http://127.0.0.1:3001/api
    ProxyPass /download http://127.0.0.1:3001/download
    ProxyPassReverse /download http://127.0.0.1:3001/download
    ProxyPass /media http://127.0.0.1:3001/media
    ProxyPassReverse /media http://127.0.0.1:3001/media

    <Directory /www/wwwroot/thoidaingocrong/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    RewriteEngine On
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-f
    RewriteCond %{DOCUMENT_ROOT}%{REQUEST_URI} !-d
    RewriteCond %{REQUEST_URI} !^/api
    RewriteCond %{REQUEST_URI} !^/download
    RewriteCond %{REQUEST_URI} !^/media
    RewriteRule ^ /index.html [L]
</VirtualHost>
```

---

## 8️⃣ Kiểm Tra & Xác Nhận

```bash
# 1. Kiểm tra PM2 đang chạy
pm2 status

# 2. Kiểm tra backend respond
curl http://127.0.0.1:3001/api/posts

# 3. Kiểm tra Apache config hợp lệ
apachectl configtest

# 4. Restart Apache
systemctl restart apache2   # Ubuntu
systemctl restart httpd     # CentOS

# 5. Truy cập website
# http://yourdomain.com hoặc http://YOUR_VPS_IP
```

---

## 🔧 Các Lệnh PM2 Thường Dùng

| Lệnh | Mô tả |
|-------|--------|
| `pm2 status` | Xem trạng thái các app |
| `pm2 logs thoidaingocrong` | Xem log real-time |
| `pm2 restart thoidaingocrong` | Restart app |
| `pm2 stop thoidaingocrong` | Dừng app |
| `pm2 delete thoidaingocrong` | Xóa app khỏi PM2 |
| `pm2 monit` | Monitor CPU/RAM |
| `pm2 save` | Lưu danh sách (auto start khi reboot) |

---

## 🔄 Cập Nhật Code (Re-deploy)

```bash
cd /www/wwwroot/thoidaingocrong

# Pull code mới
git pull origin main

# Cài lại dependencies (nếu có thay đổi)
npm install

# Build lại frontend
npm run build

# Restart backend
pm2 restart thoidaingocrong
```

---

## 🐛 Xử Lý Lỗi Thường Gặp

### Lỗi 502 Bad Gateway
- Backend chưa chạy → `pm2 start ecosystem.config.cjs`
- Sai port → kiểm tra `SERVER_PORT` trong `.env` và proxy config

### Lỗi kết nối database
- Kiểm tra `.env` đúng thông tin DB
- Kiểm tra MySQL đang chạy: `systemctl status mysql`
- Kiểm tra quyền user DB: `GRANT ALL ON nro.* TO 'nro_user'@'localhost';`

### Frontend trắng trang hoặc 404
- Chưa build: `npm run build`
- Apache chưa rewrite đúng → kiểm tra `RewriteRule` và `a2enmod rewrite`
- Thiếu `AllowOverride All` trong `<Directory>`

### Lỗi CORS
- Trong production, frontend và API chạy cùng domain qua reverse proxy → không cần CORS
- Nếu vẫn lỗi, kiểm tra lại proxy config `/api` → `http://127.0.0.1:3001/api`

### Upload ảnh lỗi
- Kiểm tra quyền thư mục `media/`: `chown -R www:www media/ && chmod -R 755 media/`

---

## 📁 Cấu Trúc Deploy Trên Server

```
/www/wwwroot/thoidaingocrong/
├── .env                    ← biến môi trường (KHÔNG commit lên git)
├── ecosystem.config.cjs    ← cấu hình PM2
├── dist/                   ← frontend build (serve bởi Apache)
├── server/
│   ├── server.js           ← Express backend (PM2 chạy file này)
│   └── db.js               ← kết nối MySQL
├── media/                  ← thư mục upload ảnh
├── download/               ← file download (APK, RAR...)
├── logs/                   ← PM2 logs
└── node_modules/
```
