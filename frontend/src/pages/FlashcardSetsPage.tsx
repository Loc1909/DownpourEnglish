// src/pages/FlashcardSetsPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  BookmarkIcon,
  StarIcon,
  UsersIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import {
  BookmarkIcon as BookmarkSolidIcon,
  StarIcon as StarSolidIcon,
  HeartIcon as HeartSolidIcon
} from '@heroicons/react/24/solid';

import { flashcardSetsAPI, topicsAPI } from '../services/api';
import { FlashcardSet, Topic } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import useDebounce from '../hooks/useDebounce';

const FlashcardSetsPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [sortBy, setSortBy] = useState('created_at');
  const [showFilters, setShowFilters] = useState(false);

  // Ref để giữ focus cho input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query với delay 300ms
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Đọc topic_id từ URL parameters khi component mount
  useEffect(() => {
    const topicIdParam = searchParams.get('topic_id');
    if (topicIdParam) {
      const topicId = parseInt(topicIdParam);
      if (!isNaN(topicId)) {
        setSelectedTopic(topicId);
        setShowFilters(true); // Hiển thị filters để user thấy topic đã được chọn
      }
    }
  }, [searchParams]);

  // Cập nhật URL khi filters thay đổi
  useEffect(() => {
    const newSearchParams = new URLSearchParams();

    if (debouncedSearchQuery) newSearchParams.set('q', debouncedSearchQuery);
    if (selectedTopic) newSearchParams.set('topic_id', selectedTopic.toString());
    if (selectedDifficulty) newSearchParams.set('difficulty', selectedDifficulty);
    if (sortBy !== 'created_at') newSearchParams.set('ordering', sortBy);

    // Chỉ cập nhật URL nếu có thay đổi
    if (newSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [debouncedSearchQuery, selectedTopic, selectedDifficulty, sortBy, searchParams, setSearchParams]);

  // Tạo query key bao gồm cả user ID để đảm bảo data được phân biệt theo user
  const createFlashcardSetsQueryKey = () => [
    'flashcard-sets',
    user?.id, // Thêm user ID vào query key
    debouncedSearchQuery,
    selectedTopic,
    selectedDifficulty,
    sortBy
  ];

  // Fetch flashcard sets với query key bao gồm user ID
  const {
    data: flashcardSetsData,
    isLoading: setsLoading,
    isFetching: setsFetching,
    refetch: refetchSets,
  } = useQuery({
    queryKey: createFlashcardSetsQueryKey(),
    queryFn: () =>
      flashcardSetsAPI.getAll({
        q: debouncedSearchQuery || undefined,
        topic_id: selectedTopic || undefined,
        difficulty: selectedDifficulty || undefined,
        ordering: sortBy.startsWith('-') ? sortBy : `-${sortBy}`,
      }),
    // Chỉ fetch khi user đã được load
    enabled: !!user,
    // Giữ dữ liệu cũ khi fetch dữ liệu mới
    placeholderData: (prev) => prev,
    // Cache dữ liệu trong 3 phút (giảm từ 5 phút để data fresh hơn)
    staleTime: 3 * 60 * 1000,
    // Refetch khi window focus
    refetchOnWindowFocus: false,
  });

  // Fetch topics for filter - không cần user ID vì topics là public
  const { data: topicsData } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsAPI.getAll(),
  });

  const flashcardSets = flashcardSetsData?.data.results || [];
  const topics = topicsData?.data.results || [];

  // Hiển thị loading indicator nhỏ khi đang fetch (không phải loading lần đầu)
  const isSearching = setsFetching && !setsLoading;

  // Effect để clear data khi user thay đổi
  useEffect(() => {
    if (user?.id) {
      // Invalidate tất cả queries liên quan đến flashcard-sets khi user thay đổi
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'flashcard-sets';
        }
      });
    }
  }, [user?.id, queryClient]);

  const handleSaveSet = async (setId: number) => {
    try {
      const response = await flashcardSetsAPI.save(setId);
      toast.success(response.data.message);

      // Invalidate queries với user ID cụ thể
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'flashcard-sets' && query.queryKey[1] === user?.id;
          }
        }),
        queryClient.invalidateQueries({
          queryKey: ['flashcard-set', setId]
        }),
        // Invalidate saved sets của user
        queryClient.invalidateQueries({
          queryKey: ['savedSets', user?.id]
        })
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleRateSet = async (setId: number, rating: number) => {
    try {
      const response = await flashcardSetsAPI.rate(setId, rating);
      toast.success(response.data.message);

      // Invalidate queries với user ID cụ thể
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'flashcard-sets' && query.queryKey[1] === user?.id;
          }
        }),
        queryClient.invalidateQueries({
          queryKey: ['flashcard-set', setId]
        })
      ]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const handleFavoriteSet = async (setId: number) => {
    try {
      const response = await flashcardSetsAPI.favorite(setId);
      toast.success(response.data.message);

      // Invalidate queries với user ID cụ thể
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: (query) => {
            return query.queryKey[0] === 'flashcard-sets' && query.queryKey[1] === user?.id;
          }
        }),
        queryClient.invalidateQueries({
          queryKey: ['flashcard-set', setId]
        }),
        // Invalidate favorites và saved sets của user
        queryClient.invalidateQueries({
          queryKey: ['favorites', user?.id]
        }),
        queryClient.invalidateQueries({
          queryKey: ['savedSets', user?.id]
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTopic(null);
    setSelectedDifficulty('');
    setSortBy('created_at');
    // Clear URL params
    setSearchParams({}, { replace: true });
    // Focus lại vào input sau khi clear
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  };

  // Xử lý khi nhập vào ô tìm kiếm
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Xử lý khi thay đổi topic filter
  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedTopic(value ? Number(value) : null);
  };

  // Hiển thị loading nếu chưa có user hoặc đang loading lần đầu
  if (!user || setsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Tìm tên topic hiện tại để hiển thị
  const currentTopicName = selectedTopic
    ? topics.find(topic => topic.id === selectedTopic)?.name
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bộ Flashcard
            {currentTopicName && (
              <span className="text-blue-600 ml-2">- {currentTopicName}</span>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {currentTopicName
              ? `Khám phá các bộ flashcard về chủ đề ${currentTopicName}`
              : 'Khám phá và học tập với hàng nghìn bộ flashcard'
            }
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
            ref={searchInputRef}
            type="text"
            placeholder="Tìm kiếm bộ flashcard..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {/* Loading indicator nhỏ khi đang search */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
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
            {(selectedTopic || selectedDifficulty) && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                {[selectedTopic && 'Chủ đề', selectedDifficulty && 'Độ khó'].filter(Boolean).length}
              </span>
            )}
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
                    onChange={handleTopicChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tất cả chủ đề</option>
                    {topics.map((topic: Topic) => (
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
      <div className="relative">
        {/* Overlay loading khi đang search */}
        {isSearching && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-gray-600">Đang tìm kiếm...</span>
            </div>
          </div>
        )}

        {flashcardSets.length === 0 ? (
          <EmptyState
            icon={<BookmarkIcon className="h-12 w-12" />}
            title="Không tìm thấy bộ flashcard nào"
            description={
              currentTopicName
                ? `Không có bộ flashcard nào cho chủ đề "${currentTopicName}" với các tiêu chí đã chọn`
                : "Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc của bạn"
            }
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

                    <div className="ml-2 flex space-x-1">
                      {/* Favorite button */}
                      <button
                        onClick={() => handleFavoriteSet(set.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title={set.is_favorite ? "Bỏ yêu thích" : "Thêm yêu thích"}
                      >
                        {set.is_favorite ? (
                          <HeartSolidIcon className="h-5 w-5 text-red-500" />
                        ) : (
                          <HeartIcon className="h-5 w-5" />
                        )}
                      </button>

                      {/* Save button */}
                      <button
                        onClick={() => handleSaveSet(set.id)}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                        title={set.is_saved ? "Bỏ lưu" : "Lưu bộ flashcard"}
                      >
                        {set.is_saved ? (
                          <BookmarkSolidIcon className="h-5 w-5 text-blue-500" />
                        ) : (
                          <BookmarkIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
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

                    {/* Rating - Hiển thị rating của user hiện tại */}
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRateSet(set.id, star)}
                          className="text-gray-300 hover:text-yellow-400 transition-colors"
                        >
                          {set.user_rating && star <= set.user_rating ? (
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
    </div>
  );
};

export default FlashcardSetsPage;