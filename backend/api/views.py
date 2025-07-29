from rest_framework import viewsets, generics, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Avg, F, Sum, Max
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction

from api.models import (
    User, Topic, FlashcardSet, Flashcard, SavedFlashcardSet,
    UserProgress, GameSession, Achievement, UserAchievement,
    UserFeedback, DailyStats
)
from api import serializers


class TopicViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Topic.objects.filter(is_active=True)
    serializer_class = serializers.TopicSerializer
    permission_classes = [permissions.AllowAny]

    @action(methods=['get'], detail=True, url_path='flashcard-sets')
    def get_flashcard_sets(self, request, pk):
        """Lấy tất cả bộ flashcard của chủ đề"""
        topic = self.get_object()
        sets = FlashcardSet.objects.filter(
            topic=topic, is_public=True
        ).select_related('creator', 'topic')

        serializer = serializers.FlashcardSetSerializer(
            sets, many=True, context={'request': request}
        )
        return Response(serializer.data)


class FlashcardSetViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    queryset = FlashcardSet.objects.select_related('creator', 'topic').filter(is_public=True)
    serializer_class = serializers.FlashcardSetSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'total_saves', 'average_rating']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return serializers.FlashcardSetDetailSerializer
        elif self.action == 'create':
            return serializers.CreateFlashcardSetSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = self.queryset

        # Tìm kiếm theo tiêu đề
        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(title__icontains=q)

        # Lọc theo chủ đề
        topic_id = self.request.query_params.get('topic_id')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        # Lọc theo độ khó
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)

        # Lọc theo người tạo
        creator_id = self.request.query_params.get('creator_id')
        if creator_id:
            queryset = queryset.filter(creator_id=creator_id)

        return queryset

    def create(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        flashcard_set = serializer.save()

        return Response(
            serializers.FlashcardSetSerializer(flashcard_set, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    # views.py - Fixed save action
    @action(methods=['post'], detail=True, permission_classes=[permissions.IsAuthenticated])
    def save(self, request, pk):
        """Lưu/hủy lưu bộ flashcard"""
        flashcard_set = self.get_object()

        try:
            # Tìm xem user đã lưu bộ flashcard này chưa
            saved_set = SavedFlashcardSet.objects.get(
                user=request.user,
                flashcard_set=flashcard_set
            )

            # Nếu đã lưu -> xóa (hủy lưu)
            saved_set.delete()
            message = "Đã hủy lưu bộ flashcard"
            is_saved = False

        except SavedFlashcardSet.DoesNotExist:
            # Nếu chưa lưu -> tạo mới (lưu)
            SavedFlashcardSet.objects.create(
                user=request.user,
                flashcard_set=flashcard_set
            )
            message = "Đã lưu bộ flashcard"
            is_saved = True

        # Cập nhật lại total_saves dựa trên số records thực tế
        flashcard_set.update_total_saves()

        return Response({
            'message': message,
            'is_saved': is_saved,
            'total_saves': flashcard_set.total_saves
        })

    @action(methods=['post'], detail=True, permission_classes=[permissions.IsAuthenticated])
    def rate(self, request, pk):
        """Đánh giá bộ flashcard"""
        flashcard_set = self.get_object()
        rating = request.data.get('rating')

        if not rating or not (1 <= int(rating) <= 5):
            return Response(
                {'error': 'Rating phải từ 1 đến 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        saved_set, created = SavedFlashcardSet.objects.get_or_create(
            user=request.user, flashcard_set=flashcard_set
        )
        saved_set.rating = rating
        saved_set.save()

        # Cập nhật điểm trung bình
        avg_rating = SavedFlashcardSet.objects.filter(
            flashcard_set=flashcard_set, rating__isnull=False
        ).aggregate(avg=Avg('rating'))['avg']

        flashcard_set.average_rating = avg_rating or 0
        flashcard_set.save()

        return Response({
            'message': 'Đã đánh giá thành công',
            'average_rating': flashcard_set.average_rating
        })

    @action(methods=['get'], detail=True, url_path='flashcards')
    def get_flashcards(self, request, pk):
        """Lấy tất cả flashcard trong bộ"""
        flashcard_set = self.get_object()
        flashcards = flashcard_set.flashcards.all()

        serializer = serializers.FlashcardSerializer(
            flashcards, many=True, context={'request': request}
        )
        return Response(serializer.data)


class FlashcardViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = Flashcard.objects.all()
    serializer_class = serializers.FlashcardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return serializers.CreateFlashcardSerializer
        return super().get_serializer_class()

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        flashcard = serializer.save()

        # Cập nhật tổng số thẻ
        flashcard.flashcard_set.update_total_cards()

        return Response(
            serializers.FlashcardSerializer(flashcard, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(methods=['post'], detail=True, permission_classes=[permissions.IsAuthenticated])
    def study(self, request, pk):
        """Học một flashcard"""
        flashcard = self.get_object()
        is_correct = request.data.get('is_correct', False)
        difficulty_rating = request.data.get('difficulty_rating')

        progress, created = UserProgress.objects.get_or_create(
            user=request.user, flashcard=flashcard
        )

        with transaction.atomic():
            # Cập nhật số lần ôn tập và số lần đúng
            progress.times_reviewed += 1

            if is_correct:
                progress.times_correct += 1
                # Tăng mastery_level nhưng không vượt quá 100
                progress.mastery_level = min(100, progress.mastery_level + 10)
            else:
                # Giảm mastery_level nhưng không xuống dưới 0
                progress.mastery_level = max(0, progress.mastery_level - 5)
                progress.is_difficult = True

            progress.last_reviewed = timezone.now()
            if difficulty_rating:
                progress.difficulty_rating = difficulty_rating

            progress.save()

            # Cập nhật thống kê hàng ngày
            today = timezone.now().date()
            daily_stats, _ = DailyStats.objects.get_or_create(
                user=request.user, date=today
            )

            # Sử dụng F() expression cho daily_stats
            DailyStats.objects.filter(
                user=request.user, date=today
            ).update(
                cards_studied=F('cards_studied') + 1,
                new_words_learned=F('new_words_learned') + (1 if created else 0),
                words_reviewed=F('words_reviewed') + (0 if created else 1)
            )

        return Response({
            'message': 'Đã cập nhật tiến trình học tập',
            'mastery_level': progress.mastery_level,
            'times_reviewed': progress.times_reviewed
        })


class UserViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer

    def get_permissions(self):
        if self.action in ['current_user', 'study_summary', 'saved_sets']:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    @action(methods=['post'], detail=False, permission_classes=[permissions.AllowAny])
    def login(self, request):
        """Đăng nhập bằng username/password truyền thống"""
        from django.contrib.auth import authenticate
        from rest_framework.authtoken.models import Token

        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({
                'error': 'Vui lòng nhập username và password'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if user and user.is_active:
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'message': 'Đăng nhập thành công',
                'token': token.key,
                'user': serializers.UserSerializer(user).data
            })

        return Response({
            'error': 'Thông tin đăng nhập không chính xác'
        }, status=status.HTTP_401_UNAUTHORIZED)

    @action(methods=['post'], detail=False, permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Đăng ký tài khoản mới"""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            from rest_framework.authtoken.models import Token
            token, created = Token.objects.get_or_create(user=user)

            return Response({
                'message': 'Đăng ký thành công',
                'token': token.key,
                'user': serializers.UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=['post'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """Đăng xuất (xóa token)"""
        try:
            from rest_framework.authtoken.models import Token
            token = Token.objects.get(user=request.user)
            token.delete()
            return Response({'message': 'Đăng xuất thành công'})
        except Token.DoesNotExist:
            return Response({'message': 'Token không tồn tại'})

    @action(methods=['get', 'patch'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def current_user(self, request):
        """Lấy/cập nhật thông tin user hiện tại"""
        user = request.user

        if request.method == 'PATCH':
            for key, value in request.data.items():
                if key in ['first_name', 'last_name', 'display_name']:
                    setattr(user, key, value)
            user.save()

        return Response(serializers.UserSerializer(user).data)

    @action(methods=['get'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def study_summary(self, request):
        """Tổng kết học tập của user"""
        user = request.user

        # Thống kê cơ bản
        total_sets_saved = SavedFlashcardSet.objects.filter(user=user).count()
        total_progress = UserProgress.objects.filter(user=user)
        total_cards_studied = total_progress.count()

        # Thời gian học
        total_time = DailyStats.objects.filter(user=user).aggregate(
            total=Sum('time_spent')
        )['total'] or 0

        # Streak hiện tại (đơn giản)
        recent_stats = DailyStats.objects.filter(
            user=user, cards_studied__gt=0
        ).order_by('-date')[:7]
        current_streak = len(recent_stats)

        # Thành tích
        total_achievements = UserAchievement.objects.filter(user=user).count()

        # Phân bố mastery
        mastery_dist = total_progress.values('mastery_level').annotate(
            count=Count('mastery_level')
        )

        data = {
            'total_sets_saved': total_sets_saved,
            'total_cards_studied': total_cards_studied,
            'total_time_spent': total_time,
            'current_streak': current_streak,
            'total_achievements': total_achievements,
            'mastery_distribution': list(mastery_dist),
            'recent_activity': []
        }

        return Response(data)

    @action(methods=['get'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def saved_sets(self, request):
        """Lấy các bộ flashcard đã lưu"""
        saved = SavedFlashcardSet.objects.filter(user=request.user).select_related('flashcard_set')
        serializer = serializers.SavedFlashcardSetSerializer(saved, many=True)
        return Response(serializer.data)


class GameSessionViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = GameSession.objects.all()
    serializer_class = serializers.GameSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            game_session = serializer.save(user=request.user)

            # Cập nhật điểm người dùng
            request.user.total_points = F('total_points') + game_session.score
            request.user.save()

            # Cập nhật thống kê hàng ngày
            today = timezone.now().date()
            daily_stats, _ = DailyStats.objects.get_or_create(
                user=request.user, date=today
            )
            daily_stats.games_played = F('games_played') + 1
            daily_stats.points_earned = F('points_earned') + game_session.score
            daily_stats.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(methods=['get'], detail=False)
    def leaderboard(self, request):
        """Bảng xếp hạng game"""
        game_type = request.query_params.get('game_type')

        # Bắt đầu với queryset cơ bản
        queryset = GameSession.objects.all()

        # Filter TRƯỚC khi aggregate và slice
        if game_type:
            queryset = queryset.filter(game_type=game_type)

        # Sau đó mới aggregate, order và slice
        queryset = queryset.values('user').annotate(
            best_score=Max('score'),
            total_games=Count('id')
        ).order_by('-best_score')[:10]

        # Transform data
        leaderboard_data = []
        for i, item in enumerate(queryset, 1):
            try:
                user = User.objects.get(id=item['user'])
                leaderboard_data.append({
                    'rank': i,
                    'user': serializers.UserSerializer(user).data,
                    'best_score': item['best_score'],
                    'total_games': item['total_games']
                })
            except User.DoesNotExist:
                # Skip nếu user không tồn tại
                continue

        return Response(leaderboard_data)


class UserProgressViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = UserProgress.objects.all()
    serializer_class = serializers.UserProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset.filter(user=self.request.user).select_related('flashcard')

        # Lọc theo từ khó
        is_difficult = self.request.query_params.get('is_difficult')
        if is_difficult == 'true':
            queryset = queryset.filter(is_difficult=True)

        # Lọc theo đã học
        is_learned = self.request.query_params.get('is_learned')
        if is_learned == 'true':
            queryset = queryset.filter(is_learned=True)

        return queryset

    @action(methods=['post'], detail=True)
    def mark_difficult(self, request, pk):
        """Đánh dấu từ khó"""
        progress = self.get_object()
        progress.is_difficult = not progress.is_difficult
        progress.save()

        return Response({
            'message': 'Đã cập nhật trạng thái từ khó',
            'is_difficult': progress.is_difficult
        })


class AchievementViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = Achievement.objects.filter(is_active=True)
    serializer_class = serializers.AchievementSerializer
    permission_classes = [permissions.AllowAny]

    @action(methods=['get'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def my_achievements(self, request):
        """Thành tích của user hiện tại"""
        user_achievements = UserAchievement.objects.filter(
            user=request.user
        ).select_related('achievement')

        serializer = serializers.UserAchievementSerializer(user_achievements, many=True)
        return Response(serializer.data)


class DailyStatsViewSet(viewsets.ViewSet, generics.ListAPIView):
    queryset = DailyStats.objects.all()
    serializer_class = serializers.DailyStatsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = self.queryset.filter(user=self.request.user)

        # Lọc theo khoảng thời gian
        days = self.request.query_params.get('days', 7)
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=int(days))

        return queryset.filter(date__range=[start_date, end_date]).order_by('-date')


class UserFeedbackViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.ListAPIView):
    queryset = UserFeedback.objects.all()
    serializer_class = serializers.UserFeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save(user=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
