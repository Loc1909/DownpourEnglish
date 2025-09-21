import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HeartIcon,
  BookmarkIcon,
  StarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import { flashcardSetsAPI } from '../services/api';
import { SavedFlashcardSet } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const FavoritesPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch favorites
  const {
    data: favoritesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => flashcardSetsAPI.getFavorites(),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const favorites = favoritesData?.data || [];

  const handleRemoveFromFavorites = async (setId: number) => {
    try {
      const response = await flashcardSetsAPI.favorite(setId);
      toast.success(response.data.message);
      
      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['favorites', user?.id]
        }),
        queryClient.invalidateQueries({
          queryKey: ['flashcard-set', setId]
        }),
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'flashcard-sets' && query.queryKey[1] === user?.id;
          }
        })
      ]);
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

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <HeartSolidIcon className="h-8 w-8 text-red-500 mr-3" />
            Bộ flashcard yêu thích
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {favorites.length} bộ flashcard được yêu thích
          </p>
        </div>
      </div>

      {/* Results */}
      {favorites.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="h-12 w-12" />}
          title="Chưa có bộ flashcard yêu thích nào"
          description="Thêm các bộ flashcard bạn thích vào danh sách yêu thích để dễ dàng truy cập"
          action={
            <Link to="/flashcard-sets">
              <Button>Khám phá bộ flashcard</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((saved: SavedFlashcardSet) => (
            <motion.div
              key={saved.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card hover className="h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Link
                      to={`/flashcard-sets/${saved.flashcard_set.id}`}
                      className="block text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                    >
                      {saved.flashcard_set.title}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {saved.flashcard_set.description}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveFromFavorites(saved.flashcard_set.id)}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="Bỏ yêu thích"
                  >
                    <HeartSolidIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Topic and Difficulty */}
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="secondary" size="sm">
                    {saved.flashcard_set.topic.name}
                  </Badge>
                  <Badge variant={getDifficultyColor(saved.flashcard_set.difficulty)} size="sm">
                    {getDifficultyText(saved.flashcard_set.difficulty)}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <BookmarkIcon className="h-4 w-4 mr-1" />
                    {saved.flashcard_set.total_cards} thẻ
                  </div>
                  <div className="flex items-center">
                    <UsersIcon className="h-4 w-4 mr-1" />
                    {saved.flashcard_set.total_saves} lưu
                  </div>
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 mr-1" />
                    {saved.flashcard_set.average_rating.toFixed(1)}
                  </div>
                </div>

                {/* Creator */}
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <span>Tạo bởi: {saved.flashcard_set.creator.display_name || saved.flashcard_set.creator.username}</span>
                </div>

                {/* Favorite date */}
                <div className="flex items-center text-xs text-gray-400 mb-4">
                  <span>Yêu thích từ: {new Date(saved.saved_at).toLocaleDateString('vi-VN')}</span>
                </div>

                {/* Actions */}
                <div className="mt-auto flex items-center justify-between">
                  <Link to={`/flashcard-sets/${saved.flashcard_set.id}`}>
                    <Button size="sm">Xem chi tiết</Button>
                  </Link>
                  
                  <Link to={`/study/${saved.flashcard_set.id}`}>
                    <Button size="sm" variant="outline">Học ngay</Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;