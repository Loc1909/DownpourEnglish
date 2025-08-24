#!/usr/bin/env python
"""
Script test để kiểm tra hệ thống thành tích
"""

import os
import sys
import django

# Thêm đường dẫn backend vào Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import User, Achievement, UserAchievement
from api.achievement_service import AchievementService

def test_achievement_system():
    """Test hệ thống thành tích"""
    
    print("🧪 Bắt đầu test hệ thống thành tích...")
    print("=" * 50)
    
    # 1. Kiểm tra dữ liệu thành tích
    print("\n1. Kiểm tra dữ liệu thành tích:")
    achievements = Achievement.objects.filter(is_active=True)
    print(f"   Tổng số thành tích: {achievements.count()}")
    
    for achievement in achievements:
        print(f"   • {achievement.name} ({achievement.achievement_type}) - {achievement.points} điểm")
    
    # 2. Kiểm tra user đầu tiên
    print("\n2. Kiểm tra user đầu tiên:")
    try:
        first_user = User.objects.first()
        if first_user:
            print(f"   User: {first_user.username}")
            print(f"   Điểm hiện tại: {first_user.total_points}")
            
            # Kiểm tra thành tích đã đạt
            user_achievements = UserAchievement.objects.filter(user=first_user)
            print(f"   Số thành tích đã đạt: {user_achievements.count()}")
            
            for ua in user_achievements:
                print(f"     ✓ {ua.achievement.name} - {ua.achievement.points} điểm")
                
        else:
            print("   Không có user nào trong database")
            
    except Exception as e:
        print(f"   Lỗi: {e}")
    
    # 3. Test trao thành tích đăng ký
    print("\n3. Test trao thành tích đăng ký:")
    try:
        if first_user:
            # Kiểm tra xem user đã có thành tích đăng ký chưa
            registration_achievement = Achievement.objects.get(
                name='Người dùng đầu tiên',
                achievement_type='milestone'
            )
            
            existing_ua = UserAchievement.objects.filter(
                user=first_user,
                achievement=registration_achievement
            ).first()
            
            if existing_ua:
                print(f"   ✓ User đã có thành tích: {registration_achievement.name}")
                print(f"     Đạt được lúc: {existing_ua.earned_at}")
            else:
                print(f"   ⚠ User chưa có thành tích: {registration_achievement.name}")
                
                # Thử trao thành tích
                print("   Đang trao thành tích...")
                new_achievement = AchievementService.award_registration_achievement(first_user)
                
                if new_achievement:
                    print(f"   ✓ Đã trao thành tích: {new_achievement.name}")
                    first_user.refresh_from_db()
                    print(f"   Điểm mới: {first_user.total_points}")
                else:
                    print("   ❌ Không thể trao thành tích")
                    
        else:
            print("   Không có user để test")
            
    except Exception as e:
        print(f"   Lỗi: {e}")
    
    # 4. Test kiểm tra thành tích
    print("\n4. Test kiểm tra thành tích:")
    try:
        if first_user:
            new_achievements = AchievementService.check_and_award_achievements(first_user)
            print(f"   Số thành tích mới: {len(new_achievements)}")
            
            for achievement in new_achievements:
                print(f"     ✓ {achievement.name} - {achievement.points} điểm")
                
        else:
            print("   Không có user để test")
            
    except Exception as e:
        print(f"   Lỗi: {e}")
    
    # 5. Kiểm tra cuối cùng
    print("\n5. Kiểm tra cuối cùng:")
    try:
        if first_user:
            first_user.refresh_from_db()
            print(f"   User: {first_user.username}")
            print(f"   Điểm cuối: {first_user.total_points}")
            
            final_user_achievements = UserAchievement.objects.filter(user=first_user)
            print(f"   Tổng thành tích: {final_user_achievements.count()}")
            
            for ua in final_user_achievements:
                print(f"     ✓ {ua.achievement.name} - {ua.achievement.points} điểm")
                
        else:
            print("   Không có user để kiểm tra")
            
    except Exception as e:
        print(f"   Lỗi: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Test hoàn thành!")

if __name__ == '__main__':
    test_achievement_system()
