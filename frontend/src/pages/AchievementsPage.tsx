// src/pages/AchievementsPage.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrophyIcon, 
  StarIcon, 
  FireIcon,
  AcademicCapIcon,
  PuzzlePieceIcon,
  CalendarIcon,
  CheckCircleIcon,
  BoltIcon,
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  BookOpenIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { achievementsAPI } from '../services/api';
import { Achievement, UserAchievement } from '../types';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

// Icon mapping object
const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  'trophy': TrophyIcon,
  'star': StarIcon,
  'academic-cap': AcademicCapIcon,
  'book-open': BookOpenIcon,
  'light-bulb': LightBulbIcon,
  'target': ChartBarIcon,
  'puzzle-piece': PuzzlePieceIcon,
  'bolt': BoltIcon,
  'rocket-launch': RocketLaunchIcon,
  'sparkles': SparklesIcon,
  'fire': FireIcon,
  'calendar': CalendarIcon,
  'clock': ClockIcon,
  'shield-check': ShieldCheckIcon,
  'heart': HeartIcon,
  'check-circle': CheckCircleIcon,
  'default': TrophyIcon
};

// Enhanced Achievement interface để handle dữ liệu mới từ backend
interface EnhancedAchievement extends Achievement {
  user_progress?: number;
  is_earned?: boolean;
  earned_at?: string;
  progress_percentage?: number;
}

const AchievementIcon: React.FC<{ 
  iconName: string; 
  rarity: string; 
  size?: string;
  className?: string;
}> = ({ iconName, rarity, size = 'h-12 w-12', className = '' }) => {
  const IconComponent = ICON_MAP[iconName] || ICON_MAP['default'];
  
  const rarityColors = {
    common: 'text-gray-500',
    uncommon: 'text-green-500',
    rare: 'text-blue-500',
    epic: 'text-purple-500',
    legendary: 'text-yellow-500'
  };
  
  const colorClass = rarityColors[rarity as keyof typeof rarityColors] || rarityColors.common;
  
  return (
    <div className={`${size} ${colorClass} ${className}`}>
      <IconComponent className="w-full h-full" />
    </div>
  );
};

const AchievementsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Fetch all achievements - backend giờ trả về array trực tiếp, không còn pagination
  const { 
    data: achievements = [], 
    isLoading 
  } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementsAPI.getAll().then(res => res.data as EnhancedAchievement[])
  });

  // Filter achievements by category
  const filteredAchievements = React.useMemo(() => {
    if (selectedCategory === 'all') return achievements;
    if (selectedCategory === 'earned') {
      return achievements.filter((a: EnhancedAchievement) => a.is_earned);
    }
    return achievements.filter((a: EnhancedAchievement) => a.achievement_type === selectedCategory);
  }, [achievements, selectedCategory]);

  // Stats calculations
  const earnedCount = achievements.filter((a: EnhancedAchievement) => a.is_earned).length;
  const totalPoints = achievements
    .filter((a: EnhancedAchievement) => a.is_earned)
    .reduce((sum, a) => sum + a.points, 0);
  const completionPercentage = achievements.length > 0 
    ? Math.round((earnedCount / achievements.length) * 100) 
    : 0;

  const categories = [
    { id: 'all', name: 'Tất cả', icon: TrophyIcon },
    { id: 'earned', name: 'Đã đạt được', icon: CheckCircleIcon },
    { id: 'learning', name: 'Học tập', icon: AcademicCapIcon },
    { id: 'gaming', name: 'Chơi game', icon: PuzzlePieceIcon },
    { id: 'streak', name: 'Chuỗi ngày', icon: FireIcon },
    { id: 'milestone', name: 'Cột mốc', icon: StarIcon }
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'uncommon': return 'bg-green-100 text-green-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRarityDisplay = (rarity: string) => {
    const rarityMap = {
      common: 'Thường',
      uncommon: 'Không thường',
      rare: 'Hiếm', 
      epic: 'Sử thi',
      legendary: 'Huyền thoại'
    };
    return rarityMap[rarity as keyof typeof rarityMap] || 'Thường';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Thành tích</h1>
        <p className="text-gray-600">
          Khám phá và mở khóa các thành tích trong hành trình học tập của bạn
        </p>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <Card className="text-center">
          <TrophyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-gray-900">{earnedCount}</h3>
          <p className="text-gray-600">Thành tích đã đạt</p>
        </Card>

        <Card className="text-center">
          <StarIcon className="h-12 w-12 text-blue-500 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-gray-900">{totalPoints}</h3>
          <p className="text-gray-600">Điểm thành tích</p>
        </Card>

        <Card className="text-center">
          <ChartBarIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <h3 className="text-2xl font-bold text-gray-900">{completionPercentage}%</h3>
          <p className="text-gray-600">Hoàn thành</p>
        </Card>
      </motion.div>

      {/* Category Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                    : 'bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {category.name}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Achievements Grid */}
      {filteredAchievements.length === 0 ? (
        <EmptyState
          icon={<TrophyIcon />}
          title="Không có thành tích nào"
          description="Không tìm thấy thành tích nào trong danh mục này"
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAchievements.map((achievement: EnhancedAchievement, index: number) => {
            const isEarned = achievement.is_earned || false;
            const progressPercentage = achievement.progress_percentage || 0;
            const userProgress = achievement.user_progress || 0;

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`relative overflow-hidden transition-all duration-300 ${
                    isEarned 
                      ? 'ring-2 ring-green-200 bg-gradient-to-br from-green-50 to-white' 
                      : 'hover:shadow-md opacity-75 hover:opacity-100'
                  }`}
                  hover={!isEarned}
                >
                  {/* Earned Badge */}
                  {isEarned && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-green-500 text-white rounded-full p-1">
                        <CheckCircleIcon className="h-5 w-5" />
                      </div>
                    </div>
                  )}

                  {/* Achievement Icon */}
                  <div className="text-center mb-4">
                    <div className="mb-4 flex justify-center">
                      <AchievementIcon 
                        iconName={achievement.icon} 
                        rarity={achievement.rarity}
                        size="h-16 w-16"
                        className={`${isEarned ? '' : 'grayscale'}`}
                      />
                    </div>
                    <Badge 
                      variant="secondary" 
                      size="sm"
                      className={getRarityColor(achievement.rarity)}
                    >
                      {getRarityDisplay(achievement.rarity)}
                    </Badge>
                  </div>

                  {/* Achievement Info */}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {achievement.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">
                      {achievement.description}
                    </p>
                    
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <StarIcon className="h-4 w-4 mr-1" />
                        {achievement.points} điểm
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar (for unearned achievements) */}
                  {!isEarned && progressPercentage > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Tiến trình</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {userProgress} / {achievement.requirement_value}
                      </div>
                    </div>
                  )}

                  {/* Earned Date */}
                  {isEarned && achievement.earned_at && (
                    <div className="flex items-center justify-center text-sm text-green-600">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Đạt được ngày {new Date(achievement.earned_at).toLocaleDateString('vi-VN')}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default AchievementsPage;