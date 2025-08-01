// src/pages/FlashcardSetsPage.tsx

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  BookmarkIcon,
  StarIcon,
  UsersIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

import { flashcardSetsAPI, topicsAPI } from '../services/api';
import { FlashcardSet, Topic } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const FlashcardSetsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [sortBy, setSortBy] = useState('created_at');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch flashcard sets
  const {
    data: flashcardSetsData,
    isLoading: setsLoading,
    refetch: refetchSets,
  } = useQuery({
    queryKey: ['flashcard-sets', searchQuery, selectedTopic, selectedDifficulty, sortBy],
    queryFn: () =>
      flashcardSetsAPI.getAll({
        q: searchQuery || undefined,
        topic_id: selectedTopic || undefined,
        difficulty: selectedDifficulty || undefined,
        ordering: sortBy.startsWith('-') ? sortBy : `-${sortBy}`,
      }),
  });

  // Fetch topics for filter
  const { data: topics } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsAPI.getAll(),
  });

  const flashcardSets = flashcardSetsData?.data.results || [];

  const handleSaveSet = async (setId: number) => {
    try {
      const response = await flashcardSetsAPI.save(setId);
      toast.success(response.data.message);
      refetchSets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleRateSet = async (setId: number, rating: number) => {
    try {
      const response = await flashcardSetsAPI.rate(setId, rating);
      toast.success(response.data.message);
      refetchSets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTopic(null);
    setSelectedDifficulty('');
    setSortBy('created_at');
  };

  if (setsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bộ Flashcard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Khám phá và học tập với hàng nghìn bộ flashcard
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            as={Link}
            to="/create-flashcard-set"
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            Tạo bộ mới
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm bộ flashcard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<FunnelIcon className="h-4 w-4" />}
          >
            Bộ lọc
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">Mới nhất</option>
              <option value="total_saves">Phổ biến nhất</option>
              <option value="average_rating">Đánh giá cao</option>
              <option value="total_cards">Nhiều thẻ nhất</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t pt-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Topic filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={selectedTopic || ''}
                    onChange={(e) => setSelectedTopic(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tất cả chủ đề</option>
                    {topics?.data.map((topic: Topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Độ khó
                  </label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tất cả độ khó</option>
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung bình</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                </div>

                {/* Clear filters */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    Xóa bộ lọc
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Results */}
      {flashcardSets.length === 0 ? (
        <EmptyState
          icon={<BookmarkIcon className="h-12 w-12" />}
          title="Không tìm thấy bộ flashcard nào"
          description="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc của bạn"
          action={
            <Button onClick={clearFilters} variant="outline">
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flashcardSets.map((set: FlashcardSet) => (
            <motion.div
              key={set.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card hover className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link
                      to={`/flashcard-sets/${set.id}`}
                      className="block text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {set.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {set.description}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleSaveSet(set.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    {set.is_saved ? (
                      <BookmarkSolidIcon className="h-5 w-5 text-blue-500" />
                    ) : (
                      <BookmarkIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Topic and Difficulty */}
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="secondary" size="sm">
                    {set.topic.name}
                  </Badge>
                  <Badge variant={getDifficultyColor(set.difficulty)} size="sm">
                    {getDifficultyText(set.difficulty)}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <BookmarkIcon className="h-4 w-4 mr-1" />
                    {set.total_cards} thẻ
                  </div>
                  <div className="flex items-center">
                    <UsersIcon className="h-4 w-4 mr-1" />
                    {set.total_saves} lưu
                  </div>
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 mr-1" />
                    {set.average_rating.toFixed(1)}
                  </div>
                </div>

                {/* Creator */}
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <span>Tạo bởi: {set.creator.display_name || set.creator.username}</span>
                </div>

                {/* Actions */}
                <div className="mt-auto flex items-center justify-between">
                  <Link to={`/flashcard-sets/${set.id}`}>
                    <Button size="sm">Xem chi tiết</Button>
                  </Link>
                  
                  {/* Rating */}
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRateSet(set.id, star)}
                        className="text-gray-300 hover:text-yellow-400 transition-colors"
                      >
                        {(set.user_rating && star <= set.user_rating) || star <= Math.round(set.average_rating) ? (
                          <StarSolidIcon className="h-4 w-4 text-yellow-400" />
                        ) : (
                          <StarIcon className="h-4 w-4" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlashcardSetsPage;