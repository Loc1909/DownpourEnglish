from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from cloudinary.models import CloudinaryField
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


# Custom User Model
class User(AbstractUser):
    display_name = models.CharField(max_length=100, blank=True, verbose_name="Tên hiển thị")
    avatar = CloudinaryField(blank=True, null=True, verbose_name="Avatar")
    total_points = models.IntegerField(default=0, verbose_name="Tổng điểm")

    class Meta:
        verbose_name = "Người dùng"
        verbose_name_plural = "Người dùng"
        indexes = [
            models.Index(fields=['total_points']),
        ]


# Model cho chủ đề
class Topic(models.Model):
    name = models.CharField(max_length=100, verbose_name="Tên chủ đề")
    description = models.TextField(blank=True, verbose_name="Mô tả")
    icon = models.CharField(max_length=50, blank=True, verbose_name="Icon class")
    is_active = models.BooleanField(default=True, verbose_name="Đang hoạt động")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Chủ đề"
        verbose_name_plural = "Chủ đề"
        ordering = ['name']

    def __str__(self):
        return self.name


# Model cho bộ flashcard
class FlashcardSet(models.Model):
    DIFFICULTY_CHOICES = [
        ('beginner', 'Cơ bản'),
        ('intermediate', 'Trung bình'),
        ('advanced', 'Nâng cao')
    ]

    title = models.CharField(max_length=200, verbose_name="Tiêu đề")
    description = models.TextField(blank=True, verbose_name="Mô tả")
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, verbose_name="Chủ đề")
    creator = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Người tạo")
    is_public = models.BooleanField(default=False, verbose_name="Công khai")
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    total_cards = models.IntegerField(default=0, verbose_name="Tổng số thẻ")
    total_saves = models.IntegerField(default=0, verbose_name="Lượt lưu")
    average_rating = models.FloatField(default=0.0, verbose_name="Điểm trung bình")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Bộ flashcard"
        verbose_name_plural = "Bộ flashcard"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['topic', 'difficulty']),
            models.Index(fields=['is_public', 'created_at']),
            models.Index(fields=['total_saves']),
        ]

    def __str__(self):
        return self.title

    def update_total_cards(self):
        """Cập nhật tổng số thẻ"""
        self.total_cards = self.flashcards.count()
        self.save(update_fields=['total_cards'])

    def update_average_rating(self):
        """Cập nhật điểm trung bình"""
        from django.db.models import Avg
        avg_rating = SavedFlashcardSet.objects.filter(
            flashcard_set=self,
            rating__isnull=False
        ).aggregate(avg=Avg('rating'))['avg']

        self.average_rating = round(avg_rating, 1) if avg_rating else 0.0
        self.save(update_fields=['average_rating'])

    def update_total_saves(self):
        """Cập nhật tổng lượt lưu"""
        self.total_saves = SavedFlashcardSet.objects.filter(flashcard_set=self).count()
        self.save(update_fields=['total_saves'])


# Model cho thẻ flashcard riêng lẻ
class Flashcard(models.Model):
    flashcard_set = models.ForeignKey(FlashcardSet, related_name='flashcards', on_delete=models.CASCADE)
    vietnamese = models.CharField(max_length=500, verbose_name="Tiếng Việt")
    english = models.CharField(max_length=500, verbose_name="Tiếng Anh")
    example_sentence_en = models.TextField(blank=True, verbose_name="Câu ví dụ tiếng Anh")

    word_type = models.CharField(
        max_length=20,
        choices=[
            ('noun', 'Danh từ'),
            ('verb', 'Động từ'),
            ('adjective', 'Tính từ'),
            ('adverb', 'Trạng từ'),
            ('phrase', 'Cụm từ'),
            ('other', 'Khác')
        ],
        blank=True,
        verbose_name="Loại từ"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Flashcard"
        verbose_name_plural = "Flashcards"
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['vietnamese']),
            models.Index(fields=['english']),
        ]

    def __str__(self):
        return f"{self.vietnamese} - {self.english}"


# Model lưu bộ flashcard của người dùng
class SavedFlashcardSet(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Người dùng")
    flashcard_set = models.ForeignKey(FlashcardSet, on_delete=models.CASCADE, verbose_name="Bộ flashcard")
    saved_at = models.DateTimeField(auto_now_add=True)
    is_favorite = models.BooleanField(default=False, verbose_name="Yêu thích")
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True,
        verbose_name="Đánh giá (1-5 sao)"
    )

    class Meta:
        unique_together = ('user', 'flashcard_set')
        verbose_name = "Bộ flashcard đã lưu"
        verbose_name_plural = "Bộ flashcard đã lưu"

    def __str__(self):
        return f"{self.user.username} - {self.flashcard_set.title}"


# Model tiến trình học của người dùng
class UserProgress(models.Model):
    DIFFICULTY_LEVELS = [
        (1, 'Rất khó'),
        (2, 'Khó'),
        (3, 'Trung bình'),
        (4, 'Dễ'),
        (5, 'Rất dễ')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Người dùng")
    flashcard = models.ForeignKey(Flashcard, on_delete=models.CASCADE, verbose_name="Flashcard")
    mastery_level = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        verbose_name="Mức độ thành thạo (%)"
    )
    times_reviewed = models.IntegerField(default=0, verbose_name="Số lần ôn tập")
    times_correct = models.IntegerField(default=0, verbose_name="Số lần đúng")
    last_reviewed = models.DateTimeField(null=True, blank=True, verbose_name="Lần ôn cuối")
    difficulty_rating = models.IntegerField(
        choices=DIFFICULTY_LEVELS,
        null=True,
        blank=True,
        verbose_name="Đánh giá độ khó"
    )
    is_learned = models.BooleanField(default=False, verbose_name="Đã học")
    is_difficult = models.BooleanField(default=False, verbose_name="Từ khó")

    class Meta:
        unique_together = ('user', 'flashcard')
        verbose_name = "Tiến trình học"
        verbose_name_plural = "Tiến trình học"
        ordering = ['-last_reviewed']
        indexes = [
            models.Index(fields=['user', 'is_difficult']),
            models.Index(fields=['user', 'mastery_level']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.flashcard.vietnamese}"

    @property
    def accuracy_rate(self):
        if self.times_reviewed == 0:
            return 0
        return round((self.times_correct / self.times_reviewed) * 100, 1)


# Model cho các trò chơi mini
class GameSession(models.Model):
    GAME_TYPES = [
        ('word_match', 'Ghép từ nhanh'),
        ('guess_word', 'Đoán từ'),
        ('crossword', 'Ô chữ')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Người chơi")
    game_type = models.CharField(max_length=20, choices=GAME_TYPES, verbose_name="Loại game")
    score = models.IntegerField(default=0, verbose_name="Điểm số")
    total_questions = models.IntegerField(default=0, verbose_name="Tổng số câu")
    correct_answers = models.IntegerField(default=0, verbose_name="Số câu đúng")
    time_spent = models.IntegerField(default=0, verbose_name="Thời gian (giây)")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Phiên chơi game"
        verbose_name_plural = "Phiên chơi game"
        ordering = ['-completed_at']
        indexes = [
            models.Index(fields=['user', 'game_type']),
            models.Index(fields=['completed_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_game_type_display()} - {self.score}"

    @property
    def accuracy_percentage(self):
        if self.total_questions == 0:
            return 0
        return round((self.correct_answers / self.total_questions) * 100, 1)


# Model thành tích và huy hiệu
class Achievement(models.Model):
    ACHIEVEMENT_TYPES = [
        ('learning', 'Học tập'),
        ('gaming', 'Chơi game'),
        ('streak', 'Chuỗi ngày'),
        ('milestone', 'Cột mốc')
    ]

    name = models.CharField(max_length=100, verbose_name="Tên thành tích")
    description = models.TextField(verbose_name="Mô tả")
    icon = models.CharField(max_length=50, verbose_name="Icon")
    achievement_type = models.CharField(max_length=20, choices=ACHIEVEMENT_TYPES)
    requirement_value = models.IntegerField(verbose_name="Giá trị yêu cầu")
    points = models.IntegerField(default=10, verbose_name="Điểm thưởng")
    is_active = models.BooleanField(default=True, verbose_name="Đang hoạt động")

    rarity = models.CharField(
        max_length=20,
        choices=[
            ('common', 'Thường'),
            ('uncommon', 'Không thường'),
            ('rare', 'Hiếm'),
            ('epic', 'Sử thi'),
            ('legendary', 'Huyền thoại')
        ],
        default='common',
        verbose_name="Độ hiếm"
    )

    class Meta:
        verbose_name = "Thành tích"
        verbose_name_plural = "Thành tích"

    def __str__(self):
        return self.name


# Model thành tích của người dùng
class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Người dùng")
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, verbose_name="Thành tích")
    earned_at = models.DateTimeField(auto_now_add=True, verbose_name="Đạt được lúc")
    progress_value = models.IntegerField(default=0, verbose_name="Giá trị tiến trình")

    class Meta:
        unique_together = ('user', 'achievement')
        verbose_name = "Thành tích người dùng"
        verbose_name_plural = "Thành tích người dùng"
        ordering = ['-earned_at']

    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"


# Model phản hồi người dùng - Chỉ cho từ vựng
class UserFeedback(models.Model):
    RATING_CHOICES = [
        (1, '1 sao - Rất khó'),
        (2, '2 sao - Khó'),
        (3, '3 sao - Trung bình'),
        (4, '4 sao - Dễ'),
        (5, '5 sao - Rất dễ')
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Người dùng")
    flashcard = models.ForeignKey(Flashcard, on_delete=models.CASCADE, verbose_name="Flashcard")
    rating = models.IntegerField(choices=RATING_CHOICES, verbose_name="Đánh giá độ khó")
    comment = models.TextField(blank=True, verbose_name="Bình luận")
    is_processed = models.BooleanField(default=False, verbose_name="Đã xử lý")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'flashcard')  # Mỗi user chỉ feedback 1 lần cho 1 flashcard
        verbose_name = "Phản hồi từ vựng"
        verbose_name_plural = "Phản hồi từ vựng"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['flashcard', 'rating']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Feedback từ {self.user.username} cho '{self.flashcard.vietnamese}' - {self.rating} sao"


# Model thống kê học tập hàng ngày
class DailyStats(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Người dùng")
    date = models.DateField(verbose_name="Ngày")
    cards_studied = models.IntegerField(default=0, verbose_name="Số thẻ đã học")
    time_spent = models.IntegerField(default=0, verbose_name="Thời gian học (phút)")
    games_played = models.IntegerField(default=0, verbose_name="Số game đã chơi")
    points_earned = models.IntegerField(default=0, verbose_name="Điểm kiếm được")
    accuracy_rate = models.FloatField(default=0.0, verbose_name="Tỷ lệ chính xác (%)")
    new_words_learned = models.IntegerField(default=0, verbose_name="Từ mới học được")
    words_reviewed = models.IntegerField(default=0, verbose_name="Từ đã ôn tập")

    class Meta:
        unique_together = ('user', 'date')
        verbose_name = "Thống kê hàng ngày"
        verbose_name_plural = "Thống kê hàng ngày"
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.date}"

    # SIGNALS - Tự động cập nhật khi có thay đổi


@receiver(post_save, sender=Flashcard)
def update_flashcard_count_on_save(sender, instance, created, **kwargs):
    """Cập nhật số thẻ khi thêm flashcard mới"""
    if created:
        instance.flashcard_set.update_total_cards()


@receiver(post_delete, sender=Flashcard)
def update_flashcard_count_on_delete(sender, instance, **kwargs):
    """Cập nhật số thẻ khi xóa flashcard"""
    try:
        instance.flashcard_set.update_total_cards()
    except FlashcardSet.DoesNotExist:
        pass


@receiver(post_save, sender=SavedFlashcardSet)
def update_flashcard_set_stats_on_save(sender, instance, created, **kwargs):
    """Cập nhật thống kê khi lưu/đánh giá bộ flashcard"""
    instance.flashcard_set.update_total_saves()
    if instance.rating:
        instance.flashcard_set.update_average_rating()


@receiver(post_delete, sender=SavedFlashcardSet)
def update_flashcard_set_stats_on_delete(sender, instance, **kwargs):
    """Cập nhật thống kê khi bỏ lưu bộ flashcard"""
    try:
        instance.flashcard_set.update_total_saves()
        instance.flashcard_set.update_average_rating()
    except FlashcardSet.DoesNotExist:
        pass
