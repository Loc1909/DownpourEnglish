"""
Service để xử lý logic trao thành tích tự động cho user
"""
from django.db.models import Count, Sum, Q, F, Max
from django.utils import timezone
from datetime import timedelta
from .models import (
    User, Achievement, UserAchievement, UserProgress, 
    GameSession, SavedFlashcardSet, DailyStats
)


class AchievementService:
    """Service xử lý thành tích"""
    
    @staticmethod
    def check_and_award_achievements(user):
        """
        Kiểm tra và trao thành tích cho user
        Trả về danh sách thành tích mới đạt được
        """
        new_achievements = []
        
        # Kiểm tra các loại thành tích khác nhau
        new_achievements.extend(AchievementService._check_learning_achievements(user))
        new_achievements.extend(AchievementService._check_gaming_achievements(user))
        new_achievements.extend(AchievementService._check_streak_achievements(user))
        new_achievements.extend(AchievementService._check_milestone_achievements(user))
        
        return new_achievements
    
    @staticmethod
    def _check_learning_achievements(user):
        """Kiểm tra thành tích học tập"""
        new_achievements = []
        
        # Thành tích học từ vựng mới
        new_words_count = UserProgress.objects.filter(
            user=user, 
            times_reviewed__gte=1
        ).count()
        
        # Kiểm tra và trao thành tích
        learning_achievements = Achievement.objects.filter(
            achievement_type='learning',
            is_active=True
        )
        
        for achievement in learning_achievements:
            if AchievementService._should_award_achievement(user, achievement):
                # Chỉ kiểm tra thành tích học từ vựng
                if 'từ vựng' in achievement.description:
                    progress_value = new_words_count
                    
                    if progress_value >= achievement.requirement_value:
                        if AchievementService._award_achievement(user, achievement, progress_value):
                            new_achievements.append(achievement)
        
        return new_achievements
    
    @staticmethod
    def _check_gaming_achievements(user):
        """Kiểm tra thành tích chơi game"""
        new_achievements = []
        
        # Số ván game đã chơi
        total_games = GameSession.objects.filter(user=user).count()
        
        # Kiểm tra và trao thành tích
        gaming_achievements = Achievement.objects.filter(
            achievement_type='gaming',
            is_active=True
        )
        
        for achievement in gaming_achievements:
            if AchievementService._should_award_achievement(user, achievement):
                # Chỉ kiểm tra thành tích số ván game
                if 'ván game' in achievement.description:
                    progress_value = total_games
                    
                    if progress_value >= achievement.requirement_value:
                        if AchievementService._award_achievement(user, achievement, progress_value):
                            new_achievements.append(achievement)
        
        return new_achievements
    
    @staticmethod
    def _check_streak_achievements(user):
        """Kiểm tra thành tích chuỗi ngày"""
        new_achievements = []
        
        # Tính chuỗi ngày học liên tiếp
        current_streak = AchievementService._calculate_current_streak(user)
        
        # Kiểm tra và trao thành tích
        streak_achievements = Achievement.objects.filter(
            achievement_type='streak',
            is_active=True
        )
        
        for achievement in streak_achievements:
            if AchievementService._should_award_achievement(user, achievement):
                if current_streak >= achievement.requirement_value:
                    if AchievementService._award_achievement(user, achievement, current_streak):
                        new_achievements.append(achievement)
        
        return new_achievements
    
    @staticmethod
    def _check_milestone_achievements(user):
        """Kiểm tra thành tích cột mốc"""
        new_achievements = []
        
        # Số bộ flashcard đã lưu
        saved_sets_count = SavedFlashcardSet.objects.filter(user=user).count()
        
        # Kiểm tra và trao thành tích
        milestone_achievements = Achievement.objects.filter(
            achievement_type='milestone',
            is_active=True
        )
        
        for achievement in milestone_achievements:
            if AchievementService._should_award_achievement(user, achievement):
                progress_value = 0
                
                if 'bộ flashcard' in achievement.description:
                    if 'lưu' in achievement.description:
                        progress_value = saved_sets_count
                elif 'tài khoản' in achievement.description:
                    progress_value = 1  # Đã đăng ký
                
                if progress_value >= achievement.requirement_value:
                    if AchievementService._award_achievement(user, achievement, progress_value):
                        new_achievements.append(achievement)
        
        return new_achievements
    
    @staticmethod
    def _calculate_current_streak(user):
        """Tính chuỗi ngày học liên tiếp hiện tại"""
        today = timezone.now().date()
        current_streak = 0
        
        # Kiểm tra từ hôm nay trở về trước
        for i in range(365):  # Kiểm tra tối đa 1 năm
            check_date = today - timedelta(days=i)
            
            # Kiểm tra xem ngày đó có hoạt động học tập không
            has_activity = (
                DailyStats.objects.filter(
                    user=user, 
                    date=check_date,
                    cards_studied__gt=0
                ).exists() or
                UserProgress.objects.filter(
                    user=user,
                    last_reviewed__date=check_date
                ).exists()
            )
            
            if has_activity:
                current_streak += 1
            else:
                break
        
        return current_streak
    
    @staticmethod
    def _should_award_achievement(user, achievement):
        """Kiểm tra xem user có nên được trao thành tích này không"""
        # Kiểm tra xem user đã có thành tích này chưa
        return not UserAchievement.objects.filter(
            user=user, 
            achievement=achievement
        ).exists()
    
    @staticmethod
    def _award_achievement(user, achievement, progress_value):
        """Trao thành tích cho user"""
        try:
            # Tạo UserAchievement
            user_achievement = UserAchievement.objects.create(
                user=user,
                achievement=achievement,
                progress_value=progress_value
            )
            
            # Cộng điểm cho user
            user.total_points += achievement.points
            user.save()
            
            return True
        except Exception as e:
            print(f"Lỗi trao thành tích: {e}")
            return False
    
    @staticmethod
    def award_registration_achievement(user):
        """Trao thành tích đăng ký tài khoản"""
        try:
            achievement = Achievement.objects.get(
                name='Người dùng đầu tiên',
                achievement_type='milestone'
            )
            
            if AchievementService._should_award_achievement(user, achievement):
                AchievementService._award_achievement(user, achievement, 1)
                return achievement
            
        except Achievement.DoesNotExist:
            pass
        
        return None
    
    @staticmethod
    def get_user_progress_for_achievement(user, achievement):
        """Lấy tiến trình của user cho một thành tích cụ thể"""
        try:
            user_achievement = UserAchievement.objects.get(
                user=user, 
                achievement=achievement
            )
            return user_achievement.progress_value
        except UserAchievement.DoesNotExist:
            # Tính toán tiến trình hiện tại
            return AchievementService._calculate_progress_for_achievement(user, achievement)
    
    @staticmethod
    def _calculate_progress_for_achievement(user, achievement):
        """Tính toán tiến trình hiện tại cho một thành tích"""
        if achievement.achievement_type == 'learning':
            if 'từ vựng' in achievement.description:
                return UserProgress.objects.filter(
                    user=user, 
                    times_reviewed__gte=1
                ).count()
        
        elif achievement.achievement_type == 'gaming':
            if 'ván game' in achievement.description:
                return GameSession.objects.filter(user=user).count()
        
        elif achievement.achievement_type == 'streak':
            return AchievementService._calculate_current_streak(user)
        
        elif achievement.achievement_type == 'milestone':
            if 'bộ flashcard' in achievement.description:
                if 'lưu' in achievement.description:
                    return SavedFlashcardSet.objects.filter(user=user).count()
            elif 'tài khoản' in achievement.description:
                return 1
        
        return 0
