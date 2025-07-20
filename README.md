# DownpourEnglish

Một hệ thống học tiếng Anh toàn diện kết hợp flashcard, mini games và trợ lý AI để tạo trải nghiệm học tập thú vị và hiệu quả.

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

### 🤖 Trợ lý AI
- **Gợi ý từ vựng**: Đề xuất từ mới theo chủ đề hoặc dựa trên lịch sử học
- **Tối ưu học tập**: Điều chỉnh nội dung học dựa trên phản hồi người dùng
- **Hỗ trợ cá nhân hóa**: Phân tích khả năng và đưa ra lộ trình học phù hợp

### 📊 Tính năng bổ sung
- **Biểu đồ tiến độ**: Sử dụng Chart.js để hiển thị trực quan quá trình học tập
- **Đăng nhập nhanh**: Tích hợp Firebase Auth hỗ trợ đăng nhập Google
- **Hệ thống phản hồi**: Thu thập feedback để cải thiện trải nghiệm học tập
- **Thành tích & Huy hiệu**: Động lực học tập qua các phần thưởng và cột mốc

## 🛠️ Công nghệ sử dụng

### Backend
- **Django**: Framework web Python mạnh mẽ
- **Django REST Framework**: Xây dựng API RESTful
- **MySQL**: Cơ sở dữ liệu quan hệ

### Frontend  
- **React.js**: Thư viện JavaScript để xây dựng giao diện người dùng
- **Chart.js**: Thư viện biểu đồ tương tác
- **Axios**: HTTP client cho việc gọi API

### Authentication & Cloud
- **Firebase Auth**: Xác thực người dùng và đăng nhập Google

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống
- Python 3.8+
- Node.js 14+
- MySQL 8.0+
- npm hoặc yarn

### Backend Setup
```bash
# Clone repository
git clone <repository-url>
cd english-learning-system

# Tạo virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Cài đặt dependencies
pip install -r requirements.txt

# Cấu hình database
cp .env.example .env
# Chỉnh sửa thông tin database trong .env

# Migration
python manage.py makemigrations
python manage.py migrate

# Tạo superuser
python manage.py createsuperuser

# Chạy server
python manage.py runserver
```

### Frontend Setup
```bash
# Di chuyển đến thư mục frontend
cd frontend

# Cài đặt dependencies
npm install

# Chạy development server
npm start
```

## 📁 Cấu trúc dự án

```
english-learning-system/
├── backend/
│   ├── apps/
│   │   ├── users/          # Quản lý người dùng
│   │   ├── flashcards/     # Flashcard system
│   │   ├── games/          # Mini games
│   │   ├── ai_assistant/   # AI features
│   │   └── analytics/      # Thống kê và báo cáo
│   ├── config/
│   ├── requirements.txt
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Các trang chính
│   │   ├── services/       # API calls
│   │   ├── utils/          # Utility functions
│   │   └── assets/         # Hình ảnh, CSS
│   ├── package.json
│   └── public/
└── README.md
```

## 🎯 API Endpoints

### Authentication
```
POST /api/auth/login/          # Đăng nhập
POST /api/auth/register/       # Đăng ký
POST /api/auth/logout/         # Đăng xuất
GET  /api/auth/user/           # Thông tin người dùng
```

### Flashcards
```
GET    /api/flashcards/        # Danh sách flashcards
POST   /api/flashcards/        # Tạo flashcard mới
GET    /api/flashcards/{id}/   # Chi tiết flashcard
PUT    /api/flashcards/{id}/   # Cập nhật flashcard
DELETE /api/flashcards/{id}/   # Xóa flashcard
```

### Games
```
GET  /api/games/word-match/    # Trò chơi ghép từ
POST /api/games/word-match/    # Gửi kết quả
GET  /api/games/guess-word/    # Guess the word
POST /api/games/crossword/     # Câu đố ô chữ
```

### AI Assistant
```
POST /api/ai/suggest-words/    # Gợi ý từ vựng
POST /api/ai/feedback/         # Gửi feedback
GET  /api/ai/progress/         # Phân tích tiến độ
```

## 🤝 Đóng góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📝 License

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## 📞 Liên hệ

- Email: your-email@example.com
- GitHub: [@your-username](https://github.com/your-username)
- LinkedIn: [Your Name](https://linkedin.com/in/your-profile)

---

⭐ Nếu dự án này hữu ích, hãy cho một star để ủng hộ nhé!
