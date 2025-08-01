// src/pages/FlashcardSetDetailPage.tsx

import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  TrashIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

import { flashcardSetsAPI } from '../services/api';
import { Flashcard } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const FlashcardSetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showAnswers, setShowAnswers] = useState<{ [key: number]: boolean }>({});

  // Fetch flashcard set details
  const {
    data: flashcardSet,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['flashcard-set', id],
    queryFn: () => flashcardSetsAPI.getById(Number(id!)),
    enabled: !!id,
  });

  const set = flashcardSet?.data;

  const handleSaveSet = async () => {
    if (!set) return;
    
    try {
      const response = await flashcardSetsAPI.save(set.id);
      toast.success(response.data.message);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleRateSet = async (rating: number) => {
    if (!set) return;
    
    try {
      const response = await flashcardSetsAPI.rate(set.id, rating);
      toast.success(response.data.message);
      refetch();
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
                  >
                    Thêm thẻ
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<PencilIcon className="h-4 w-4" />}
                  >
                    Chỉnh sửa
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                leftIcon={<ChartBarIcon className="h-4 w-4" />}
              >
                Thống kê
              </Button>
            </div>
          </div>
        </div>
      </Card>

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
                <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
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
                      <button className="text-gray-400 hover:text-gray-600">
                        <EyeIcon className="h-5 w-5" />
                      </button>
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