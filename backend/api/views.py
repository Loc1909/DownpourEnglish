from rest_framework import viewsets, generics, status, permissions, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Avg, F, Sum, Max
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction
from math import ceil
from django.core.exceptions import ValidationError

from api.models import (
    User, Topic, FlashcardSet, Flashcard, SavedFlashcardSet,
    UserProgress, GameSession, Achievement, UserAchievement,
    UserFeedback, DailyStats
)
from api import serializers
from api.achievement_service import AchievementService
from api.ai_suggestion import AISuggestionService
from typing import List, Dict, Any, Optional
from api.permissions import IsUser, IsAdmin
import random
import logging

logger = logging.getLogger(__name__)


class TopicViewSet(viewsets.ViewSet, generics.ListAPIView, generics.CreateAPIView, generics.UpdateAPIView,
                   generics.DestroyAPIView, generics.RetrieveAPIView):
    queryset = Topic.objects.filter(is_active=True)
    serializer_class = serializers.TopicSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return serializers.CreateTopicSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # nếu data valid như serializer không, không: throw...
        topic = serializer.save()

        return Response(
            serializers.TopicSerializer(topic).data,
            status=status.HTTP_201_CREATED
        )

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

    @action(methods=['get'], detail=True, url_path='ai-suggestions')
    def ai_suggestions(self, request, pk):
        """Gợi ý các bộ flashcard phù hợp cho chủ đề bằng AI embeddings.

        Query params:
        - limit: số lượng kết quả (mặc định 10, tối đa 50)
        """
        topic = self.get_object()
        try:
            limit_param = request.query_params.get('limit')
            limit = int(limit_param) if limit_param else 10
            limit = max(1, min(50, limit))
        except ValueError:
            limit = 10

        service = AISuggestionService.get_instance()
        suggested_sets = service.suggest_sets_for_topic(topic=topic, top_k=limit)
        serializer = serializers.FlashcardSetSerializer(
            suggested_sets, many=True, context={'request': request}
        )
        return Response(serializer.data)


class FlashcardSetViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.UpdateAPIView,
                          generics.DestroyAPIView):
    queryset = FlashcardSet.objects.select_related('creator', 'topic').filter(is_public=True)
    serializer_class = serializers.FlashcardSetSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'total_saves', 'average_rating']  # Các field có thể sort
    ordering = ['-created_at']  # Xếp giảm dần

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return serializers.FlashcardSetDetailSerializer
        elif self.action == 'create':
            return serializers.CreateFlashcardSetSerializer
        elif self.action in ['update', 'partial_update']:
            return serializers.UpdateFlashcardSetSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        # Hành động chỉ dành cho user (tương tác cá nhân)
        user_only_actions = ['save', 'favorite', 'rate', 'favorites']
        if self.action in user_only_actions:
            return [IsUser()]
        # Hành động quản trị
        if self.action in ['admin_list']:
            return [IsAdmin()]
        # Tạo/sửa/xóa: cho phép cả admin và user đăng nhập
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        # Mặc định public
        return [permissions.AllowAny()]

    def get_queryset(self):
        # Nếu có creator_id filter, cho phép xem cả private sets của creator đó
        creator_id = self.request.query_params.get('creator_id')
        if creator_id and self.request.user.is_authenticated and str(self.request.user.id) == str(creator_id):
            # Người dùng xem bộ flashcard của chính mình -> hiển thị cả public và private
            queryset = FlashcardSet.objects.select_related('creator', 'topic').all()
        else:
            # Mặc định chỉ hiển thị public sets
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
        if creator_id:
            queryset = queryset.filter(creator_id=creator_id)

        return queryset

    def get_object(self):
        """
        Override get_object để cho phép creator truy cập vào bộ private của mình
        """
        # Lấy pk từ URL
        pk = self.kwargs.get('pk')

        # Tìm object trong tất cả flashcard sets (bao gồm cả private)
        try:
            obj = FlashcardSet.objects.select_related('creator', 'topic').get(pk=pk)
        except FlashcardSet.DoesNotExist:
            from django.http import Http404
            raise Http404("Bộ flashcard không tồn tại")

        # Kiểm tra quyền truy cập (admin luôn được phép)
        if not obj.is_public and obj.creator != self.request.user and getattr(self.request.user, 'role',
                                                                              'user') != 'admin':
            from django.http import Http404
            raise Http404("Bộ flashcard không tồn tại hoặc bạn không có quyền truy cập")

        return obj

    def create(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        flashcard_set = serializer.save()

        return Response(
            serializers.FlashcardSetSerializer(flashcard_set, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Cho phép creator hoặc admin chỉnh sửa
        if instance.creator != request.user and getattr(request.user, 'role', 'user') != 'admin':
            return Response({'error': 'Bạn không có quyền chỉnh sửa bộ flashcard này'},
                            status=status.HTTP_403_FORBIDDEN)

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Trả về dữ liệu chi tiết sau khi cập nhật
        detail = serializers.FlashcardSetDetailSerializer(instance, context={'request': request})
        return Response(detail.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Chỉ cho phép creator xóa
        if instance.creator != request.user and getattr(request.user, 'role', 'user') != 'admin':
            return Response({'error': 'Bạn không có quyền xóa bộ flashcard này'}, status=status.HTTP_403_FORBIDDEN)

        instance.delete()
        return Response({'message': 'Đã xóa bộ flashcard'}, status=status.HTTP_204_NO_CONTENT)

    @action(methods=['get'], detail=False)
    def admin_list(self, request):
        """Danh sách tất cả flashcard set (chỉ admin)"""
        if getattr(request.user, 'role', 'user') != 'admin':
            return Response({'error': 'Không có quyền'}, status=status.HTTP_403_FORBIDDEN)

        queryset = FlashcardSet.objects.select_related('creator', 'topic').all()

        # Filter
        q = request.query_params.get('q')
        if q:
            queryset = queryset.filter(title__icontains=q)
        topic_id = request.query_params.get('topic_id')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)
        creator_id = request.query_params.get('creator_id')
        if creator_id:
            queryset = queryset.filter(creator_id=creator_id)
        is_public = request.query_params.get('is_public')
        if is_public in ['true', 'false', '0', '1']:
            value = is_public in ['true', '1']
            queryset = queryset.filter(is_public=value)

        serializer = serializers.FlashcardSetSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    # views.py - Fixed save action
    @action(methods=['post'], detail=True, permission_classes=[IsUser])
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

        # Kiểm tra và trao thành tích sau khi lưu flashcard
        new_achievements = AchievementService.check_and_award_achievements(request.user)

        response_data = {
            'message': message,
            'is_saved': is_saved,
            'total_saves': flashcard_set.total_saves
        }

        if new_achievements:
            response_data['new_achievements'] = [
                {
                    'name': achievement.name,
                    'description': achievement.description,
                    'points': achievement.points,
                    'rarity': achievement.rarity
                }
                for achievement in new_achievements
            ]

        return Response(response_data)

    @action(methods=['post'], detail=True, permission_classes=[IsUser])
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

        # Kiểm tra và trao thành tích sau khi đánh giá
        new_achievements = AchievementService.check_and_award_achievements(request.user)

        response_data = {
            'message': 'Đã đánh giá thành công',
            'average_rating': flashcard_set.average_rating
        }

        if new_achievements:
            response_data['new_achievements'] = [
                {
                    'name': achievement.name,
                    'description': achievement.description,
                    'points': achievement.points,
                    'rarity': achievement.rarity
                }
                for achievement in new_achievements
            ]

        return Response(response_data)

    @action(methods=['get'], detail=True, url_path='flashcards')
    def get_flashcards(self, request, pk):
        """Lấy tất cả flashcard trong bộ"""
        flashcard_set = self.get_object()
        flashcards = flashcard_set.flashcards.all()

        serializer = serializers.FlashcardSerializer(
            flashcards, many=True, context={'request': request}
        )
        return Response(serializer.data)

    @action(methods=['post'], detail=True, permission_classes=[IsUser])
    def favorite(self, request, pk):
        """Thêm/bỏ yêu thích bộ flashcard"""
        flashcard_set = self.get_object()

        try:
            # Tìm xem user đã lưu bộ flashcard này chưa
            saved_set = SavedFlashcardSet.objects.get(
                user=request.user,
                flashcard_set=flashcard_set
            )

            # Toggle trạng thái yêu thích
            saved_set.is_favorite = not saved_set.is_favorite
            saved_set.save()

            message = "Đã thêm vào yêu thích" if saved_set.is_favorite else "Đã bỏ khỏi yêu thích"
            is_favorite = saved_set.is_favorite

        except SavedFlashcardSet.DoesNotExist:
            # Nếu chưa lưu -> tạo mới và đánh dấu yêu thích
            SavedFlashcardSet.objects.create(
                user=request.user,
                flashcard_set=flashcard_set,
                is_favorite=True
            )
            message = "Đã lưu và thêm vào yêu thích"
            is_favorite = True

            # Cập nhật lại total_saves
            flashcard_set.update_total_saves()

        return Response({
            'message': message,
            'is_favorite': is_favorite,
            'total_saves': flashcard_set.total_saves
        })

    @action(methods=['get'], detail=False, permission_classes=[IsUser])
    def favorites(self, request):
        """Lấy danh sách bộ flashcard yêu thích"""
        favorites = SavedFlashcardSet.objects.filter(
            user=request.user,
            is_favorite=True
        ).select_related('flashcard_set__creator', 'flashcard_set__topic')

        serializer = serializers.SavedFlashcardSetSerializer(
            favorites, many=True, context={'request': request}
        )
        return Response(serializer.data)


class FlashcardViewSet(viewsets.ViewSet, generics.CreateAPIView, generics.UpdateAPIView, generics.DestroyAPIView):
    queryset = Flashcard.objects.all()
    serializer_class = serializers.FlashcardSerializer

    def get_permissions(self):
        # Cho phép cả user và admin tạo, sửa, xóa flashcard
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]  # Thay đổi từ IsUser() thành IsAuthenticated()
        elif self.action == 'study':
            return [IsUser()]  # Study chỉ dành cho user thường
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == 'create':
            return serializers.CreateFlashcardSerializer
        return super().get_serializepr_class()

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

    @action(methods=['post'], detail=True, permission_classes=[IsUser])
    def study(self, request, pk):
        """Học một flashcard"""
        flashcard = self.get_object()
        is_correct = request.data.get('is_correct', False)
        difficulty_rating = request.data.get('difficulty_rating')

        progress, created = UserProgress.objects.get_or_create(
            user=request.user, flashcard=flashcard
        )

        with transaction.atomic():  # nếu có ngoại lệ thì hoàn tác tất cả
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
            daily_stats, created_daily = DailyStats.objects.get_or_create(
                user=request.user, date=today,
                defaults={
                    'cards_studied': 0,
                    'new_words_learned': 0,
                    'words_reviewed': 0,
                    'time_spent': 0,
                    'games_played': 0,
                    'points_earned': 0,
                    'accuracy_rate': 0.0
                }
            )

            if not created_daily:
                # Nếu record đã tồn tại, cập nhật bằng F() expression
                DailyStats.objects.filter(
                    user=request.user, date=today
                ).update(
                    cards_studied=F('cards_studied') + 1,
                    new_words_learned=F('new_words_learned') + (1 if created else 0),
                    words_reviewed=F('words_reviewed') + (0 if created else 1)
                )
            else:
                # Nếu record mới, cập nhật trực tiếp
                daily_stats.cards_studied = 1
                daily_stats.new_words_learned = 1 if created else 0
                daily_stats.words_reviewed = 0 if created else 1
                daily_stats.save()

            # Cập nhật accuracy_rate theo trung bình toàn bộ UserProgress
            agg = UserProgress.objects.filter(user=request.user).aggregate(
                total_correct=Sum('times_correct'),
                total_reviewed=Sum('times_reviewed')
            )
            total_correct = agg.get('total_correct') or 0
            total_reviewed = agg.get('total_reviewed') or 0
            daily_accuracy = round((total_correct / total_reviewed) * 100, 1) if total_reviewed > 0 else 0.0

            DailyStats.objects.filter(user=request.user, date=today).update(
                accuracy_rate=daily_accuracy
            )

        # Kiểm tra và trao thành tích sau khi học
        new_achievements = AchievementService.check_and_award_achievements(request.user)

        response_data = {
            'message': 'Đã cập nhật tiến trình học tập',
            'mastery_level': progress.mastery_level,
            'times_reviewed': progress.times_reviewed
        }

        if new_achievements:
            response_data['new_achievements'] = [
                {
                    'name': achievement.name,
                    'description': achievement.description,
                    'points': achievement.points,
                    'rarity': achievement.rarity
                }
                for achievement in new_achievements
            ]

        return Response(response_data)


class UserViewSet(viewsets.ViewSet, generics.CreateAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = serializers.UserSerializer
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_permissions(self):
        # Các API hồ sơ chung cho mọi role đã đăng nhập
        if self.action in ['current_user', 'upload_avatar', 'logout']:
            return [permissions.IsAuthenticated()]
        # Các API thống kê/học tập chỉ dành cho role user
        if self.action in ['study_summary', 'saved_sets']:
            return [IsUser()]
        elif self.action == 'create':
            return [permissions.AllowAny()]  # Cho phép đăng ký không cần auth
        return [permissions.AllowAny()]

    def create(self, request):
        """Đăng ký tài khoản mới với hỗ trợ upload avatar"""

        # Debug: In ra để kiểm tra dữ liệu nhận được
        print("Content-Type:", request.content_type)
        print("Data:", request.data)
        print("Files:", request.FILES)

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                from rest_framework.authtoken.models import Token
                token, created = Token.objects.get_or_create(user=user)

                # Trao thành tích đăng ký tài khoản
                registration_achievement = AchievementService.award_registration_achievement(user)

                response_data = {
                    'message': 'Đăng ký thành công',
                    'token': token.key,
                    'user': serializers.UserSerializer(user).data
                }

                if registration_achievement:
                    response_data['new_achievement'] = {
                        'name': registration_achievement.name,
                        'description': registration_achievement.description,
                        'points': registration_achievement.points
                    }

                return Response(response_data, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"Error creating user: {str(e)}")
                return Response({
                    'error': f'Lỗi tạo tài khoản: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        print("Serializer errors:", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        """Đăng ký tài khoản mới với hỗ trợ upload avatar - DEPRECATED: Sử dụng POST /users/ thay thế"""

        # Redirect to create method
        return self.create(request)

    @action(methods=['post'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def upload_avatar(self, request):
        """Upload avatar cho user hiện tại"""
        avatar_file = request.FILES.get('avatar')

        if not avatar_file:
            return Response(
                {'error': 'Vui lòng chọn file avatar'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        if not avatar_file.content_type.startswith('image/'):
            return Response(
                {'error': 'Chỉ chấp nhận file hình ảnh'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 5MB)
        if avatar_file.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'File không được vượt quá 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Cập nhật avatar cho user
            user = request.user
            user.avatar = avatar_file
            user.save()

            return Response({
                'message': 'Upload avatar thành công',
                'avatar_url': user.avatar.url if user.avatar else None
            })
        except Exception as e:
            return Response(
                {'error': f'Lỗi upload avatar: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

    # Admin: danh sách user
    @action(methods=['get'], detail=False, permission_classes=[IsAdmin])
    def admin_list(self, request):
        users = User.objects.all().order_by('-date_joined')
        serializer = serializers.UserSerializer(users, many=True)
        return Response(serializer.data)

    # Admin: cập nhật vai trò user
    @action(methods=['patch'], detail=True, permission_classes=[IsAdmin])
    def admin_update_role(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'error': 'User không tồn tại'}, status=status.HTTP_404_NOT_FOUND)

        role = request.data.get('role')
        if role not in ['user', 'admin']:
            return Response({'error': 'Role không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        user.role = role
        user.save(update_fields=['role'])
        return Response({'message': 'Đã cập nhật vai trò', 'user': serializers.UserSerializer(user).data})

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

        # Streak hiện tại (sử dụng logic chính xác từ AchievementService)
        from api.achievement_service import AchievementService
        current_streak = AchievementService._calculate_current_streak(user)

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

    def get_permissions(self):
        # Tạo session game là hành động của người dùng (role=user)
        if self.action in ['create', 'list']:
            return [IsUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            game_session = serializer.save(user=request.user)

            # Cập nhật điểm người dùng - Sửa cách sử dụng F() expression
            User.objects.filter(id=request.user.id).update(
                total_points=F('total_points') + game_session.score
            )
            # Refresh user instance để có total_points mới
            request.user.refresh_from_db()

            # Cập nhật thống kê hàng ngày - Sửa cách sử dụng F() expression
            today = timezone.now().date()
            daily_stats, created_daily = DailyStats.objects.get_or_create(
                user=request.user, date=today,
                defaults={
                    'cards_studied': 0,
                    'new_words_learned': 0,
                    'words_reviewed': 0,
                    'time_spent': 0,
                    'games_played': 0,
                    'points_earned': 0,
                    'accuracy_rate': 0.0
                }
            )

            if not created_daily:
                # Nếu record đã tồn tại, cập nhật bằng F() expression
                DailyStats.objects.filter(
                    user=request.user, date=today
                ).update(
                    games_played=F('games_played') + 1,
                    points_earned=F('points_earned') + game_session.score
                )
            else:
                # Nếu record mới, cập nhật trực tiếp
                daily_stats.games_played = 1
                daily_stats.points_earned = game_session.score
                daily_stats.save()

            # Cộng thời gian học (đổi giây -> phút, làm tròn lên phút)
            minutes_spent = int(ceil((game_session.time_spent or 0) / 60))
            if minutes_spent > 0:
                DailyStats.objects.filter(user=request.user, date=today).update(
                    time_spent=F('time_spent') + minutes_spent
                )

            # Cập nhật accuracy_rate theo trung bình toàn bộ UserProgress
            agg = UserProgress.objects.filter(user=request.user).aggregate(
                total_correct=Sum('times_correct'),
                total_reviewed=Sum('times_reviewed')
            )
            total_correct = agg.get('total_correct') or 0
            total_reviewed = agg.get('total_reviewed') or 0
            daily_accuracy = round((total_correct / total_reviewed) * 100, 1) if total_reviewed > 0 else 0.0

            DailyStats.objects.filter(user=request.user, date=today).update(
                accuracy_rate=daily_accuracy
            )

        # Kiểm tra và trao thành tích sau khi chơi game
        new_achievements = AchievementService.check_and_award_achievements(request.user)

        response_data = {
            'game_session': serializer.data,
            'new_achievements': [
                {
                    'name': achievement.name,
                    'description': achievement.description,
                    'points': achievement.points,
                    'rarity': achievement.rarity
                }
                for achievement in new_achievements
            ] if new_achievements else []
        }

        return Response(response_data, status=status.HTTP_201_CREATED)

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

    def list(self, request, *args, **kwargs):
        """Lấy danh sách thành tích với tiến trình của user (nếu đã đăng nhập)"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data

        # Nếu user đã đăng nhập, thêm thông tin tiến trình
        if request.user.is_authenticated:
            # Lấy tất cả thành tích đã đạt được của user để tối ưu performance
            user_achievements = UserAchievement.objects.filter(
                user=request.user
            ).values_list('achievement_id', flat=True)

            for achievement_data in data:
                achievement_id = achievement_data['id']
                try:
                    achievement = Achievement.objects.get(id=achievement_id)
                    progress_value = AchievementService.get_user_progress_for_achievement(
                        request.user, achievement
                    )
                    achievement_data['user_progress'] = progress_value

                    # Kiểm tra xem user đã đạt được thành tích này chưa
                    if achievement_id in user_achievements:
                        # User đã đạt được thành tích này
                        user_achievement = UserAchievement.objects.get(
                            user=request.user,
                            achievement=achievement
                        )
                        achievement_data['is_earned'] = True
                        achievement_data['earned_at'] = user_achievement.earned_at
                        achievement_data['progress_percentage'] = 100
                    else:
                        # User chưa đạt được thành tích này
                        achievement_data['is_earned'] = False
                        achievement_data['earned_at'] = None
                        # Tính phần trăm tiến trình
                        if achievement.requirement_value > 0:
                            progress_percentage = min(100, (progress_value / achievement.requirement_value) * 100)
                        else:
                            progress_percentage = 0
                        achievement_data['progress_percentage'] = round(progress_percentage, 1)

                except Achievement.DoesNotExist:
                    pass

        return Response(data)

    @action(methods=['get'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def my_achievements(self, request):
        """Thành tích của user hiện tại"""
        user_achievements = UserAchievement.objects.filter(
            user=request.user
        ).select_related('achievement')

        serializer = serializers.UserAchievementSerializer(user_achievements, many=True)
        return Response(serializer.data)



    @action(methods=['post'], detail=False, permission_classes=[permissions.IsAuthenticated])
    def check_achievements(self, request):
        """Kiểm tra và trao thành tích mới cho user"""
        new_achievements = AchievementService.check_and_award_achievements(request.user)

        if new_achievements:
            return Response({
                'message': f'Đã đạt được {len(new_achievements)} thành tích mới!',
                'new_achievements': [
                    {
                        'name': achievement.name,
                        'description': achievement.description,
                        'points': achievement.points,
                        'rarity': achievement.rarity
                    }
                    for achievement in new_achievements
                ]
            })
        else:
            return Response({
                'message': 'Chưa có thành tích mới nào'
            })


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


