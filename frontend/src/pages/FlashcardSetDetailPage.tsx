// src/pages/FlashcardSetDetailPage.tsx

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  BookmarkIcon,
  StarIcon,
  PlayIcon,
  PlusIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

import { flashcardSetsAPI, topicsAPI, flashcardsAPI } from '../services/api';
import { Flashcard } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const FlashcardSetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showAnswers, setShowAnswers] = useState<{ [key: number]: boolean }>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    topic: 0,
    is_public: false,
    difficulty: 'beginner'
  });
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [addCardLoading, setAddCardLoading] = useState(false);
  const [newCard, setNewCard] = useState({
    vietnamese: '',
    english: '',
    example_sentence_en: '',
    word_type: 'noun'
  });

  // Fetch flashcard set details
  const {
    data: flashcardSet,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['flashcard-set', Number(id)],
    queryFn: () => flashcardSetsAPI.getById(Number(id!)),
    enabled: !!id,
    // Giảm stale time để đảm bảo dữ liệu được refresh
    staleTime: 2 * 60 * 1000, // 2 phút
  });

  const set = flashcardSet?.data;

  // Fetch topics for select
  const { data: topicsData } = useQuery({
    queryKey: ['topics', { page: 1, page_size: 100 }],
    queryFn: () => topicsAPI.getAll({ page: 1, page_size: 100 }).then(res => res.data),
  });
  const topics = topicsData?.results || [];

  const openEdit = () => {
    if (!set) return;
    setForm({
      title: set.title,
      description: set.description || '',
      topic: set.topic.id,
      is_public: set.is_public,
      difficulty: set.difficulty as any,
    });
    setIsEditOpen(true);
  };

  const handleDeleteSet = async () => {
    if (!set) return;
    const confirm = window.confirm('Bạn có chắc chắn muốn xóa bộ flashcard này? Hành động này không thể hoàn tác.');
    if (!confirm) return;
    try {
      await flashcardSetsAPI.delete(set.id);
      toast.success('Đã xóa bộ flashcard');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['flashcard-sets'] }),
        queryClient.invalidateQueries({ queryKey: ['topics'] }),
      ]);
      navigate('/flashcard-sets?view=my');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xóa bộ thất bại');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!set) return;
    try {
      setEditLoading(true);
      await flashcardSetsAPI.update(set.id, {
        title: form.title,
        description: form.description,
        topic: form.topic,
        is_public: form.is_public,
        difficulty: form.difficulty,
      });
      toast.success('Đã cập nhật bộ flashcard');
      setIsEditOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['flashcard-set', set.id] }),
        queryClient.invalidateQueries({ queryKey: ['flashcard-sets'] })
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Cập nhật thất bại');
    } finally {
      setEditLoading(false);
    }
  };
  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!set) return;
    try {
      setAddCardLoading(true);
      await flashcardsAPI.create({
        flashcard_set: set.id,
        vietnamese: newCard.vietnamese.trim(),
        english: newCard.english.trim(),
        example_sentence_en: newCard.example_sentence_en.trim() || undefined,
        word_type: newCard.word_type,
      });
      toast.success('Đã thêm thẻ');
      setIsAddCardOpen(false);
      setNewCard({ vietnamese: '', english: '', example_sentence_en: '', word_type: 'noun' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['flashcard-set', set.id] }),
        queryClient.invalidateQueries({ queryKey: ['flashcard-sets'] }),
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Thêm thẻ thất bại');
    } finally {
      setAddCardLoading(false);
    }
  };

  const handleDeleteFlashcard = async (flashcardId: number) => {
    if (!set) return;
    try {
      await flashcardsAPI.delete(flashcardId);
      toast.success('Đã xóa thẻ');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['flashcard-set', set.id] }),
        queryClient.invalidateQueries({ queryKey: ['flashcard-sets'] }),
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Xóa thẻ thất bại');
    }
  };

  const handleSaveSet = async () => {
    if (!set) return;

    try {
      const response = await flashcardSetsAPI.save(set.id);
      toast.success(response.data.message);

      // Invalidate cả detail và list queries để đồng bộ dữ liệu
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['flashcard-set', set.id]
        }),
        queryClient.invalidateQueries({
          queryKey: ['flashcard-sets']
        })
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleRateSet = async (rating: number) => {
    if (!set) return;

    try {
      const response = await flashcardSetsAPI.rate(set.id, rating);
      toast.success(response.data.message);

      // Invalidate cả detail và list queries để đồng bộ dữ liệu
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['flashcard-set', set.id]
        }),
        queryClient.invalidateQueries({
          queryKey: ['flashcard-sets']
        })
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const toggleAnswer = (flashcardId: number) => {
    setShowAnswers(prev => ({
      ...prev,
      [flashcardId]: !prev[flashcardId]
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'Cơ bản';
      case 'intermediate':
        return 'Trung bình';
      case 'advanced':
        return 'Nâng cao';
      default:
        return difficulty;
    }
  };

  const getWordTypeText = (type: string) => {
    const types: { [key: string]: string } = {
      noun: 'Danh từ',
      verb: 'Động từ',
      adjective: 'Tính từ',
      adverb: 'Trạng từ',
      phrase: 'Cụm từ',
      other: 'Khác',
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!set) {
    return (
      <EmptyState
        title="Không tìm thấy bộ flashcard"
        description="Bộ flashcard này có thể đã bị xóa hoặc không tồn tại"
        action={
          <Button as={Link} to="/flashcard-sets">
            Quay lại danh sách
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
      >
        Quay lại
      </Button>

      {/* Header */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{set.title}</h1>
              <button
                onClick={handleSaveSet}
                className="ml-4 p-2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {set.is_saved ? (
                  <BookmarkSolidIcon className="h-6 w-6 text-blue-500" />
                ) : (
                  <BookmarkIcon className="h-6 w-6" />
                )}
              </button>
            </div>

            <p className="text-gray-600 mb-4">{set.description}</p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="secondary">{set.topic.name}</Badge>
              <Badge variant={getDifficultyColor(set.difficulty)}>
                {getDifficultyText(set.difficulty)}
              </Badge>
              {!set.is_public && (
                <Badge variant="warning">Riêng tư</Badge>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{set.total_cards}</div>
                <div className="text-sm text-gray-500">Thẻ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{set.total_saves}</div>
                <div className="text-sm text-gray-500">Lượt lưu</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {set.average_rating.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Đánh giá</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {set.creator.total_points}
                </div>
                <div className="text-sm text-gray-500">Điểm tác giả</div>
              </div>
            </div>

            {/* Creator info */}
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6">
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-1" />
                {set.creator.display_name || set.creator.username}
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {new Date(set.created_at).toLocaleDateString('vi-VN')}
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2 mb-6">
              <span className="text-sm font-medium text-gray-700">Đánh giá của bạn:</span>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRateSet(star)}
                    className="text-gray-300 hover:text-yellow-400 transition-colors"
                  >
                    {set.user_rating && star <= set.user_rating ? (
                      <StarSolidIcon className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <StarIcon className="h-5 w-5" />
                    )}
                  </button>
                ))}
              </div>
              {set.user_rating && (
                <span className="text-sm text-gray-500">({set.user_rating}/5)</span>
              )}
            </div>


            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button
                as={Link}
                to={`/study/${set.id}`}
                leftIcon={<PlayIcon className="h-4 w-4" />}
                size="lg"
              >
                Bắt đầu học
              </Button>

              {user?.id === set.creator.id && (
                <>
                  <Button
                    variant="outline"
                    leftIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setIsAddCardOpen(true)}
                  >
                    Thêm thẻ
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<PencilIcon className="h-4 w-4" />}
                    onClick={openEdit}
                  >
                    Chỉnh sửa
                  </Button>
                  <Button variant="danger" onClick={handleDeleteSet}>
                    Xóa bộ
                  </Button>
                </>
              )}


            </div>
          </div>
        </div>
      </Card>

      {/* Edit modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Chỉnh sửa bộ flashcard" size="lg">
        <form className="space-y-4" onSubmit={handleEditSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.topic}
                onChange={(e) => setForm(prev => ({ ...prev, topic: Number(e.target.value) }))}
              >
                {topics.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Độ khó</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.difficulty}
                onChange={(e) => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
              >
                <option value="beginner">Cơ bản</option>
                <option value="intermediate">Trung bình</option>
                <option value="advanced">Nâng cao</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                checked={form.is_public}
                onChange={(e) => setForm(prev => ({ ...prev, is_public: e.target.checked }))}
              />
              <span className="ml-2 text-sm text-gray-700">Công khai</span>
            </label>
            <div className="space-x-2">
              <Button variant="ghost" type="button" onClick={() => setIsEditOpen(false)}>Hủy</Button>
              <Button type="submit" loading={editLoading}>Lưu thay đổi</Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Flashcard modal */}
      <Modal isOpen={isAddCardOpen} onClose={() => setIsAddCardOpen(false)} title="Thêm thẻ mới" size="lg">
        <form className="space-y-4" onSubmit={handleAddCardSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiếng Việt</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newCard.vietnamese}
                onChange={(e) => setNewCard(prev => ({ ...prev, vietnamese: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiếng Anh</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newCard.english}
                onChange={(e) => setNewCard(prev => ({ ...prev, english: e.target.value }))}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ví dụ (tiếng Anh)</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={newCard.example_sentence_en}
              onChange={(e) => setNewCard(prev => ({ ...prev, example_sentence_en: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại từ</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newCard.word_type}
              onChange={(e) => setNewCard(prev => ({ ...prev, word_type: e.target.value }))}
            >
              <option value="noun">Danh từ</option>
              <option value="verb">Động từ</option>
              <option value="adjective">Tính từ</option>
              <option value="adverb">Trạng từ</option>
              <option value="phrase">Cụm từ</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" type="button" onClick={() => setIsAddCardOpen(false)}>Hủy</Button>
            <Button type="submit" loading={addCardLoading}>Thêm thẻ</Button>
          </div>
        </form>
      </Modal>

      {/* Flashcards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Danh sách thẻ ({set.flashcards?.length || 0})
          </h2>
        </div>

        {!set.flashcards || set.flashcards.length === 0 ? (
          <EmptyState
            icon={<BookmarkIcon className="h-12 w-12" />}
            title="Bộ flashcard này chưa có thẻ nào"
            description="Hãy thêm thẻ đầu tiên để bắt đầu học tập"
            action={
              user?.id === set.creator.id ? (
                <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setIsAddCardOpen(true)}>
                  Thêm thẻ đầu tiên
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {set.flashcards.map((flashcard: Flashcard, index: number) => (
              <motion.div
                key={flashcard.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  hover
                  className="cursor-pointer"
                  onClick={() => toggleAnswer(flashcard.id)}
                >
                  <div className="space-y-3">
                    {/* Front side */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          {flashcard.vietnamese}
                        </div>
                        {flashcard.word_type && (
                          <Badge variant="secondary" size="sm">
                            {getWordTypeText(flashcard.word_type)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {user?.id === set.creator.id && (
                          <button
                            className="text-red-500 hover:text-red-600 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFlashcard(flashcard.id);
                            }}
                          >
                            Xóa
                          </button>
                        )}
                        <button className="text-gray-400 hover:text-gray-600">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Back side */}
                    {showAnswers[flashcard.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t pt-3 space-y-2"
                      >
                        <div className="text-blue-600 font-medium">
                          {flashcard.english}
                        </div>
                        {flashcard.example_sentence_en && (
                          <div className="text-sm text-gray-600 italic">
                            <strong>Ví dụ:</strong> {flashcard.example_sentence_en}
                          </div>
                        )}

                        {/* Progress indicator */}
                        {flashcard.user_progress && (
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                  width: `${flashcard.user_progress.mastery_level}%`
                                }}
                              />
                            </div>
                            <span>{flashcard.user_progress.mastery_level}%</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardSetDetailPage;