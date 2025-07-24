from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.db.models import Count, Avg
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    User, Topic, FlashcardSet, Flashcard, SavedFlashcardSet,
    UserProgress, GameSession, Achievement, UserAchievement,
    UserFeedback, DailyStats
)


# Custom User Admin
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'display_name', 'total_points', 'is_staff', 'date_joined')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'display_name')
    ordering = ('-date_joined',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Thông tin bổ sung', {
            'fields': ('display_name', 'avatar', 'total_points')
        }),
    )

    readonly_fields = ('total_points', 'date_joined', 'last_login')

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            flashcard_sets_count=Count('flashcardset')
        )


# Topic Admin
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon_display', 'is_active', 'flashcard_sets_count', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('name',)
    readonly_fields = ('created_at',)

    def icon_display(self, obj):
        if obj.icon:
            return format_html('<i class="{}"></i> {}', obj.icon, obj.icon)
        return '-'

    icon_display.short_description = 'Icon'

    def flashcard_sets_count(self, obj):
        return obj.flashcardset_set.count()

    flashcard_sets_count.short_description = 'Số bộ flashcard'

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            sets_count=Count('flashcardset')
        )


# Inline for Flashcards in FlashcardSet
class FlashcardInline(admin.TabularInline):
    model = Flashcard
    extra = 1
    fields = ('vietnamese', 'english', 'pronunciation', 'word_type')
    show_change_link = True


# FlashcardSet Admin
class FlashcardSetAdmin(admin.ModelAdmin):
    list_display = (
    'title', 'topic', 'creator', 'difficulty', 'total_cards', 'total_saves', 'average_rating', 'is_public',
    'created_at')
    list_filter = ('difficulty', 'is_public', 'topic', 'created_at')
    search_fields = ('title', 'description', 'creator__username')
    ordering = ('-created_at',)
    readonly_fields = ('total_cards', 'total_saves', 'average_rating', 'created_at', 'updated_at')

    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('title', 'description', 'topic', 'creator')
        }),
        ('Thiết lập', {
            'fields': ('difficulty', 'is_public')
        }),
        ('Thống kê', {
            'fields': ('total_cards', 'total_saves', 'average_rating'),
            'classes': ('collapse',)
        }),
        ('Thông tin thời gian', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    inlines = [FlashcardInline]

    actions = ['make_public', 'make_private', 'update_card_counts']

    def make_public(self, request, queryset):
        updated = queryset.update(is_public=True)
        self.message_user(request, f'{updated} bộ flashcard đã được đặt thành công khai.')

    make_public.short_description = 'Đặt thành công khai'

    def make_private(self, request, queryset):
        updated = queryset.update(is_public=False)
        self.message_user(request, f'{updated} bộ flashcard đã được đặt thành riêng tư.')

    make_private.short_description = 'Đặt thành riêng tư'

    def update_card_counts(self, request, queryset):
        for flashcard_set in queryset:
            flashcard_set.update_total_cards()
        self.message_user(request, f'Đã cập nhật số lượng thẻ cho {queryset.count()} bộ flashcard.')

    update_card_counts.short_description = 'Cập nhật số lượng thẻ'


# Flashcard Admin
class FlashcardAdmin(admin.ModelAdmin):
    list_display = ('vietnamese', 'english', 'word_type', 'flashcard_set', 'created_at')
    list_filter = ('word_type', 'flashcard_set__topic', 'created_at')
    search_fields = ('vietnamese', 'english', 'pronunciation')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Từ vựng', {
            'fields': ('vietnamese', 'english', 'pronunciation', 'word_type')
        }),
        ('Ví dụ', {
            'fields': ('example_sentence_en',)
        }),
        ('Thông tin', {
            'fields': ('flashcard_set', 'created_at'),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('flashcard_set', 'flashcard_set__topic')


# SavedFlashcardSet Admin
class SavedFlashcardSetAdmin(admin.ModelAdmin):
    list_display = ('user', 'flashcard_set', 'is_favorite', 'rating', 'saved_at')
    list_filter = ('is_favorite', 'rating', 'saved_at')
    search_fields = ('user__username', 'flashcard_set__title')
    ordering = ('-saved_at',)
    readonly_fields = ('saved_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'flashcard_set')


# UserProgress Admin
class UserProgressAdmin(admin.ModelAdmin):
    list_display = (
    'user', 'flashcard_display', 'mastery_level', 'accuracy_rate', 'times_reviewed', 'is_learned', 'is_difficult',
    'last_reviewed')
    list_filter = ('is_learned', 'is_difficult', 'difficulty_rating', 'last_reviewed')
    search_fields = ('user__username', 'flashcard__vietnamese', 'flashcard__english')
    ordering = ('-last_reviewed',)
    readonly_fields = ('accuracy_rate', 'last_reviewed')

    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('user', 'flashcard')
        }),
        ('Tiến trình', {
            'fields': ('mastery_level', 'times_reviewed', 'times_correct', 'accuracy_rate')
        }),
        ('Đánh giá', {
            'fields': ('difficulty_rating', 'is_learned', 'is_difficult')
        }),
        ('Thời gian', {
            'fields': ('last_reviewed',),
            'classes': ('collapse',)
        })
    )

    def flashcard_display(self, obj):
        return f"{obj.flashcard.vietnamese} - {obj.flashcard.english}"

    flashcard_display.short_description = 'Flashcard'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'flashcard')


# GameSession Admin
class GameSessionAdmin(admin.ModelAdmin):
    list_display = (
    'user', 'game_type', 'score', 'accuracy_percentage', 'total_questions', 'time_spent', 'completed_at')
    list_filter = ('game_type', 'completed_at')
    search_fields = ('user__username',)
    ordering = ('-completed_at',)
    readonly_fields = ('accuracy_percentage', 'completed_at')

    fieldsets = (
        ('Thông tin game', {
            'fields': ('user', 'game_type')
        }),
        ('Kết quả', {
            'fields': ('score', 'total_questions', 'correct_answers', 'accuracy_percentage', 'time_spent')
        }),
        ('Thời gian', {
            'fields': ('completed_at',),
            'classes': ('collapse',)
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


# Achievement Admin
class AchievementAdmin(admin.ModelAdmin):
    list_display = ('name', 'achievement_type', 'rarity', 'requirement_value', 'points', 'is_active')
    list_filter = ('achievement_type', 'rarity', 'is_active')
    search_fields = ('name', 'description')
    ordering = ('achievement_type', 'requirement_value')

    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('name', 'description', 'icon')
        }),
        ('Thiết lập', {
            'fields': ('achievement_type', 'rarity', 'requirement_value', 'points')
        }),
        ('Trạng thái', {
            'fields': ('is_active',)
        })
    )


# UserAchievement Admin
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ('user', 'achievement', 'progress_value', 'earned_at')
    list_filter = ('achievement__achievement_type', 'achievement__rarity', 'earned_at')
    search_fields = ('user__username', 'achievement__name')
    ordering = ('-earned_at',)
    readonly_fields = ('earned_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'achievement')


# UserFeedback Admin
class UserFeedbackAdmin(admin.ModelAdmin):
    list_display = ('user', 'flashcard_display', 'rating', 'is_processed', 'created_at')
    list_filter = ('rating', 'is_processed', 'created_at')
    search_fields = ('user__username', 'flashcard__vietnamese', 'flashcard__english', 'comment')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)

    fieldsets = (
        ('Thông tin feedback', {
            'fields': ('user', 'flashcard', 'rating')
        }),
        ('Nội dung', {
            'fields': ('comment',)
        }),
        ('Xử lý', {
            'fields': ('is_processed',)
        }),
        ('Thời gian', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )

    actions = ['mark_as_processed', 'mark_as_unprocessed']

    def flashcard_display(self, obj):
        return f"{obj.flashcard.vietnamese} - {obj.flashcard.english}"

    flashcard_display.short_description = 'Flashcard'

    def mark_as_processed(self, request, queryset):
        updated = queryset.update(is_processed=True)
        self.message_user(request, f'{updated} feedback đã được đánh dấu là đã xử lý.')

    mark_as_processed.short_description = 'Đánh dấu đã xử lý'

    def mark_as_unprocessed(self, request, queryset):
        updated = queryset.update(is_processed=False)
        self.message_user(request, f'{updated} feedback đã được đánh dấu là chưa xử lý.')

    mark_as_unprocessed.short_description = 'Đánh dấu chưa xử lý'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'flashcard')


# DailyStats Admin
class DailyStatsAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'cards_studied', 'time_spent', 'games_played', 'points_earned', 'accuracy_rate')
    list_filter = ('date', 'accuracy_rate')
    search_fields = ('user__username',)
    ordering = ('-date', 'user')
    date_hierarchy = 'date'

    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('user', 'date')
        }),
        ('Thống kê học tập', {
            'fields': ('cards_studied', 'new_words_learned', 'words_reviewed', 'time_spent')
        }),
        ('Thống kê game', {
            'fields': ('games_played', 'points_earned', 'accuracy_rate')
        })
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


# Đăng ký các model với admin site
admin.site.register(User, UserAdmin)
admin.site.register(Topic, TopicAdmin)
admin.site.register(FlashcardSet, FlashcardSetAdmin)
admin.site.register(Flashcard, FlashcardAdmin)
admin.site.register(SavedFlashcardSet, SavedFlashcardSetAdmin)
admin.site.register(UserProgress, UserProgressAdmin)
admin.site.register(GameSession, GameSessionAdmin)
admin.site.register(Achievement, AchievementAdmin)
admin.site.register(UserAchievement, UserAchievementAdmin)
admin.site.register(UserFeedback, UserFeedbackAdmin)
admin.site.register(DailyStats, DailyStatsAdmin)

# Tùy chỉnh admin site
admin.site.site_header = "Flashcard App Admin"
admin.site.site_title = "Flashcard Admin"
admin.site.index_title = "Quản lý ứng dụng Flashcard"