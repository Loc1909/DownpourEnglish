from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, F, Sum
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from .models import (
    Topic, FlashcardSet, Flashcard, SavedFlashcardSet,
    UserProgress, GameSession, Achievement, UserAchievement,
    UserFeedback, DailyStats
)
from .serializers import (
    UserSerializer, UserProfileSerializer, TopicSerializer,
    FlashcardSetSerializer, FlashcardSetDetailSerializer,
    FlashcardSerializer, FlashcardDetailSerializer,
    SavedFlashcardSetSerializer, UserProgressSerializer,
    GameSessionSerializer, AchievementSerializer, UserAchievementSerializer,
    UserFeedbackSerializer, DailyStatsSerializer,
    FlashcardBulkCreateSerializer, StudySessionSerializer,
    UserStatsSerializer, WeeklyStatsSerializer, LeaderboardSerializer
)

User = get_user_model()


# User Views
class UserProfileView(generics.RetrieveAPIView, generics.UpdateAPIView):
    """Xem và cập nhật profile user"""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# Topic Views
class TopicListView(generics.ListAPIView):
    """Danh sách các chủ đề"""
    queryset = Topic.objects.filter(is_active=True)
    serializer_class = TopicSerializer
    permission_classes = [permissions.AllowAny]


# FlashcardSet Views
class FlashcardSetListView(generics.ListAPIView):
    """Danh sách bộ flashcards công khai"""
    serializer_class = FlashcardSetSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = FlashcardSet.objects.filter(is_public=True)

        # Filter by topic
        topic_id = self.request.query_params.get('topic')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        # Filter by difficulty
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        # Search by title
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering == 'popular':
            queryset = queryset.order_by('-total_saves', '-average_rating')
        elif ordering == 'rating':
            queryset = queryset.order_by('-average_rating', '-total_saves')
        else:
            queryset = queryset.order_by(ordering)

        return queryset


class FlashcardSetView(generics.RetrieveAPIView, generics.CreateAPIView, generics.UpdateAPIView,
                       generics.DestroyAPIView):
    """CRUD cho FlashcardSet"""
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return FlashcardSetDetailSerializer
        return FlashcardSetSerializer

    def get_queryset(self):
        if self.request.method == 'GET':
            # Cho phép xem bộ flashcard public hoặc của chính mình
            return FlashcardSet.objects.filter(
                Q(is_public=True) | Q(creator=self.request.user)
            )
        else:
            # Chỉ cho phép thao tác trên bộ flashcard của chính mình
            return FlashcardSet.objects.filter(creator=self.request.user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)


class MyFlashcardSetsView(generics.ListAPIView):
    """Danh sách bộ flashcards của user hiện tại"""
    serializer_class = FlashcardSetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FlashcardSet.objects.filter(creator=self.request.user)


# Flashcard Views
class FlashcardListCreateView(generics.ListCreateAPIView):
    """Danh sách và tạo flashcards trong một set"""
    serializer_class = FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        set_id = self.kwargs['set_id']
        flashcard_set = get_object_or_404(FlashcardSet, id=set_id)

        # Kiểm tra quyền xem
        if not flashcard_set.is_public and flashcard_set.creator != self.request.user:
            return Flashcard.objects.none()

        return Flashcard.objects.filter(flashcard_set_id=set_id)

    def perform_create(self, serializer):
        set_id = self.kwargs['set_id']
        flashcard_set = get_object_or_404(FlashcardSet, id=set_id, creator=self.request.user)
        flashcard = serializer.save(flashcard_set=flashcard_set)

        # Cập nhật total_cards
        flashcard_set.update_total_cards()


class FlashcardView(generics.RetrieveAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    """Xem, sửa, xóa flashcard"""
    serializer_class = FlashcardDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Flashcard.objects.select_related('flashcard_set')

    def get_object(self):
        flashcard = super().get_object()
        flashcard_set = flashcard.flashcard_set

        # Kiểm tra quyền
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            if flashcard_set.creator != self.request.user:
                self.permission_denied(self.request)
        elif not flashcard_set.is_public and flashcard_set.creator != self.request.user:
            self.permission_denied(self.request)

        return flashcard

    def perform_destroy(self, instance):
        flashcard_set = instance.flashcard_set
        instance.delete()
        # Cập nhật total_cards
        flashcard_set.update_total_cards()


class FlashcardBulkCreateView(generics.CreateAPIView):
    """Tạo nhiều flashcards cùng lúc"""
    serializer_class = FlashcardBulkCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


# Saved FlashcardSet Views
class SavedFlashcardSetView(generics.ListAPIView, generics.CreateAPIView):
    """Danh sách và lưu bộ flashcards"""
    serializer_class = SavedFlashcardSetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = SavedFlashcardSet.objects.filter(user=self.request.user)

        # Filter by favorite
        is_favorite = self.request.query_params.get('favorite')
        if is_favorite == 'true':
            queryset = queryset.filter(is_favorite=True)

        return queryset.order_by('-saved_at')

    def create(self, request, *args, **kwargs):
        flashcard_set_id = request.data.get('flashcard_set_id')

        if not flashcard_set_id:
            return Response(
                {'error': 'flashcard_set_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        flashcard_set = get_object_or_404(FlashcardSet, id=flashcard_set_id, is_public=True)

        saved_set, created = SavedFlashcardSet.objects.get_or_create(
            user=request.user,
            flashcard_set=flashcard_set,
            defaults={
                'is_favorite': request.data.get('is_favorite', False),
                'rating': request.data.get('rating')
            }
        )

        if created:
            # Tăng total_saves
            flashcard_set.total_saves = F('total_saves') + 1
            flashcard_set.save(update_fields=['total_saves'])

        serializer = self.get_serializer(saved_set)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SavedFlashcardSetDetailView(generics.RetrieveAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    """Chi tiết, cập nhật, xóa bộ flashcard đã lưu"""
    serializer_class = SavedFlashcardSetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedFlashcardSet.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        flashcard_set = instance.flashcard_set
        instance.delete()
        # Giảm total_saves
        flashcard_set.total_saves = F('total_saves') - 1
        flashcard_set.save(update_fields=['total_saves'])


# UserProgress Views
class UserProgressListView(generics.ListAPIView):
    """Danh sách tiến trình học của user"""
    serializer_class = UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = UserProgress.objects.filter(user=self.request.user)

        # Filter by flashcard set
        set_id = self.request.query_params.get('set_id')
        if set_id:
            queryset = queryset.filter(flashcard__flashcard_set_id=set_id)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter == 'learned':
            queryset = queryset.filter(is_learned=True)
        elif status_filter == 'difficult':
            queryset = queryset.filter(is_difficult=True)
        elif status_filter == 'needs_review':
            queryset = queryset.filter(is_learned=False, times_reviewed__gt=0)

        return queryset.order_by('-last_reviewed')


class StudySessionView(APIView):
    """Xử lý session học tập"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StudySessionSerializer(data=request.data)
        if serializer.is_valid():
            flashcard_set_id = serializer.validated_data['flashcard_set_id']
            results = serializer.validated_data['results']
            session_duration = serializer.validated_data['session_duration']

            total_points = 0
            cards_studied = len(results)
            correct_count = 0

            for result in results:
                flashcard = get_object_or_404(Flashcard, id=result['flashcard_id'])
                is_correct = result['is_correct']
                difficulty_rating = result.get('difficulty_rating')

                # Cập nhật hoặc tạo UserProgress
                progress, created = UserProgress.objects.get_or_create(
                    user=request.user,
                    flashcard=flashcard,
                    defaults={'last_reviewed': timezone.now()}
                )

                progress.times_reviewed += 1
                if is_correct:
                    progress.times_correct += 1
                    correct_count += 1
                    # Tăng mastery level khi đúng
                    progress.mastery_level = min(100, progress.mastery_level + 10)
                    total_points += 5
                else:
                    # Giảm mastery level khi sai
                    progress.mastery_level = max(0, progress.mastery_level - 5)
                    progress.is_difficult = True

                if difficulty_rating:
                    progress.difficulty_rating = difficulty_rating

                # Đánh dấu đã học nếu mastery level >= 80
                if progress.mastery_level >= 80:
                    progress.is_learned = True

                progress.last_reviewed = timezone.now()
                progress.save()

            # Cập nhật total_points của user
            request.user.total_points += total_points
            request.user.save(update_fields=['total_points'])

            # Cập nhật hoặc tạo DailyStats
            today = timezone.now().date()
            daily_stats, created = DailyStats.objects.get_or_create(
                user=request.user,
                date=today,
                defaults={
                    'cards_studied': cards_studied,
                    'time_spent': session_duration // 60,  # Convert to minutes
                    'points_earned': total_points,
                    'accuracy_rate': (correct_count / cards_studied) * 100 if cards_studied > 0 else 0
                }
            )

            if not created:
                daily_stats.cards_studied += cards_studied
                daily_stats.time_spent += session_duration // 60
                daily_stats.points_earned += total_points
                # Recalculate accuracy rate
                total_questions = daily_stats.cards_studied
                total_correct = (daily_stats.accuracy_rate * (total_questions - cards_studied) / 100) + correct_count
                daily_stats.accuracy_rate = (total_correct / total_questions) * 100 if total_questions > 0 else 0
                daily_stats.save()

            return Response({
                'message': 'Session completed successfully',
                'points_earned': total_points,
                'cards_studied': cards_studied,
                'accuracy': (correct_count / cards_studied) * 100 if cards_studied > 0 else 0
            })

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# GameSession Views
class GameSessionView(generics.ListCreateAPIView):
    """Danh sách và tạo game sessions"""
    serializer_class = GameSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = GameSession.objects.filter(user=self.request.user)

        # Filter by game type
        game_type = self.request.query_params.get('game_type')
        if game_type:
            queryset = queryset.filter(game_type=game_type)

        return queryset.order_by('-completed_at')

    def perform_create(self, serializer):
        game_session = serializer.save(user=self.request.user)

        # Thêm điểm cho user
        points = game_session.score
        self.request.user.total_points += points
        self.request.user.save(update_fields=['total_points'])

        # Cập nhật DailyStats
        today = timezone.now().date()
        daily_stats, created = DailyStats.objects.get_or_create(
            user=self.request.user,
            date=today,
            defaults={'games_played': 1, 'points_earned': points}
        )

        if not created:
            daily_stats.games_played += 1
            daily_stats.points_earned += points
            daily_stats.save()


# Achievement Views
class AchievementListView(generics.ListAPIView):
    """Danh sách thành tích"""
    queryset = Achievement.objects.filter(is_active=True)
    serializer_class = AchievementSerializer
    permission_classes = [permissions.AllowAny]


class UserAchievementListView(generics.ListAPIView):
    """Danh sách thành tích của user"""
    serializer_class = UserAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserAchievement.objects.filter(user=self.request.user)


# UserFeedback Views
class UserFeedbackView(generics.ListCreateAPIView):
    """Tạo và xem feedback"""
    serializer_class = UserFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserFeedback.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Statistics Views
class UserStatsView(APIView):
    """Thống kê tổng quan của user"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Tính toán các thống kê
        total_progress = UserProgress.objects.filter(user=user)
        total_cards_studied = total_progress.count()

        daily_stats = DailyStats.objects.filter(user=user)
        total_time_spent = daily_stats.aggregate(total=Sum('time_spent'))['total'] or 0
        total_games_played = daily_stats.aggregate(total=Sum('games_played'))['total'] or 0

        # Tính streak (chuỗi ngày học liên tục)
        current_streak = self.calculate_streak(user)

        total_achievements = UserAchievement.objects.filter(user=user).count()

        # Tính accuracy trung bình
        avg_accuracy = total_progress.aggregate(avg=Avg('mastery_level'))['avg'] or 0

        # Thống kê tuần này
        week_start = timezone.now().date() - timedelta(days=timezone.now().weekday())
        week_stats = daily_stats.filter(date__gte=week_start).aggregate(
            cards=Sum('cards_studied'),
            points=Sum('points_earned')
        )

        stats = {
            'total_cards_studied': total_cards_studied,
            'total_time_spent': total_time_spent,
            'total_games_played': total_games_played,
            'current_streak': current_streak,
            'total_achievements': total_achievements,
            'average_accuracy': round(avg_accuracy, 1),
            'cards_learned_this_week': week_stats['cards'] or 0,
            'points_earned_this_week': week_stats['points'] or 0
        }

        serializer = UserStatsSerializer(stats)
        return Response(serializer.data)

    def calculate_streak(self, user):
        """Tính chuỗi ngày học liên tục"""
        today = timezone.now().date()
        streak = 0
        current_date = today

        while True:
            if DailyStats.objects.filter(
                    user=user,
                    date=current_date,
                    cards_studied__gt=0
            ).exists():
                streak += 1
                current_date -= timedelta(days=1)
            else:
                break

        return streak


class WeeklyStatsView(APIView):
    """Thống kê theo tuần"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        weeks = int(request.query_params.get('weeks', 4))  # Mặc định 4 tuần

        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=weeks)

        daily_stats = DailyStats.objects.filter(
            user=user,
            date__range=[start_date, end_date]
        ).values('date').annotate(
            cards_studied=Sum('cards_studied'),
            time_spent=Sum('time_spent'),
            points_earned=Sum('points_earned'),
            accuracy_rate=Avg('accuracy_rate')
        ).order_by('date')

        serializer = WeeklyStatsSerializer(daily_stats, many=True)
        return Response(serializer.data)


class LeaderboardView(generics.ListAPIView):
    """Bảng xếp hạng"""
    serializer_class = LeaderboardSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Lấy top 100 users
        queryset = User.objects.filter(
            total_points__gt=0
        ).order_by('-total_points')[:100]

        # Thêm rank
        for i, user in enumerate(queryset, 1):
            user.rank = i

        return queryset


# Search View
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def search_view(request):
    """Tìm kiếm tổng hợp"""
    query = request.query_params.get('q', '').strip()

    if not query:
        return Response({'error': 'Query parameter q is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Tìm kiếm flashcard sets
    flashcard_sets = FlashcardSet.objects.filter(
        is_public=True
    ).filter(
        Q(title__icontains=query) | Q(description__icontains=query)
    )[:10]

    # Tìm kiếm topics
    topics = Topic.objects.filter(
        is_active=True,
        name__icontains=query
    )[:5]

    # Tìm kiếm flashcards
    flashcards = Flashcard.objects.filter(
        flashcard_set__is_public=True
    ).filter(
        Q(vietnamese__icontains=query) | Q(english__icontains=query)
    )[:10]

    return Response({
        'flashcard_sets': FlashcardSetSerializer(flashcard_sets, many=True, context={'request': request}).data,
        'topics': TopicSerializer(topics, many=True).data,
        'flashcards': FlashcardSerializer(flashcards, many=True).data
    })


# Dashboard View
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_view(request):
    """Dashboard data cho user"""
    user = request.user
    today = timezone.now().date()

    # Stats hôm nay
    today_stats, _ = DailyStats.objects.get_or_create(
        user=user,
        date=today,
        defaults={
            'cards_studied': 0,
            'time_spent': 0,
            'games_played': 0,
            'points_earned': 0,
            'accuracy_rate': 0
        }
    )

    # Flashcards cần ôn tập
    need_review = UserProgress.objects.filter(
        user=user,
        is_learned=False,
        times_reviewed__gt=0
    ).count()

    # Từ khó
    difficult_words = UserProgress.objects.filter(
        user=user,
        is_difficult=True
    ).count()

    # Bộ flashcard đã lưu
    saved_sets_count = SavedFlashcardSet.objects.filter(user=user).count()

    # Recent achievements
    recent_achievements = UserAchievement.objects.filter(
        user=user
    ).order_by('-earned_at')[:3]

    return Response({
        'today_stats': DailyStatsSerializer(today_stats).data,
        'need_review': need_review,
        'difficult_words': difficult_words,
        'saved_sets_count': saved_sets_count,
        'recent_achievements': UserAchievementSerializer(recent_achievements, many=True).data
    })