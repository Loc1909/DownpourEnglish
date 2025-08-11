// src/pages/StudyPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  // CheckIcon,
  // XMarkIcon,
  SpeakerWaveIcon,
  EyeIcon,
  // EyeSlashIcon,
  // HeartIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

import { flashcardSetsAPI, flashcardsAPI, userAPI } from '../services/api';
import { Flashcard, FlashcardSet } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

interface StudySession {
  flashcards: Flashcard[];
  currentIndex: number;
  showAnswer: boolean;
  completedCards: number[];
  correctAnswers: number;
  totalReviewed: number;
}

const StudyPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [session, setSession] = useState<StudySession>({
    flashcards: [],
    currentIndex: 0,
    showAnswer: false,
    completedCards: [],
    correctAnswers: 0,
    totalReviewed: 0,
  });

  const [studyMode, setStudyMode] = useState<'all' | 'difficult' | 'new'>('all');
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);

  // Get saved flashcard sets
  const { data: savedSets = [], isLoading: loadingSets } = useQuery({
    queryKey: ['saved-sets'],
    queryFn: () => userAPI.getSavedSets().then(res => res.data),
  });

  // Get flashcards for selected set
  const { data: setData, isLoading: loadingSet } = useQuery({
    queryKey: ['flashcard-set', setId],
    queryFn: () => flashcardSetsAPI.getById(Number(setId!)).then(res => res.data),
    enabled: !!setId,
  });

  // Study flashcard mutation
  const studyMutation = useMutation({
    mutationFn: (data: { id: number; is_correct: boolean; difficulty_rating?: number }) =>
      flashcardsAPI.study(data.id, { is_correct: data.is_correct, difficulty_rating: data.difficulty_rating }),
    onSuccess: (data) => {
      toast.success('Đã cập nhật tiến trình học tập!');
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

// Initialize study session
useEffect(() => {
  if (setData?.flashcards && setData.flashcards.length > 0) {
    setSession(prev => ({
      ...prev,
      flashcards: setData.flashcards!, // Non-null assertion
      currentIndex: 0,
    }));
    setSelectedSet(setData);
  }
}, [setData]);


  // Text-to-speech function
  const speakText = (text: string, lang: string = 'en-US') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const currentCard = session.flashcards[session.currentIndex];
  const progress = ((session.currentIndex + 1) / session.flashcards.length) * 100;

  const handleAnswer = (isCorrect: boolean, difficulty?: number) => {
    if (!currentCard) return;

    studyMutation.mutate({
      id: currentCard.id,
      is_correct: isCorrect,
      difficulty_rating: difficulty,
    });

    setSession(prev => ({
      ...prev,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      totalReviewed: prev.totalReviewed + 1,
      completedCards: [...prev.completedCards, prev.currentIndex],
    }));

    // Move to next card after a short delay
    setTimeout(() => {
      handleNext();
    }, 1000);
  };

  const handleNext = () => {
    if (session.currentIndex < session.flashcards.length - 1) {
      setSession(prev => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        showAnswer: false,
      }));
    } else {
      // Study session completed
      showCompletionSummary();
    }
  };

  const handlePrevious = () => {
    if (session.currentIndex > 0) {
      setSession(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1,
        showAnswer: false,
      }));
    }
  };

  const toggleAnswer = () => {
    setSession(prev => ({ ...prev, showAnswer: !prev.showAnswer }));
  };

  const showCompletionSummary = () => {
    const accuracy = session.totalReviewed > 0 
      ? Math.round((session.correctAnswers / session.totalReviewed) * 100) 
      : 0;

    toast.success(
      `Hoàn thành! Độ chính xác: ${accuracy}% (${session.correctAnswers}/${session.totalReviewed})`,
      { duration: 5000 }
    );
  };

  const handleSetSelect = (set: FlashcardSet) => {
    navigate(`/study/${set.id}`);
  };

  if (!setId) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Học tập</h1>
          <p className="text-gray-600">Chọn bộ flashcard để bắt đầu học</p>
        </motion.div>

        {loadingSets ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : savedSets.length === 0 ? (
          <EmptyState
            title="Chưa có bộ flashcard nào"
            description="Hãy lưu một số bộ flashcard để bắt đầu học tập"
            action={
              <Button onClick={() => navigate('/flashcard-sets')}>
                Khám phá bộ flashcard
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSets.map(({ flashcard_set }) => (
              <Card
                key={flashcard_set.id}
                hover
                onClick={() => handleSetSelect(flashcard_set)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {flashcard_set.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {flashcard_set.description}
                    </p>
                  </div>
                  <HeartSolidIcon className="h-5 w-5 text-red-500 ml-2 flex-shrink-0" />
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{flashcard_set.total_cards} thẻ</span>
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                    {flashcard_set.average_rating.toFixed(1)}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {flashcard_set.difficulty === 'beginner' && 'Cơ bản'}
                      {flashcard_set.difficulty === 'intermediate' && 'Trung bình'}
                      {flashcard_set.difficulty === 'advanced' && 'Nâng cao'}
                    </span>
                    <Button size="sm" variant="outline">
                      Học ngay
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loadingSet) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!currentCard) {
    return (
      <EmptyState
        title="Không có flashcard nào"
        description="Bộ flashcard này chưa có thẻ nào"
        action={
          <Button onClick={() => navigate('/flashcard-sets')}>
            Quay lại danh sách
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/study')}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            Quay lại
          </Button>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-900">{selectedSet?.title}</h1>
            <p className="text-gray-600">
              Thẻ {session.currentIndex + 1} / {session.flashcards.length}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-gray-600">Tiến trình</div>
          <div className="text-lg font-semibold text-blue-600">
            {Math.round(progress)}%
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
        <motion.div
          className="bg-blue-600 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Flashcard */}
      <motion.div
        key={session.currentIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="mb-8"
      >
        <Card className="min-h-[400px] flex flex-col justify-center items-center text-center p-8">
          <div className="w-full max-w-2xl">
            {/* Vietnamese word */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-8"
            >
              <div className="text-4xl font-bold text-gray-900 mb-4">
                {currentCard.vietnamese}
              </div>
              
              {currentCard.word_type && (
                <div className="inline-flex px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                  {currentCard.word_type === 'noun' && 'Danh từ'}
                  {currentCard.word_type === 'verb' && 'Động từ'}
                  {currentCard.word_type === 'adjective' && 'Tính từ'}
                  {currentCard.word_type === 'adverb' && 'Trạng từ'}
                  {currentCard.word_type === 'phrase' && 'Cụm từ'}
                  {currentCard.word_type === 'other' && 'Khác'}
                </div>
              )}
            </motion.div>

            {/* Answer section */}
            <AnimatePresence>
              {session.showAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="border-t border-gray-200 pt-8"
                >
                  <div className="text-2xl font-semibold text-green-700 mb-4 flex items-center justify-center">
                    {currentCard.english}
                    <button
                      onClick={() => speakText(currentCard.english)}
                      className="ml-3 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <SpeakerWaveIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {currentCard.example_sentence_en && (
                    <div className="text-gray-600 italic mb-6">
                      "{currentCard.example_sentence_en}"
                    </div>
                  )}

                  {/* Answer buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => handleAnswer(false, 2)}
                      leftIcon={<FaceFrownIcon className="h-5 w-5" />}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Khó
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAnswer(true, 4)}
                      leftIcon={<FaceSmileIcon className="h-5 w-5" />}
                      className="border-green-300 text-green-600 hover:bg-green-50"
                    >
                      Dễ
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Show answer button */}
            {!session.showAnswer && (
              <Button
                onClick={toggleAnswer}
                size="lg"
                leftIcon={<EyeIcon className="h-5 w-5" />}
              >
                Hiện đáp án
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={session.currentIndex === 0}
          leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
        >
          Trước
        </Button>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            Đúng: {session.correctAnswers}/{session.totalReviewed}
          </div>
          {session.totalReviewed > 0 && (
            <div className="text-sm font-medium text-blue-600">
              {Math.round((session.correctAnswers / session.totalReviewed) * 100)}% chính xác
            </div>
          )}
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={session.currentIndex === session.flashcards.length - 1}
          rightIcon={<ArrowRightIcon className="h-4 w-4" />}
        >
          Tiếp
        </Button>
      </div>
    </div>
  );
};

export default StudyPage;
