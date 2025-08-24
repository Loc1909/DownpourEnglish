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
- **React.js**: Xây dựng giao diện người dùng
- **Chart.js**: Thư viện biểu đồ tương tác
- **Axios**: HTTP client cho việc gọi API

### Authentication & Cloud
- **Firebase Auth**: Xác thực người dùng và đăng nhập Google

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống
- Python
- Node.js
- MySQL
- npm hoặc yarn

### Backend Setup
```bash
# Clone repository
git clone <repository-url>
cd backend

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


## 📝 License

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## 📞 Liên hệ

- Email: 93.nguyentanloc2018@gmail.com
- GitHub: [Loc1909](https://github.com/Loc1909)
- LinkedIn: [Your Name](https://www.linkedin.com/in/locnguyen-a60502308/)

---

⭐ Nếu dự án này hữu ích, hãy cho một star để ủng hộ nhé!
