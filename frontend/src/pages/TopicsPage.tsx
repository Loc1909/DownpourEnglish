import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpenIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  BriefcaseIcon,
  HeartIcon,
  MusicalNoteIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { topicsAPI, flashcardSetsAPI } from '../services/api';
import { Topic } from '../types';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';

const TopicsPage: React.FC = () => {
  const [openTopicId, setOpenTopicId] = React.useState<number | null>(null);
  const [isLoadingAI, setIsLoadingAI] = React.useState(false);
  const [aiSets, setAISets] = React.useState<any[]>([]);
  const { data: topicsResponse, isLoading, error } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsAPI.getAll(),
  });

  const topics: Topic[] = topicsResponse?.data?.results || [];

  const getTopicIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'academic-cap': AcademicCapIcon,
      'book-open': BookOpenIcon,
      'globe-alt': GlobeAltIcon,
      'briefcase': BriefcaseIcon,
      'heart': HeartIcon,
      'musical-note': MusicalNoteIcon,
    };

    return iconMap[iconName] || BookOpenIcon;
  };

  const getTopicColor = (index: number) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-green-500 to-teal-600',
      'from-purple-500 to-pink-600',
      'from-orange-500 to-red-600',
      'from-cyan-500 to-blue-600',
      'from-indigo-500 to-purple-600',
    ];
    return colors[index % colors.length];
  };

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Có lỗi xảy ra khi tải chủ đề. Vui lòng thử lại.</p>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <EmptyState
        icon={<BookOpenIcon className="h-12 w-12" />}
        title="Chưa có chủ đề nào"
        description="Hiện tại chưa có chủ đề học tập nào. Vui lòng quay lại sau."
      />
    );
  }



  const handleOpenAISuggestions = async (topicId: number) => {
    try {
      setIsLoadingAI(true);
      setOpenTopicId(topicId);
      const res = await topicsAPI.getAISuggestions(topicId, { limit: 10 });
      setAISets(res.data || []);
    } catch (e) {
      console.error(e);
      setAISets([]);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const closeModal = () => {
    setOpenTopicId(null);
    setAISets([]);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Chủ đề học từ vựng
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl">
              Khám phá các chủ đề đa dạng và bắt đầu hành trình học từ vựng tiếng Anh của bạn
            </p>
          </div>

        </div>
      </motion.div>

      {/* Topics Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      >
        {topics.map((topic: Topic, index: number) => {
          const IconComponent = getTopicIcon(topic.icon);
          const gradientColor = getTopicColor(index);

          return (
            <motion.div
              key={topic.id}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group"
            >
              <Link to={`/flashcard-sets?topic_id=${topic.id}`}>
                <div className="relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                  {/* Background Gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-5 group-hover:opacity-10 transition-opacity`} />

                  {/* Content */}
                  <div className="relative p-8">
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${gradientColor} mb-6 group-hover:scale-110 transition-transform`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {topic.name}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 mb-6 line-clamp-3">
                      {topic.description || 'Học từ vựng chuyên sâu về chủ đề này'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BookOpenIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {topic.flashcard_sets_count} bộ flashcard
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); handleOpenAISuggestions(topic.id); }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          Gợi ý AI
                        </button>
                        <div className="flex items-center space-x-1 text-blue-600 group-hover:text-blue-700 transition-colors">
                          <span className="text-sm font-medium">Khám phá</span>
                          <svg
                            className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Modal Gợi ý AI */}
      {openTopicId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Gợi ý bộ flashcard bằng AI</h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {isLoadingAI ? (
              <div className="py-10 flex justify-center"><LoadingSpinner /></div>
            ) : aiSets.length === 0 ? (
              <div className="py-10 text-center text-gray-600">Chưa có gợi ý phù hợp.</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-auto">
                {aiSets.map((set) => (
                  <Link
                    key={set.id}
                    to={`/flashcard-sets/${set.id}`}
                    onClick={closeModal}
                    className="block border rounded-xl p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">{set.title}</div>
                        <div className="text-sm text-gray-600 line-clamp-2">{set.description}</div>
                        <div className="mt-2 text-xs text-gray-500">Độ khó: {set.difficulty}</div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div>Lưu: {set.total_saves}</div>
                        <div>Đánh giá: {set.average_rating?.toFixed?.(1) ?? set.average_rating}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 text-right">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white text-center"
      >
        <h3 className="text-2xl font-bold mb-4">
          🚀 Sẵn sàng bắt đầu học?
        </h3>
        <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
          Chọn chủ đề yêu thích và bắt đầu hành trình nâng cao vốn từ vựng tiếng Anh của bạn ngay hôm nay!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/flashcard-sets"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Xem tất cả bộ flashcard
          </Link>
          <Link
            to="/study"
            className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
          >
            Bắt đầu học ngay
          </Link>
        </div>
      </motion.div>

      {/* Popular Topics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-50 rounded-2xl p-8"
      >
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          💡 Gợi ý học tập
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-2">Người mới bắt đầu</h4>
            <p className="text-gray-600 text-sm mb-4">
              Bắt đầu với các chủ đề cơ bản như từ vựng hàng ngày, gia đình, và màu sắc
            </p>
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Cơ bản
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                Dễ học
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-2">Nâng cao</h4>
            <p className="text-gray-600 text-sm mb-4">
              Thử thách bản thân với chủ đề kinh doanh, khoa học, và văn hóa
            </p>
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                Nâng cao
              </span>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                Thử thách
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TopicsPage;