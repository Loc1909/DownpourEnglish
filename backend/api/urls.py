from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('topics', views.TopicViewSet, basename='topic')
router.register('flashcard-sets', views.FlashcardSetViewSet, basename='flashcardset')
router.register('flashcards', views.FlashcardViewSet, basename='flashcard')
router.register('users', views.UserViewSet, basename='user')
router.register('game-sessions', views.GameSessionViewSet, basename='gamesession')
router.register('progress', views.UserProgressViewSet, basename='userprogress')
router.register('achievements', views.AchievementViewSet, basename='achievement')
router.register('daily-stats', views.DailyStatsViewSet, basename='dailystats')
router.register('feedback', views.UserFeedbackViewSet, basename='userfeedback')

urlpatterns = [
    path('', include(router.urls)),
]