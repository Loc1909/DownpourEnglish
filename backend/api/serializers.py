from rest_framework import serializers
from api.models import (
    User, Topic, FlashcardSet, Flashcard, SavedFlashcardSet,
    UserProgress, GameSession, Achievement, UserAchievement,
    UserFeedback, DailyStats
)


class BaseSerializer(serializers.ModelSerializer):
    """Base serializer với các phương thức chung"""

    def to_representation(self, instance):
        data = super().to_representation(instance)

        # Xử lý avatar nếu có
        if hasattr(instance, 'avatar') and instance.avatar:
            data['avatar'] = instance.avatar.url

        return data


class UserSerializer(BaseSerializer):
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        return obj.avatar.url if obj.avatar else ''

    def create(self, validated_data):
        user = User(**validated_data)
        if 'password' in validated_data:
            user.set_password(validated_data['password'])
        user.save()
        return user

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'display_name', 'avatar', 'total_points', 'date_joined']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': False}
        }


class TopicSerializer(serializers.ModelSerializer):
    flashcard_sets_count = serializers.SerializerMethodField()

    def get_flashcard_sets_count(self, obj):
        return obj.flashcardset_set.filter(is_public=True).count()

    class Meta:
        model = Topic
        fields = ['id', 'name', 'description', 'icon', 'flashcard_sets_count']


class FlashcardSerializer(serializers.ModelSerializer):
    user_progress = serializers.SerializerMethodField()

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                progress = UserProgress.objects.get(user=request.user, flashcard=obj)
                return {
                    'mastery_level': progress.mastery_level,
                    'times_reviewed': progress.times_reviewed,
                    'is_learned': progress.is_learned,
                    'is_difficult': progress.is_difficult
                }
            except UserProgress.DoesNotExist:
                return None
        return None

    class Meta:
        model = Flashcard
        fields = ['id', 'vietnamese', 'english', 'pronunciation',
                  'example_sentence_en', 'word_type', 'user_progress']


class FlashcardSetSerializer(BaseSerializer):
    creator = UserSerializer(read_only=True)
    topic = TopicSerializer(read_only=True)
    is_saved = serializers.SerializerMethodField()
    user_rating = serializers.SerializerMethodField()

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedFlashcardSet.objects.filter(
                user=request.user, flashcard_set=obj
            ).exists()
        return False

    def get_user_rating(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                saved = SavedFlashcardSet.objects.get(
                    user=request.user, flashcard_set=obj
                )
                return saved.rating
            except SavedFlashcardSet.DoesNotExist:
                return None
        return None

    class Meta:
        model = FlashcardSet
        fields = ['id', 'title', 'description', 'topic', 'creator',
                  'is_public', 'difficulty', 'total_cards', 'total_saves',
                  'average_rating', 'created_at', 'is_saved', 'user_rating']


class FlashcardSetDetailSerializer(FlashcardSetSerializer):
    flashcards = FlashcardSerializer(many=True, read_only=True)

    class Meta:
        model = FlashcardSetSerializer.Meta.model
        fields = FlashcardSetSerializer.Meta.fields + ['flashcards']


class SavedFlashcardSetSerializer(serializers.ModelSerializer):
    flashcard_set = FlashcardSetSerializer(read_only=True)

    class Meta:
        model = SavedFlashcardSet
        fields = ['id', 'flashcard_set', 'saved_at', 'is_favorite', 'rating']
        extra_kwargs = {
            'user': {'write_only': True}
        }


class UserProgressSerializer(serializers.ModelSerializer):
    flashcard = FlashcardSerializer(read_only=True)
    accuracy_rate = serializers.ReadOnlyField()

    class Meta:
        model = UserProgress
        fields = ['id', 'flashcard', 'mastery_level', 'times_reviewed',
                  'times_correct', 'last_reviewed', 'difficulty_rating',
                  'is_learned', 'is_difficult', 'accuracy_rate']
        extra_kwargs = {
            'user': {'write_only': True}
        }


class GameSessionSerializer(serializers.ModelSerializer):
    accuracy_percentage = serializers.ReadOnlyField()
    game_type_display = serializers.CharField(source='get_game_type_display', read_only=True)

    class Meta:
        model = GameSession
        fields = ['id', 'game_type', 'game_type_display', 'score',
                  'total_questions', 'correct_answers', 'time_spent',
                  'completed_at', 'accuracy_percentage']
        extra_kwargs = {
            'user': {'write_only': True}
        }


class AchievementSerializer(serializers.ModelSerializer):
    rarity_display = serializers.CharField(source='get_rarity_display', read_only=True)

    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'icon', 'achievement_type',
                  'requirement_value', 'points', 'rarity', 'rarity_display']


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    progress_percentage = serializers.SerializerMethodField()

    def get_progress_percentage(self, obj):
        if obj.achievement.requirement_value == 0:
            return 100
        return min(100, (obj.progress_value / obj.achievement.requirement_value) * 100)

    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'earned_at', 'progress_value', 'progress_percentage']
        extra_kwargs = {
            'user': {'write_only': True}
        }


class UserFeedbackSerializer(serializers.ModelSerializer):
    flashcard = FlashcardSerializer(read_only=True)
    rating_display = serializers.CharField(source='get_rating_display', read_only=True)

    class Meta:
        model = UserFeedback
        fields = ['id', 'flashcard', 'rating', 'rating_display',
                  'comment', 'created_at']
        extra_kwargs = {
            'user': {'write_only': True}
        }


class DailyStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyStats
        fields = ['id', 'date', 'cards_studied', 'time_spent', 'games_played',
                  'points_earned', 'accuracy_rate', 'new_words_learned', 'words_reviewed']


class CreateFlashcardSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashcardSet
        fields = ['title', 'description', 'topic', 'is_public', 'difficulty']

    def create(self, validated_data):
        validated_data['creator'] = self.context['request'].user
        return super().create(validated_data)


class CreateFlashcardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Flashcard
        fields = ['flashcard_set', 'vietnamese', 'english', 'pronunciation',
                  'example_sentence_en', 'word_type']


class StudySummarySerializer(serializers.Serializer):
    """Serializer cho tổng hợp học tập"""
    total_sets_saved = serializers.IntegerField()
    total_cards_studied = serializers.IntegerField()
    total_time_spent = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    total_achievements = serializers.IntegerField()
    mastery_distribution = serializers.DictField()
    recent_activity = serializers.ListField()


class LeaderboardSerializer(serializers.Serializer):
    """Serializer cho bảng xếp hạng"""
    user = UserSerializer()
    rank = serializers.IntegerField()
    total_points = serializers.IntegerField()
    cards_learned = serializers.IntegerField()
    achievements_count = serializers.IntegerField()