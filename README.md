# DownpourEnglish

Nền tảng học tiếng Anh kết hợp flashcard, mini‑game, có tích hợp AI, giúp việc học thú vị và hiệu quả.

## 🌟 Tính năng chính

### 📚 Hệ thống học tập
- **Flashcard cá nhân**: Tạo và quản lý bộ thẻ học từ vựng riêng
- **Thư viện flashcard công khai**: Truy cập và sử dụng các bộ flashcard do cộng đồng chia sẻ
- **Lưu trữ cá nhân**: Lưu các bộ flashcard yêu thích về tài khoản
- **Theo dõi tiến trình**: Ghi nhận từ đã học, từ đang gặp khó khăn và tiến độ học tập

### 🎮 Mini Games
- **Ghép từ nhanh**: Trò chơi nối tiếng Việt với tiếng Anh
- **Guess the Word**: Đoán từ tiếng Anh từ nghĩa tiếng Việt
- **Câu đố ô chữ**: Giải ô chữ với gợi ý thông minh

### 🤖 AI
- **Gợi ý bộ flashcard theo chủ đề**


### 📊 Khác
- **Biểu đồ tiến độ** với Chart.js
- **Đăng nhập Google** qua Firebase Auth
- **Thành tích & Huy hiệu** tạo động lực

## 🧱 Kiến trúc thư mục (rút gọn)
```
DownpourEnglish/
├─ backend/            # Django + DRF, MySQL
│  ├─ api/             # Apps, models, views, serializers
│  ├─ backend/         # Cấu hình Django (settings, urls, asgi, wsgi)
│  ├─ firebase-credentials.json
│  ├─ logs/django.log
│  └─ requirements.txt
└─ frontend/           # React (CRA), TypeScript, Tailwind
   ├─ src/
   ├─ public/
   └─ package.json
```

## 🛠️ Công nghệ

- **Backend**: Django 5, Django REST Framework; MySQL;
  Cloudinary lưu media; Firebase Admin SDK.
- **Frontend**: React 19 (CRA), TypeScript, Tailwind, Axios, React Router, Chart.js.

## ⚙️ Biến môi trường (Backend)
Tạo file `backend/.env` (cùng cấp với `manage.py`).

```env
# Django
SECRET_KEY=your_secret_key
DEBUG=True

# Database (MySQL)
DB_NAME=downpour
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=3306

# Firebase (client config dùng cho xác thực)
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_MEASUREMENT_ID=...

# Firebase Admin
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json

# Cloudinary (media)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Email (tùy chọn)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your_email
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=your_email
```

Lưu ý: `frontend/package.json` đã đặt `proxy` tới `http://localhost:8000` để chuyển tiếp API trong môi trường dev.

## 🔧 Thiết lập và chạy

### 1) Backend (Django)
```bash
# Clone dự án
git clone <repository-url>
cd DownpourEnglish/backend

# Tạo và kích hoạt virtual env
python -m venv venv

# Windows PowerShell
./venv/Scripts/Activate.ps1
# Hoặc CMD: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Cài dependencies
pip install -r requirements.txt

# Tạo file .env (như mẫu ở trên)

# Khởi tạo DB
python manage.py migrate

# (Tùy chọn) tạo superuser
python manage.py createsuperuser

# Chạy server
python manage.py runserver 0.0.0.0:8000
```

Mặc định CORS cho `http://localhost:3000`. Log sẽ ghi vào `backend/logs/django.log`.

### 2) Frontend (React)
```bash
cd ../frontend
npm install
npm start
```

CRA dev server chạy ở `http://localhost:3000`, tự proxy API sang `http://localhost:8000`.

## 🧪 Kiểm thử nhanh
- Truy cập Swagger: `http://localhost:8000/swagger/` (nếu bật `drf_yasg`).
- Đăng nhập Google qua Firebase (frontend) để lấy token gửi kèm header `firebase-token` ở API.

## 📡 API Endpoints

Base URL (dev): `http://localhost:8000/`

Lưu ý chung:
- Một số endpoint yêu cầu xác thực qua Token (DRF Token) hoặc Firebase token ở header `firebase-token` tùy cấu hình middleware/`DEFAULT_AUTHENTICATION_CLASSES`.
- Các endpoint theo chuẩn REST từ router của DRF. Dưới đây nêu các đường dẫn chính và action bổ sung.

### Chủ đề (Topics)
- GET `/topics/` — danh sách chủ đề
- POST `/topics/` — tạo chủ đề (admin)
- GET `/topics/{id}/` — chi tiết chủ đề
- PATCH `/topics/{id}/` — cập nhật (admin)
- DELETE `/topics/{id}/` — xóa (admin)
- GET `/topics/{id}/flashcard-sets/` — bộ thẻ của chủ đề
- GET `/topics/{id}/ai-suggestions/?limit=10` — gợi ý bộ thẻ bằng AI

### Bộ flashcard (Flashcard Sets)
- GET `/flashcard-sets/?q=&topic_id=&difficulty=&creator_id=` — lọc/tìm kiếm
- GET `/flashcard-sets/{id}/` — chi tiết (tự động chọn serializer chi tiết)
- POST `/flashcard-sets/` — tạo (đăng nhập)
- PATCH `/flashcard-sets/{id}/` — cập nhật (creator hoặc admin)
- DELETE `/flashcard-sets/{id}/` — xóa (creator hoặc admin)
- GET `/flashcard-sets/{id}/flashcards/` — liệt kê thẻ trong bộ
- POST `/flashcard-sets/{id}/save/` — lưu/hủy lưu bộ
- POST `/flashcard-sets/{id}/favorite/` — bật/tắt yêu thích
- POST `/flashcard-sets/{id}/rate/` — đánh giá `rating` 1..5
- GET `/flashcard-sets/favorites/` — danh sách bộ yêu thích (của user)
- GET `/flashcard-sets/admin_list/` — danh sách tất cả (admin)

### Flashcards
- POST `/flashcards/` — tạo thẻ (đăng nhập)
- PATCH `/flashcards/{id}/` — cập nhật (đăng nhập)
- DELETE `/flashcards/{id}/` — xóa (đăng nhập)
- POST `/flashcards/{id}/study/` — cập nhật tiến trình học với body: `is_correct`, `difficulty_rating`

### Người dùng (Users)
- POST `/users/` — đăng ký (hỗ trợ upload avatar)
- POST `/users/login/` — đăng nhập username/password (trả về token)
- POST `/users/logout/` — đăng xuất (xóa token)
- GET `/users/current_user/` — lấy thông tin người dùng hiện tại
- PATCH `/users/current_user/` — cập nhật một số trường hồ sơ
- GET `/users/admin_list/` — danh sách user (admin)
- PATCH `/users/{id}/admin_update_role/` — cập nhật role (admin)
- GET `/users/study_summary/` — tổng kết học tập của user hiện tại
- GET `/users/saved_sets/` — các bộ flashcard đã lưu

### Tiến trình học (Progress)
- GET `/progress/?is_difficult=true&is_learned=true` — danh sách tiến trình của user, hỗ trợ filter
- POST `/progress/{id}/mark_difficult/` — toggle trạng thái từ khó

### Phiên chơi game (Game Sessions)
- POST `/game-sessions/` — tạo phiên chơi, tự cộng điểm, cập nhật thống kê ngày
- GET `/game-sessions/` — danh sách phiên của chính user
- GET `/game-sessions/leaderboard/?game_type=` — bảng xếp hạng

### Thành tích (Achievements)
- GET `/achievements/` — danh sách thành tích (kèm tiến trình nếu đã đăng nhập)
- GET `/achievements/my_achievements/` — thành tích đã đạt của user hiện tại
- POST `/achievements/check_achievements/` — kiểm tra/trao thành tích mới

### Thống kê ngày (Daily Stats)
- GET `/daily-stats/?days=7` — thống kê trong khoảng ngày, mặc định 7

### Phản hồi người dùng (Feedback)
- GET `/feedback/` — danh sách phản hồi của chính user
- POST `/feedback/` — gửi phản hồi

### Khác
- GET `/health/` — health check
- Swagger UI: `/swagger/` — tài liệu tương tác

## 📄 License
Dự án phân phối theo giấy phép MIT. Xem `LICENSE`.

## 👤 Liên hệ
- Email: 93.nguyentanloc2018@gmail.com
- GitHub: [Loc1909](https://github.com/Loc1909)
- LinkedIn: [locnguyen-a60502308](https://www.linkedin.com/in/locnguyen-a60502308/)

---
Nếu dự án hữu ích, hãy ⭐ để ủng hộ!
