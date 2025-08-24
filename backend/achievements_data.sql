-- Dữ liệu thành tích cho DownpourEnglish
-- Import vào MySQL để có dữ liệu thành tích

-- Xóa dữ liệu cũ nếu có
DELETE FROM api_userachievement;
DELETE FROM api_achievement;

-- Reset auto increment
ALTER TABLE api_achievement AUTO_INCREMENT = 1;

-- Thêm dữ liệu thành tích (chỉ 5 thành tích cơ bản)
INSERT INTO api_achievement (name, description, icon, achievement_type, requirement_value, points, is_active, rarity) VALUES
-- 1. Thành tích đăng ký tài khoản
('Người dùng đầu tiên', 'Đăng ký tài khoản thành công', 'shield-check', 'milestone', 1, 10, 1, 'common'),

-- 2. Thành tích học từ vựng
('Học viên chăm chỉ', 'Học được 20 từ vựng đầu tiên', 'book-open', 'learning', 20, 25, 1, 'common'),

-- 3. Thành tích chơi game
('Người chơi mới', 'Chơi 3 ván game đầu tiên', 'puzzle-piece', 'gaming', 3, 15, 1, 'common'),

-- 4. Thành tích chuỗi ngày học
('Bắt đầu thói quen', 'Học liên tiếp 3 ngày', 'fire', 'streak', 3, 25, 1, 'common'),

-- 5. Thành tích lưu flashcard
('Người dùng tích cực', 'Lưu 3 bộ flashcard đầu tiên', 'heart', 'milestone', 3, 20, 1, 'common');

-- Hiển thị dữ liệu đã thêm
SELECT 
    id,
    name,
    achievement_type,
    requirement_value,
    points,
    rarity,
    is_active
FROM api_achievement 
ORDER BY achievement_type, requirement_value;
