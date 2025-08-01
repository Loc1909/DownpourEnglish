// src/pages/LeaderboardPage.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  TrophyIcon,
  StarIcon,
  UserIcon,
  ChartBarIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { gameAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const LeaderboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedGameType, setSelectedGameType] = useState<string>('');

  const gameTypes = [
    { value: '', label: 'Tất cả trò chơi' },
    { value: 'word_match', label: 'Ghép từ nhanh' },
    { value: 'guess_word', label: 'Đoán từ' },
    { value: 'crossword', label: 'Ô chữ' },
  ];

  // Query for leaderboard data
  const { data: leaderboard, isLoading, error } = useQuery({
    queryKey: ['leaderboard', selectedGameType],
    queryFn: () => gameAPI.getLeaderboard(selectedGameType || undefined).then(res => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophyIcon className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <TrophyIcon className="w-6 h-6 text-gray-400" />;
      case 3:
        return <TrophyIcon className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return 'warning';
      case 2:
        return 'secondary';
      case 3:
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getRankBackground = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) {
      return 'bg-blue-50 border-blue-200';
    }
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
      case 2:
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
      case 3:
        return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={<ChartBarIcon className="w-12 h-12" />}
          title="Không thể tải bảng xếp hạng"
          description="Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau."
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <TrophyIcon className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">Bảng xếp hạng</h1>
          <TrophyIcon className="w-8 h-8 text-yellow-500" />
        </div>
        <p className="text-lg text-gray-600">
          Top những người chơi xuất sắc nhất
        </p>
      </div>

      {/* Game Type Filter */}
      <Card>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm font-medium text-gray-700">Lọc theo trò chơi:</span>
          {gameTypes.map((gameType) => (
            <button
              key={gameType.value}
              onClick={() => setSelectedGameType(gameType.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedGameType === gameType.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {gameType.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Leaderboard */}
      {leaderboard && leaderboard.length > 0 ? (
        <div className="space-y-4">
          {/* Top 3 Podium */}
          {leaderboard.slice(0, 3).length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">🏆 Top 3 xuất sắc</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 0, 2].map((index) => { // Arrange as 2nd, 1st, 3rd
                  const entry = leaderboard[index];
                  if (!entry) return null;
                  
                  const isCurrentUser = entry.user.id === user?.id;
                  const podiumHeight = index === 0 ? 'h-24' : 'h-20';
                  
                  return (
                    <motion.div
                      key={entry.user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`text-center ${index === 0 ? 'order-2' : index === 1 ? 'order-1' : 'order-3'}`}
                    >
                      <div className={`${podiumHeight} flex items-end justify-center mb-3`}>
                        <div className={`w-16 h-16 rounded-full overflow-hidden border-4 ${
                          entry.rank === 1 ? 'border-yellow-400' :
                          entry.rank === 2 ? 'border-gray-400' : 'border-amber-600'
                        } ${isCurrentUser ? 'ring-2 ring-blue-500' : ''}`}>
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.display_name || entry.user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                              entry.rank === 2 ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              <UserIcon className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {getRankIcon(entry.rank)}
                        <h4 className={`font-semibold ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
                          {entry.user.display_name || entry.user.username}
                        </h4>
                        <div className="text-2xl font-bold text-gray-900">
                          {entry.best_score}
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.total_games} game{entry.total_games !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Full Leaderboard */}
          <Card>
            <div className="space-y-1">
              <div className="flex items-center space-x-3 px-6 py-3 text-sm font-medium text-gray-500 border-b border-gray-200">
                <div className="w-8">Hạng</div>
                <div className="flex-1">Người chơi</div>
                <div className="w-20 text-center">Điểm cao nhất</div>
                <div className="w-20 text-center">Số game</div>
              </div>
              
              {leaderboard.map((entry, index) => {
                const isCurrentUser = entry.user.id === user?.id;
                
                return (
                  <motion.div
                    key={entry.user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center space-x-3 px-6 py-4 border-l-4 transition-colors ${
                      getRankBackground(entry.rank, isCurrentUser)
                    } ${isCurrentUser ? 'border-l-blue-500' : 'border-l-transparent'}`}
                  >
                    {/* Rank */}
                    <div className="w-8 flex items-center justify-center">
                      {entry.rank <= 3 ? (
                        getRankIcon(entry.rank)
                      ) : (
                        <Badge variant={getRankBadgeVariant(entry.rank)} size="sm">
                          #{entry.rank}
                        </Badge>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        {entry.user.avatar ? (
                          <img
                            src={entry.user.avatar}
                            alt={entry.user.display_name || entry.user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className={`font-medium ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
                          {entry.user.display_name || entry.user.username}
                          {isCurrentUser && (
                            <Badge variant="primary" size="sm" className="ml-2">
                              Bạn
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.user.total_points || 0} điểm tổng
                        </div>
                      </div>
                    </div>

                    {/* Best Score */}
                    <div className="w-20 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {entry.best_score}
                      </div>
                      <div className="flex items-center justify-center">
                        <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                      </div>
                    </div>

                    {/* Total Games */}
                    <div className="w-20 text-center">
                      <div className="text-lg font-semibold text-gray-700">
                        {entry.total_games}
                      </div>
                      <div className="text-xs text-gray-500">games</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* Stats Summary */}
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {leaderboard.length}
                </div>
                <div className="text-sm text-gray-500">Tổng người chơi</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.max(...leaderboard.map(entry => entry.best_score))}
                </div>
                <div className="text-sm text-gray-500">Điểm cao nhất</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(leaderboard.reduce((sum, entry) => sum + entry.total_games, 0) / leaderboard.length)}
                </div>
                <div className="text-sm text-gray-500">Trung bình games/người</div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState
          icon={<TrophyIcon className="w-12 h-12" />}
          title="Chưa có dữ liệu xếp hạng"
          description="Hãy chơi một số trò chơi để xuất hiện trên bảng xếp hạng!"
          action={
            <button
              onClick={() => window.location.href = '/games'}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Bắt đầu chơi
            </button>
          }
        />
      )}
    </motion.div>
  );
};

export default LeaderboardPage;