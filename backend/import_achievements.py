#!/usr/bin/env python
"""
Script để import dữ liệu thành tích vào Django
Chạy script này sau khi đã setup Django và database
"""

import os
import sys
import django

# Thêm đường dẫn backend vào Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Achievement, UserAchievement

def import_achievements():
    """Import dữ liệu thành tích vào database"""
    
    # Xóa dữ liệu cũ
    print("Đang xóa dữ liệu thành tích cũ...")
    UserAchievement.objects.all().delete()
    Achievement.objects.all().delete()
    
    # Dữ liệu thành tích mới (5 thành tích cơ bản)
    achievements_data = [
        {
            'name': 'Người dùng đầu tiên',
            'description': 'Đăng ký tài khoản thành công',
            'icon': 'shield-check',
            'achievement_type': 'milestone',
            'requirement_value': 1,
            'points': 10,
            'is_active': True,
            'rarity': 'common'
        },
        {
            'name': 'Học viên chăm chỉ',
            'description': 'Học được 20 từ vựng đầu tiên',
            'icon': 'book-open',
            'achievement_type': 'learning',
            'requirement_value': 20,
            'points': 25,
            'is_active': True,
            'rarity': 'common'
        },
        {
            'name': 'Người chơi mới',
            'description': 'Chơi 3 ván game đầu tiên',
            'icon': 'puzzle-piece',
            'achievement_type': 'gaming',
            'requirement_value': 3,
            'points': 15,
            'is_active': True,
            'rarity': 'common'
        },
        {
            'name': 'Bắt đầu thói quen',
            'description': 'Học liên tiếp 3 ngày',
            'icon': 'fire',
            'achievement_type': 'streak',
            'requirement_value': 3,
            'points': 25,
            'is_active': True,
            'rarity': 'common'
        },
        {
            'name': 'Người dùng tích cực',
            'description': 'Lưu 3 bộ flashcard đầu tiên',
            'icon': 'heart',
            'achievement_type': 'milestone',
            'requirement_value': 3,
            'points': 20,
            'is_active': True,
            'rarity': 'common'
        }
    ]
    
    # Tạo thành tích
    print("Đang tạo thành tích mới...")
    created_achievements = []
    
    for data in achievements_data:
        achievement, created = Achievement.objects.get_or_create(
            name=data['name'],
            defaults=data
        )
        
        if created:
            created_achievements.append(achievement)
            print(f"✓ Đã tạo thành tích: {achievement.name}")
        else:
            print(f"⚠ Thành tích đã tồn tại: {achievement.name}")
    
    # Hiển thị kết quả
    print(f"\n🎉 Hoàn thành! Đã tạo {len(created_achievements)} thành tích mới.")
    print(f"Tổng số thành tích trong database: {Achievement.objects.count()}")
    
    # Hiển thị danh sách thành tích
    print("\n📋 Danh sách thành tích:")
    for achievement in Achievement.objects.all().order_by('achievement_type', 'requirement_value'):
        print(f"  • {achievement.name} ({achievement.achievement_type}) - {achievement.points} điểm")

def main():
    """Hàm chính"""
    print("🚀 Bắt đầu import dữ liệu thành tích...")
    print("=" * 50)
    
    try:
        import_achievements()
        print("\n✅ Import thành công!")
        
    except Exception as e:
        print(f"\n❌ Lỗi: {str(e)}")
        print("Hãy kiểm tra:")
        print("1. Django đã được setup đúng chưa?")
        print("2. Database đã được migrate chưa?")
        print("3. Models đã được import đúng chưa?")
        sys.exit(1)

if __name__ == '__main__':
    main()
