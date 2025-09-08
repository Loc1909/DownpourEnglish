// src/pages/CreateFlashcardSetPage.tsx

import React, { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  TrashIcon,
  BookOpenIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

import { flashcardSetsAPI, flashcardsAPI, topicsAPI } from '../services/api';
import { Topic } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface FlashcardFormData {
  vietnamese: string;
  english: string;
  example_sentence_en: string;
  word_type: string;
}

const CreateFlashcardSetPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [difficulty, setDifficulty] = useState('beginner');
  const [flashcards, setFlashcards] = useState<FlashcardFormData[]>([
    { vietnamese: '', english: '', example_sentence_en: '', word_type: '' }
  ]);

  // Fetch topics
  const { data: topicsData, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: () => topicsAPI.getAll(),
  });

  const topics = topicsData?.data.results || [];

  // Create flashcard set mutation
  const createSetMutation = useMutation({
    mutationFn: flashcardSetsAPI.create,
    onSuccess: (response) => {
      const flashcardSetId = response.data.id;
      
      // Tạo tất cả flashcards
      createFlashcardsMutation.mutate({
        flashcardSetId,
        flashcards: flashcards.filter(f => f.vietnamese && f.english)
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra khi tạo bộ flashcard');
    }
  });

  // Create flashcards mutation
  const createFlashcardsMutation = useMutation({
    mutationFn: async ({ flashcardSetId, flashcards }: { flashcardSetId: number, flashcards: FlashcardFormData[] }) => {
      const promises = flashcards.map(flashcard =>
        flashcardsAPI.create({
          flashcard_set: flashcardSetId,
          ...flashcard
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Tạo bộ flashcard thành công!');
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['flashcard-sets'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      
      // Redirect theo role
      if (user?.role === 'admin') {
        navigate('/admin/flashcard-sets');
        return;
      }

      // Redirect to the new flashcard set with "my" view mode if it's private
      const isPrivate = !isPublic;
      navigate(isPrivate ? '/flashcard-sets?view=my' : '/flashcard-sets');
    },
    onError: (error: any) => {
      toast.error('Có lỗi xảy ra khi tạo flashcards');
    }
  });

  const addFlashcard = () => {
    setFlashcards([...flashcards, { vietnamese: '', english: '', example_sentence_en: '', word_type: '' }]);
  };

  const removeFlashcard = (index: number) => {
    if (flashcards.length > 1) {
      setFlashcards(flashcards.filter((_, i) => i !== index));
    }
  };

  const updateFlashcard = (index: number, field: keyof FlashcardFormData, value: string) => {
    const newFlashcards = [...flashcards];
    newFlashcards[index][field] = value;
    setFlashcards(newFlashcards);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bộ flashcard');
      return;
    }
    
    if (!selectedTopic) {
      toast.error('Vui lòng chọn chủ đề');
      return;
    }
    
    const validFlashcards = flashcards.filter(f => f.vietnamese.trim() && f.english.trim());
    if (validFlashcards.length === 0) {
      toast.error('Vui lòng nhập ít nhất một flashcard');
      return;
    }

    // Tạo flashcard set trước
    createSetMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      topic: selectedTopic,
      is_public: isPublic,
      difficulty
    });
  };

  const isLoading = createSetMutation.isPending || createFlashcardsMutation.isPending;

  if (topicsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Tạo bộ Flashcard mới</h1>
        <p className="mt-2 text-gray-600">
          Tạo bộ flashcard của riêng bạn để học tập và chia sẻ với cộng đồng
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <BookOpenIcon className="h-5 w-5 mr-2" />
              Thông tin cơ bản
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tiêu đề <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề bộ flashcard..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn gọn về bộ flashcard..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chủ đề <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTopic || ''}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedTopic(Number(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Chọn chủ đề</option>
                  {topics.map((topic: Topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Độ khó
                </label>
                <select
                  value={difficulty}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Cơ bản</option>
                  <option value="intermediate">Trung bình</option>
                  <option value="advanced">Nâng cao</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quyền riêng tư
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center px-3 py-2 rounded-lg border ${
                      !isPublic
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    <LockClosedIcon className="h-4 w-4 mr-1" />
                    Riêng tư
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center px-3 py-2 rounded-lg border ${
                      isPublic
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    <GlobeAltIcon className="h-4 w-4 mr-1" />
                    Công khai
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Flashcards */}
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <PlusIcon className="h-5 w-5 mr-2" />
                Flashcards ({flashcards.filter(f => f.vietnamese && f.english).length})
              </h2>
              <Button
                type="button"
                onClick={addFlashcard}
                variant="outline"
                size="sm"
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                Thêm thẻ
              </Button>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {flashcards.map((flashcard, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Thẻ {index + 1}
                    </span>
                    {flashcards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFlashcard(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tiếng Việt <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={flashcard.vietnamese}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFlashcard(index, 'vietnamese', e.target.value)}
                        placeholder="Nhập từ tiếng Việt..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tiếng Anh <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={flashcard.english}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFlashcard(index, 'english', e.target.value)}
                        placeholder="Nhập từ tiếng Anh..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loại từ
                      </label>
                      <select
                        value={flashcard.word_type}
                        onChange={(e: ChangeEvent<HTMLSelectElement>) => updateFlashcard(index, 'word_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Chọn loại từ</option>
                        <option value="noun">Danh từ</option>
                        <option value="verb">Động từ</option>
                        <option value="adjective">Tính từ</option>
                        <option value="adverb">Trạng từ</option>
                        <option value="pronoun">Đại từ</option>
                        <option value="preposition">Giới từ</option>
                        <option value="conjunction">Liên từ</option>
                        <option value="interjection">Thán từ</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ví dụ câu
                      </label>
                      <input
                        type="text"
                        value={flashcard.example_sentence_en}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => updateFlashcard(index, 'example_sentence_en', e.target.value)}
                        placeholder="Nhập ví dụ câu tiếng Anh..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>

              {/* Add Card Button at the bottom */}
              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  onClick={addFlashcard}
                  variant="outline"
                  size="lg"
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                  className="min-w-[200px] border-dashed border-2 border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
                >
                  Thêm thẻ mới
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/flashcard-sets')}
          >
            Hủy bỏ
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            leftIcon={isLoading ? <LoadingSpinner size="small" /> : <PlusIcon className="h-4 w-4" />}
          >
            {isLoading ? 'Đang tạo...' : 'Tạo bộ flashcard'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateFlashcardSetPage;