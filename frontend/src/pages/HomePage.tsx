// src/pages/HomePage.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpenIcon,
  TrophyIcon,
  ChartBarIcon,
  PlayIcon,
  PlusIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { userAPI, flashcardSetsAPI, achievementsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';

const HomePage: React.FC = () => {
  const { user } = useAuthStore();

  // Fetch user study summary - returns object directly
  const { data: studySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['studySummary'],
    queryFn: () => userAPI.getStudySummary().then(res => res.data),
  });

  // Fetch recent flashcard sets - returns paginated response
  const { data: recentSetsResponse, isLoading: setsLoading } = useQuery({
    queryKey: ['recentFlashcardSets'],
    queryFn: () => flashcardSetsAPI.getAll({ ordering: '-created_at', page_size: 6 }),
  });

  // Fetch user achievements - returns array directly
  const { data: userAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['userAchievements'],
    queryFn: () => achievementsAPI.getUserAchievements().then(res => res.data),
  });

  const summary = studySummary;
  const sets = recentSetsResponse?.data.results || [];
  const achievements = (userAchievements || []).slice(0, 3); // Take first 3

  const quickActions = [
    {
      title: 'Học từ vựng',
      description: 'Bắt đầu học với bộ flashcard yêu thích',
      icon: BookOpenIcon,
      href: '/study',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
    },
    {
      title: 'Tạo bộ flashcard',
      description: 'Tạo bộ flashcard riêng cho chủ đề yêu thích',
      icon: PlusIcon,
      href: '/flashcard-sets',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
    },
    {
      title: 'Chơi game',
      description: 'Học qua các trò chơi thú vị',
      icon: PlayIcon,
      href: '/games',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
    },
    {
      title: 'Thống kê',
      description: 'Xem tiến trình học tập của bạn',
      icon: ChartBarIcon,
      href: '/stats',
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Chào mừng trở lại, {user?.display_name || user?.username}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              Hôm nay bạn đã sẵn sàng học từ vựng mới chưa?
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <FireIcon className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm font-medium">Streak</p>
              <p className="text-2xl font-bold">
                {summary?.current_streak || 0}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats overview */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <BookOpenIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Bộ đã lưu</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryLoading ? '...' : summary?.total_sets_saved || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <BookOpenIcon className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Từ đã học</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryLoading ? '...' : summary?.total_cards_studied || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrophyIcon className="h-6 w-6 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Thành tích</p>
              <p className="text-2xl font-bold text-gray-900">
                {summaryLoading ? '...' : summary?.total_achievements || 0}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-3 bg-orange-50 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-orange-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tổng điểm</p>
              <p className="text-2xl font-bold text-gray-900">
                {user?.total_points || 0}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Hành động nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, index) => (
            <motion.div key={action.title} variants={itemVariants}>
              <Link
                to={action.href}
                className="block group"
              >
                <div className={`${action.color} ${action.hoverColor} rounded-xl p-6 text-white transition-all transform group-hover:scale-105 shadow-lg`}>
                  <action.icon className="h-8 w-8 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent flashcard sets */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Bộ flashcard mới nhất</h2>
          <Link
            to="/flashcard-sets"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
          >
            Xem tất cả →
          </Link>
        </div>

        {setsLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="medium" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sets.map((set, index) => (
              <motion.div
                key={set.id}
                variants={itemVariants}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {set.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {set.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <BookOpenIcon className="h-4 w-4 mr-1" />
                        {set.total_cards} thẻ
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        set.difficulty === 'beginner' 
                          ? 'bg-green-100 text-green-800'
                          : set.difficulty === 'intermediate'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {set.difficulty === 'beginner' ? 'Cơ bản' : 
                         set.difficulty === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(set.average_rating) ? 'fill-current' : 'fill-gray-200'
                          }`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      ({set.total_saves} lượt lưu)
                    </span>
                  </div>
                  
                  <Link
                    to={`/flashcard-sets/${set.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                  >
                    Xem chi tiết
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent achievements */}
      {achievements.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Thành tích gần đây</h2>
            <Link
              to="/achievements"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              Xem tất cả →
            </Link>
          </div>

          {achievementsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="medium" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {achievements.map((userAchievement, index) => (
                <motion.div
                  key={userAchievement.id}
                  variants={itemVariants}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center mb-4">
                    <div className={`p-3 rounded-lg ${
                      userAchievement.achievement.rarity === 'legendary' ? 'bg-gradient-to-r from-purple-400 to-pink-400' :
                      userAchievement.achievement.rarity === 'epic' ? 'bg-gradient-to-r from-purple-400 to-blue-400' :
                      userAchievement.achievement.rarity === 'rare' ? 'bg-gradient-to-r from-blue-400 to-cyan-400' :
                      userAchievement.achievement.rarity === 'uncommon' ? 'bg-gradient-to-r from-green-400 to-blue-400' :
                      'bg-gray-100'
                    }`}>
                      <span className="text-2xl">{userAchievement.achievement.icon}</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {userAchievement.achievement.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {userAchievement.achievement.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      userAchievement.achievement.rarity === 'legendary' ? 'bg-purple-100 text-purple-800' :
                      userAchievement.achievement.rarity === 'epic' ? 'bg-indigo-100 text-indigo-800' :
                      userAchievement.achievement.rarity === 'rare' ? 'bg-blue-100 text-blue-800' :
                      userAchievement.achievement.rarity === 'uncommon' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {userAchievement.achievement.rarity_display}
                    </span>
                    <span className="text-sm font-medium text-orange-600">
                      +{userAchievement.achievement.points} điểm
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Study motivation */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl p-8 text-white text-center"
      >
        <h3 className="text-2xl font-bold mb-4">
          💪 Hãy duy trì động lực học tập!
        </h3>
        <p className="text-green-100 mb-6 max-w-2xl mx-auto">
          Học từ vựng mỗi ngày chỉ 15 phút sẽ giúp bạn cải thiện đáng kể khả năng tiếng Anh. 
          Hãy bắt đầu ngay hôm nay!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/study"
            className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Bắt đầu học ngay
          </Link>
          <Link
            to="/games"
            className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-colors"
          >
            Chơi game học từ vựng
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;