# Hệ thống Thành tích - DownpourEnglish

## Tổng quan
Hệ thống thành tích tự động trao thưởng cho người dùng dựa trên các hoạt động học tập và sử dụng ứng dụng.

## 5 Thành tích cơ bản

### 1. Người dùng đầu tiên
- **Loại**: Milestone
- **Yêu cầu**: Đăng ký tài khoản
- **Điểm thưởng**: 10 điểm
- **Icon**: shield-check
- **Mô tả**: Đăng ký tài khoản thành công

### 2. Học viên chăm chỉ
- **Loại**: Learning
- **Yêu cầu**: Học được 20 từ vựng đầu tiên
- **Điểm thưởng**: 25 điểm
- **Icon**: book-open
- **Mô tả**: Học được 20 từ vựng đầu tiên

### 3. Người chơi mới
- **Loại**: Gaming
- **Yêu cầu**: Chơi 3 ván game đầu tiên
- **Điểm thưởng**: 15 điểm
- **Icon**: puzzle-piece
- **Mô tả**: Chơi 3 ván game đầu tiên

### 4. Bắt đầu thói quen
- **Loại**: Streak
- **Yêu cầu**: Học liên tiếp 3 ngày
- **Điểm thưởng**: 25 điểm
- **Icon**: fire
- **Mô tả**: Học liên tiếp 3 ngày

### 5. Người dùng tích cực
- **Loại**: Milestone
- **Yêu cầu**: Lưu 3 bộ flashcard đầu tiên
- **Điểm thưởng**: 20 điểm
- **Icon**: heart
- **Mô tả**: Lưu 3 bộ flashcard đầu tiên

## Cách hoạt động

### Trao thành tích tự động
Hệ thống sẽ tự động kiểm tra và trao thành tích khi:
- User đăng ký tài khoản
- User học flashcard (sau mỗi lần học)
- User chơi game (sau mỗi ván)
- User lưu flashcard set
- User đánh giá flashcard set

### Kiểm tra thủ công
User có thể kiểm tra thành tích mới bằng cách gọi API:
```
POST /api/achievements/check_achievements/
```

## Cài đặt

### 1. Import dữ liệu thành tích
```sql
-- Chạy file achievements_data.sql trong MySQL
mysql -u username -p database_name < achievements_data.sql
```

### 2. Khởi động backend
```bash
cd backend
python manage.py runserver
```

### 3. Kiểm tra API
```bash
# Lấy danh sách thành tích
GET /api/achievements/

# Lấy thành tích của user
GET /api/achievements/my_achievements/

# Kiểm tra thành tích mới
POST /api/achievements/check_achievements/
```

## Cấu trúc dữ liệu

### Bảng Achievement
- `name`: Tên thành tích
- `description`: Mô tả chi tiết
- `icon`: Icon hiển thị (tương ứng với Heroicons)
- `achievement_type`: Loại thành tích (learning, gaming, streak, milestone)
- `requirement_value`: Giá trị yêu cầu để đạt được
- `points`: Điểm thưởng
- `rarity`: Độ hiếm (common, uncommon, rare, epic, legendary)
- `is_active`: Trạng thái hoạt động

### Bảng UserAchievement
- `user`: User đạt được thành tích
- `achievement`: Thành tích đạt được
- `earned_at`: Thời gian đạt được
- `progress_value`: Giá trị tiến trình thực tế

## Tích hợp Frontend

Frontend đã được tích hợp sẵn để hiển thị:
- Danh sách tất cả thành tích
- Thành tích đã đạt được
- Tiến trình hướng tới thành tích
- Thông báo khi đạt thành tích mới

## Mở rộng

Để thêm thành tích mới:
1. Thêm vào bảng `Achievement`
2. Cập nhật logic trong `AchievementService`
3. Thêm icon tương ứng vào `ICON_MAP` trong frontend

## Troubleshooting

### Thành tích không được trao
- Kiểm tra `is_active = True` trong bảng Achievement
- Kiểm tra logic trong `AchievementService`
- Kiểm tra logs Django

### Icon không hiển thị
- Đảm bảo icon name khớp với `ICON_MAP` trong frontend
- Sử dụng icon từ Heroicons library
