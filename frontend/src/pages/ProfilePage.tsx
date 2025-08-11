// src/pages/ProfilePage.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  UserIcon, 
  PencilIcon, 
  ChartBarIcon,
  TrophyIcon,
  BookOpenIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import { userAPI, achievementsAPI } from '../services/api';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: user?.display_name || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });

  const queryClient = useQueryClient();

  // Queries - Fixed to handle proper response format
  const { data: studySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['studySummary'],
    queryFn: () => userAPI.getStudySummary().then(res => res.data),
  });

  const { data: userAchievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['userAchievements'],
    queryFn: () => achievementsAPI.getUserAchievements().then(res => res.data),
  });

  const { data: savedSets, isLoading: savedSetsLoading } = useQuery({
    queryKey: ['savedSets'],
    queryFn: () => userAPI.getSavedSets().then(res => res.data),
  });

  // Take only first 4 achievements and 5 saved sets for display
  const displayAchievements = (userAchievements || []).slice(0, 4);
  const displaySavedSets = (savedSets || []).slice(0, 5);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof formData) => updateProfile(data),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Cập nhật thông tin thành công!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Có lỗi xảy ra');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (summaryLoading || achievementsLoading || savedSetsLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <Card className="text-center">
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.display_name || user.username}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                    <UserIcon className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>

              {/* User Info Form */}
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên hiển thị
                    </label>
                    <input
                      type="text"
                      name="display_name"
                      value={formData.display_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tên
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Họ
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      loading={updateProfileMutation.isPending}
                      className="flex-1"
                    >
                      Lưu
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      className="flex-1"
                    >
                      Hủy
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {user?.display_name || `${user?.first_name} ${user?.last_name}`.trim() || user?.username}
                    </h3>
                    <p className="text-gray-500">@{user?.username}</p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <TrophyIcon className="w-5 h-5 text-yellow-500" />
                    <span className="text-lg font-semibold text-gray-900">
                      {user?.total_points || 0} điểm
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    leftIcon={<PencilIcon className="w-4 h-4" />}
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                  >
                    Chỉnh sửa thông tin
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thống kê nhanh</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpenIcon className="w-5 h-5 text-blue-500" />
                  <span className="text-gray-600">Bộ đã lưu</span>
                </div>
                <span className="font-semibold">{studySummary?.total_sets_saved || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ChartBarIcon className="w-5 h-5 text-green-500" />
                  <span className="text-gray-600">Thẻ đã học</span>
                </div>
                <span className="font-semibold">{studySummary?.total_cards_studied || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ClockIcon className="w-5 h-5 text-purple-500" />
                  <span className="text-gray-600">Thời gian học</span>
                </div>
                <span className="font-semibold">
                  {formatTime(studySummary?.total_time_spent || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrophyIcon className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-600">Thành tích</span>
                </div>
                <span className="font-semibold">{studySummary?.total_achievements || 0}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Achievements */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Thành tích gần đây</h3>
              <Button
                variant="ghost"
                size="sm"
                as="a"
                href="/achievements"
              >
                Xem tất cả
              </Button>
            </div>

            {displayAchievements && displayAchievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayAchievements.map((userAchievement) => (
                  <motion.div
                    key={userAchievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{userAchievement.achievement.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {userAchievement.achievement.name}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                          {userAchievement.achievement.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge
                            variant={
                              userAchievement.achievement.rarity === 'legendary' ? 'warning' :
                              userAchievement.achievement.rarity === 'epic' ? 'danger' :
                              userAchievement.achievement.rarity === 'rare' ? 'info' : 'secondary'
                            }
                            size="sm"
                          >
                            {userAchievement.achievement.rarity_display}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            +{userAchievement.achievement.points} điểm
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrophyIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chưa có thành tích nào</p>
              </div>
            )}
          </Card>

          {/* Saved Flashcard Sets */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Bộ flashcard đã lưu</h3>
              <Button
                variant="ghost"
                size="sm"
                as="a"
                href="/flashcard-sets"
              >
                Xem tất cả
              </Button>
            </div>

            {displaySavedSets && displaySavedSets.length > 0 ? (
              <div className="space-y-4">
                {displaySavedSets.map((saved) => (
                  <motion.div
                    key={saved.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {saved.flashcard_set.title}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {saved.flashcard_set.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="primary" size="sm">
                          {saved.flashcard_set.topic.name}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {saved.flashcard_set.total_cards} thẻ
                        </span>
                        {saved.rating && (
                          <div className="flex items-center space-x-1">
                            <span className="text-yellow-400">★</span>
                            <span className="text-sm text-gray-600">{saved.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        as="a"
                        href={`/flashcard-sets/${saved.flashcard_set.id}`}
                      >
                        Xem
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chưa lưu bộ flashcard nào</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  as="a"
                  href="/flashcard-sets"
                >
                  Khám phá bộ flashcard
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfilePage;