// src/pages/StatsPage.tsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  ClockIcon,
  FireIcon,
  TrophyIcon,
  BookOpenIcon,
  PuzzlePieceIcon,
  CalendarDaysIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { statsAPI, userAPI } from '../services/api';
import { DailyStats, StudySummary } from '../types';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';

const StatsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);

  // Fetch daily stats - Fixed to handle paginated response
  const { data: dailyStatsResponse, isLoading: loadingStats } = useQuery({
    queryKey: ['daily-stats', selectedPeriod],
    queryFn: () => statsAPI.getDailyStats({ days: selectedPeriod }).then(res => res.data)
  });

  // Extract results from paginated response
  const dailyStats = dailyStatsResponse?.results || [];

  // Fetch study summary
  const { data: studySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['study-summary'],
    queryFn: () => userAPI.getStudySummary().then(res => res.data)
  });

  const isLoading = loadingStats || loadingSummary;

  // Prepare chart data
  const chartData = React.useMemo(() => {
    return dailyStats.map((stat: DailyStats) => ({
      date: new Date(stat.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
      cards: stat.cards_studied,
      time: stat.time_spent,
      games: stat.games_played,
      points: stat.points_earned,
      accuracy: stat.accuracy_rate
    })).reverse();
  }, [dailyStats]);

  // Calculate totals
  const totals = React.useMemo(() => {
    return dailyStats.reduce((acc: any, stat: DailyStats) => ({
      cards: acc.cards + stat.cards_studied,
      time: acc.time + stat.time_spent,
      games: acc.games + stat.games_played,
      points: acc.points + stat.points_earned,
      avgAccuracy: dailyStats.length > 0 ? dailyStats.reduce((sum: number, s: DailyStats) => sum + s.accuracy_rate, 0) / dailyStats.length : 0
    }), { cards: 0, time: 0, games: 0, points: 0, avgAccuracy: 0 });
  }, [dailyStats]);

  // Mastery distribution data for pie chart
  const masteryData = React.useMemo(() => {
    if (!studySummary?.mastery_distribution) return [];
    
    const ranges = [
      { name: 'Mới học (0-20%)', min: 0, max: 20, color: '#ef4444' },
      { name: 'Đang học (21-50%)', min: 21, max: 50, color: '#f97316' },
      { name: 'Khá (51-80%)', min: 51, max: 80, color: '#eab308' },
      { name: 'Giỏi (81-95%)', min: 81, max: 95, color: '#22c55e' },
      { name: 'Thành thạo (96-100%)', min: 96, max: 100, color: '#06b6d4' }
    ];

    return ranges.map(range => ({
      name: range.name,
      value: studySummary.mastery_distribution.reduce((sum: number, item: any) => {
        return item.mastery_level >= range.min && item.mastery_level <= range.max 
          ? sum + item.count 
          : sum;
      }, 0),
      color: range.color
    })).filter(item => item.value > 0);
  }, [studySummary]);

  const periods = [
    { value: 7, label: '7 ngày' },
    { value: 30, label: '30 ngày' },
    { value: 90, label: '90 ngày' }
  ];

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Thống kê học tập</h1>
            <p className="text-gray-600">
              Theo dõi tiến trình và thành tích học tập của bạn
            </p>
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-2 mt-4 sm:mt-0">
            {periods.map((period) => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4">
            <BookOpenIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{totals.cards}</h3>
          <p className="text-gray-600">Thẻ đã học</p>
          <Badge variant="info" size="sm" className="mt-2">
            {selectedPeriod} ngày qua
          </Badge>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4">
            <ClockIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{totals.time}</h3>
          <p className="text-gray-600">Phút học tập</p>
          <Badge variant="success" size="sm" className="mt-2">
            {Math.round(totals.time / selectedPeriod)} phút/ngày
          </Badge>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4">
            <PuzzlePieceIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{totals.games}</h3>
          <p className="text-gray-600">Game đã chơi</p>
          <Badge variant="secondary" size="sm" className="mt-2">
            {selectedPeriod} ngày qua
          </Badge>
        </Card>

        <Card className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-4">
            <TrophyIcon className="h-6 w-6 text-yellow-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{Math.round(totals.avgAccuracy)}%</h3>
          <p className="text-gray-600">Độ chính xác</p>
          <Badge 
            variant={totals.avgAccuracy >= 80 ? 'success' : totals.avgAccuracy >= 60 ? 'warning' : 'danger'} 
            size="sm" 
            className="mt-2"
          >
            Trung bình
          </Badge>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Learning Progress Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Tiến trình học tập</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="cards" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Thẻ học"
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Thời gian (phút)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Game Performance Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Hiệu suất game</h3>
              <PuzzlePieceIcon className="h-5 w-5 text-gray-400" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="games" fill="#8b5cf6" name="Số game" />
                <Bar dataKey="points" fill="#f59e0b" name="Điểm số" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mastery Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1"
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Phân bố thành thạo</h3>
              <AcademicCapIcon className="h-5 w-5 text-gray-400" />
            </div>
            {masteryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={masteryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {masteryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {masteryData.map((entry, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-gray-600">{entry.name}: </span>
                      <span className="font-medium ml-1">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <AcademicCapIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Chưa có dữ liệu thành thạo</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Study Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Tổng quan học tập</h3>
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            {studySummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {studySummary.total_sets_saved}
                  </div>
                  <div className="text-sm text-gray-600">Bộ thẻ đã lưu</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {studySummary.total_cards_studied}
                  </div>
                  <div className="text-sm text-gray-600">Thẻ đã học</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {Math.round(studySummary.total_time_spent / 60)}h
                  </div>
                  <div className="text-sm text-gray-600">Tổng thời gian</div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FireIcon className="h-6 w-6 text-orange-500 mr-1" />
                    <span className="text-2xl font-bold text-orange-600">
                      {studySummary.current_streak}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">Chuỗi ngày</div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default StatsPage;