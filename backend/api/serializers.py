from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from .models import (
    Topic, FlashcardSet, Flashcard, SavedFlashcardSet,
    UserProgress, GameSession, Achievement, UserAchievement,
    UserFeedback, DailyStats
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer cho User model"""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'display_name', 'avatar', 'total_points', 'date_joined']
        read_only_fields = ['id', 'total_points', 'date_joined']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer chi tiết cho profile user"""
    achievements_count = serializers.SerializerMethodField()
    sets_created = serializers.SerializerMethodField()
    sets_saved = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'display_name', 'avatar',
            'total_points', 'date_joined', 'achievements_count',
            'sets_created', 'sets_saved'
        ]
        read_only_fields = ['id', 'total_points', 'date_joined']

    def get_achievements_count(self, obj):
        return obj.userachievement_set.count()

    def get_sets_created(self, obj):
        return obj.flashcardset_set.count()

    def get_sets_saved(self, obj):
        return obj.savedflashcardset_set.count()


class TopicSerializer(serializers.ModelSerializer):
    """Serializer cho Topic model"""
    sets_count = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = ['id', 'name', 'description', 'icon', 'is_active', 'sets_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_sets_count(self, obj):
        return obj.flashcardset_set.filter(is_public=True).count()


class FlashcardSerializer(serializers.ModelSerializer):
    """Serializer cho Flashcard model"""

    class Meta:
        model = Flashcard
        fields = [
            'id', 'vietnamese', 'english', 'pronunciation',
            'example_sentence_en', 'word_type', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FlashcardDetailSerializer(serializers.ModelSerializer):
    """Serializer chi tiết cho Flashcard với thông tin progress của user"""
    user_progress = serializers.SerializerMethodField()

    class Meta:
        model = Flashcard
        fields = [
            'id', 'vietnamese', 'english', 'pronunciation',
            'example_sentence_en', 'word_type', 'created_at', 'user_progress'
        ]
        read_only_fields = ['id', 'created_at']

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                progress = UserProgress.objects.get(user=request.user, flashcard=obj)
                return {
                    'mastery_level': progress.mastery_level,
                    'times_reviewed': progress.times_reviewed,
                    'is_learned': progress.is_learned,
                    'is_difficult': progress.is_difficult,
                    'accuracy_rate': progress.accuracy_rate
                }
            except UserProgress.DoesNotExist:
                return None
        return None


class FlashcardSetSerializer(serializers.ModelSerializer):
    """Serializer cho FlashcardSet model"""
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    creator_name = serializers.CharField(source='creator.display_name', read_only=True)
    is_saved = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()

    class Meta:
        model = FlashcardSet
        fields = [
            'id', 'title', 'description', 'topic', 'topic_name',
            'creator', 'creator_name', 'is_public', 'difficulty',
            'total_cards', 'total_saves', 'average_rating',
            'created_at', 'updated_at', 'is_saved', 'user_rating'
        ]
        read_only_fields = ['id', 'creator', 'total_cards', 'total_saves', 'average_rating', 'created_at', 'updated_at']

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedFlashcardSet.objects.filter(
                user=request.user,
                flashcard_set=obj
            ).exists()
        return False

    def get_user_rating(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                saved_set = SavedFlashcardSet.objects.get(
                    user=request.user,
                    flashcard_set=obj
                )
                return saved_set.rating
            except SavedFlashcardSet.DoesNotExist:
                return None
        return None


class FlashcardSetDetailSerializer(serializers.ModelSerializer):
    """Serializer chi tiết cho FlashcardSet với danh sách flashcards"""
    flashcards = FlashcardDetailSerializer(many=True, read_only=True)
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    creator_name = serializers.CharField(source='creator.display_name', read_only=True)
    is_saved = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()
    user_progress_summary = serializers.SerializerMethodField()

    class Meta:
        model = FlashcardSet
        fields = [
            'id', 'title', 'description', 'topic', 'topic_name',
            'creator', 'creator_name', 'is_public', 'difficulty',
            'total_cards', 'total_saves', 'average_rating',
            'created_at', 'updated_at', 'flashcards', 'is_saved',
            'user_rating', 'user_progress_summary'
        ]

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedFlashcardSet.objects.filter(
                user=request.user,
                flashcard_set=obj
            ).exists()
        return False

    def get_user_rating(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                saved_set = SavedFlashcardSet.objects.get(
                    user=request.user,
                    flashcard_set=obj
                )
                return saved_set.rating
            except SavedFlashcardSet.DoesNotExist:
                return None
        return None

    def get_user_progress_summary(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            flashcard_ids = obj.flashcards.values_list('id', flat=True)
            progress_qs = UserProgress.objects.filter(
                user=request.user,
                flashcard_id__in=flashcard_ids
            )

            total_cards = len(flashcard_ids)
            learned_count = progress_qs.filter(is_learned=True).count()
            difficult_count = progress_qs.filter(is_difficult=True).count()
            avg_mastery = progress_qs.aggregate(avg=Avg('mastery_level'))['avg'] or 0

            return {
                'total_cards': total_cards,
                'learned_count': learned_count,
                'difficult_count': difficult_count,
                'progress_percentage': round((learned_count / total_cards) * 100, 1) if total_cards > 0 else 0,
                'average_mastery': round(avg_mastery, 1)
            }
        return None


class SavedFlashcardSetSerializer(serializers.ModelSerializer):
    """Serializer cho SavedFlashcardSet model"""
    flashcard_set = FlashcardSetSerializer(read_only=True)

    class Meta:
        model = SavedFlashcardSet
        fields = ['id', 'flashcard_set', 'saved_at', 'is_favorite', 'rating']
        read_only_fields = ['id', 'saved_at']


class UserProgressSerializer(serializers.ModelSerializer):
    """Serializer cho UserProgress model"""
    flashcard = FlashcardSerializer(read_only=True)
    flashcard_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserProgress
        fields = [
            'id', 'flashcard', 'flashcard_id', 'mastery_level',
            'times_reviewed', 'times_correct', 'last_reviewed',
            'difficulty_rating', 'is_learned', 'is_difficult', 'accuracy_rate'
        ]
        read_only_fields = ['id', 'accuracy_rate']


class GameSessionSerializer(serializers.ModelSerializer):
    """Serializer cho GameSession model"""
    game_type_display = serializers.CharField(source='get_game_type_display', read_only=True)

    class Meta:
        model = GameSession
        fields = [
            'id', 'game_type', 'game_type_display', 'score',
            'total_questions', 'correct_answers', 'time_spent',
            'completed_at', 'accuracy_percentage'
        ]
        read_only_fields = ['id', 'user', 'completed_at', 'accuracy_percentage']


class AchievementSerializer(serializers.ModelSerializer):
    """Serializer cho Achievement model"""

    class Meta:
        model = Achievement
        fields = [
            'id', 'name', 'description', 'icon', 'achievement_type',
            'requirement_value', 'points', 'rarity', 'is_active'
        ]
        read_only_fields = ['id']


class UserAchievementSerializer(serializers.ModelSerializer):
    """Serializer cho UserAchievement model"""
    achievement = AchievementSerializer(read_only=True)

    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'earned_at', 'progress_value']
        read_only_fields = ['id', 'earned_at']


class UserFeedbackSerializer(serializers.ModelSerializer):
    """Serializer cho UserFeedback model"""
    flashcard = FlashcardSerializer(read_only=True)
    flashcard_id = serializers.IntegerField(write_only=True)
    rating_display = serializers.CharField(source='get_rating_display', read_only=True)

    class Meta:
        model = UserFeedback
        fields = [
            'id', 'flashcard', 'flashcard_id', 'rating',
            'rating_display', 'comment', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'created_at']


class DailyStatsSerializer(serializers.ModelSerializer):
    """Serializer cho DailyStats model"""

    class Meta:
        model = DailyStats
        fields = [
            'id', 'date', 'cards_studied', 'time_spent',
            'games_played', 'points_earned', 'accuracy_rate',
            'new_words_learned', 'words_reviewed'
        ]
        read_only_fields = ['id', 'user']


# Serializers cho bulk operations
class FlashcardBulkCreateSerializer(serializers.Serializer):
    """Serializer cho việc tạo nhiều flashcards cùng lúc"""
    flashcard_set_id = serializers.IntegerField()
    flashcards = FlashcardSerializer(many=True)

    def validate_flashcard_set_id(self, value):
        request = self.context.get('request')
        try:
            flashcard_set = FlashcardSet.objects.get(id=value)
            if flashcard_set.creator != request.user:
                raise serializers.ValidationError("Bạn không có quyền thêm flashcard vào bộ này.")
            return value
        except FlashcardSet.DoesNotExist:
            raise serializers.ValidationError("Bộ flashcard không tồn tại.")

    def create(self, validated_data):
        flashcard_set_id = validated_data['flashcard_set_id']
        flashcards_data = validated_data['flashcards']

        flashcard_set = FlashcardSet.objects.get(id=flashcard_set_id)
        flashcards = []

        for flashcard_data in flashcards_data:
            flashcard = Flashcard.objects.create(
                flashcard_set=flashcard_set,
                **flashcard_data
            )
            flashcards.append(flashcard)

        # Cập nhật total_cards
        flashcard_set.update_total_cards()

        return flashcards


class ProgressUpdateSerializer(serializers.Serializer):
    """Serializer cho việc cập nhật progress sau khi học"""
    flashcard_id = serializers.IntegerField()
    is_correct = serializers.BooleanField()
    difficulty_rating = serializers.IntegerField(min_value=1, max_value=5, required=False)

    def validate_flashcard_id(self, value):
        try:
            Flashcard.objects.get(id=value)
            return value
        except Flashcard.DoesNotExist:
            raise serializers.ValidationError("Flashcard không tồn tại.")


class StudySessionSerializer(serializers.Serializer):
    """Serializer cho session học tập"""
    flashcard_set_id = serializers.IntegerField()
    results = ProgressUpdateSerializer(many=True)
    session_duration = serializers.IntegerField()  # seconds

    def validate_flashcard_set_id(self, value):
        try:
            FlashcardSet.objects.get(id=value)
            return value
        except FlashcardSet.DoesNotExist:
            raise serializers.ValidationError("Bộ flashcard không tồn tại.")


# Statistics Serializers
class UserStatsSerializer(serializers.Serializer):
    """Serializer cho thống kê tổng quan của user"""
    total_cards_studied = serializers.IntegerField()
    total_time_spent = serializers.IntegerField()
    total_games_played = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    total_achievements = serializers.IntegerField()
    average_accuracy = serializers.FloatField()
    cards_learned_this_week = serializers.IntegerField()
    points_earned_this_week = serializers.IntegerField()


class WeeklyStatsSerializer(serializers.Serializer):
    """Serializer cho thống kê theo tuần"""
    date = serializers.DateField()
    cards_studied = serializers.IntegerField()
    time_spent = serializers.IntegerField()
    points_earned = serializers.IntegerField()
    accuracy_rate = serializers.FloatField()


class LeaderboardSerializer(serializers.ModelSerializer):
    """Serializer cho bảng xếp hạng"""
    rank = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'display_name', 'avatar', 'total_points', 'rank']