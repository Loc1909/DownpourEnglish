import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SpeakerWaveIcon,
  EyeIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  HeartIcon,
  StarIcon,
  BookmarkIcon,
  TrophyIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolidIcon,
  HeartIcon as HeartSolidIcon 
} from '@heroicons/react/24/solid';
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
  isCompleted: boolean;
  sessionStartTime: Date;
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
    isCompleted: false,
    sessionStartTime: new Date(),
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
      queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });

  // Save/unsave set mutation
  const saveMutation = useMutation({
    mutationFn: (setId: number) => flashcardSetsAPI.save(setId),
    onSuccess: (data) => {
      toast.success(data.data.message);
      queryClient.invalidateQueries({ queryKey: ['saved-sets'] });
      queryClient.invalidateQueries({ queryKey: ['flashcard-set', setId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    },
  });

  // Favorite/unfavorite set mutation
  const favoriteMutation = useMutation({
    mutationFn: (setId: number) => flashcardSetsAPI.favorite(setId),
    onSuccess: (data) => {
      toast.success(data.data.message);
      queryClient.invalidateQueries({ queryKey: ['saved-sets'] });
      queryClient.invalidateQueries({ queryKey: ['flashcard-set', setId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Có lỗi xảy ra');
    },
  });

  // Initialize study session
  useEffect(() => {
    if (setData?.flashcards && setData.flashcards.length > 0) {
      setSession(prev => ({
        ...prev,
        flashcards: setData.flashcards!,
        currentIndex: 0,
        sessionStartTime: new Date(),
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

  // Handle save/unsave
  const handleSaveSet = (setId: number) => {
    saveMutation.mutate(setId);
  };

  // Handle favorite/unfavorite
  const handleFavoriteSet = (setId: number) => {
    favoriteMutation.mutate(setId);
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
      setSession(prev => ({ ...prev, isCompleted: true }));
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

  const handleRestart = () => {
    setSession(prev => ({
      ...prev,
      currentIndex: 0,
      showAnswer: false,
      completedCards: [],
      correctAnswers: 0,
      totalReviewed: 0,
      isCompleted: false,
      sessionStartTime: new Date(),
    }));
  };

  const handleSetSelect = (set: FlashcardSet) => {
    navigate(`/study/${set.id}`);
  };

  // Calculate session statistics
  const getSessionStats = () => {
    const accuracy = session.totalReviewed > 0 
      ? Math.round((session.correctAnswers / session.totalReviewed) * 100) 
      : 0;
    
    const sessionDuration = Math.round((new Date().getTime() - session.sessionStartTime.getTime()) / 1000 / 60);
    
    return { accuracy, sessionDuration };
  };

  // Completion Screen Component
  const CompletionScreen = () => {
    const { accuracy, sessionDuration } = getSessionStats();

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center"
      >
        <Card className="p-8">
          {/* Trophy Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <TrophyIcon className="h-10 w-10 text-white" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 mb-4"
          >
            🎉 Chúc mừng!
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-600 mb-8"
          >
            Bạn đã hoàn thành bộ flashcard "{selectedSet?.title}"
          </motion.p>

          {/* Statistics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {session.flashcards.length}
              </div>
              <div className="text-sm text-gray-500">Tổng thẻ</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {session.correctAnswers}
              </div>
              <div className="text-sm text-gray-500">Đúng</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {accuracy}%
              </div>
              <div className="text-sm text-gray-500">Độ chính xác</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">
                {sessionDuration}
              </div>
              <div className="text-sm text-gray-500">Phút</div>
            </div>
          </motion.div>

          {/* Performance Feedback */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            {accuracy >= 90 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                  <span className="text-green-800 font-semibold">Xuất sắc!</span>
                </div>
                <p className="text-green-700">
                  Bạn đã nắm vững rất tốt các từ vựng trong bộ này!
                </p>
              </div>
            ) : accuracy >= 70 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircleIcon className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="text-blue-800 font-semibold">Tốt lắm!</span>
                </div>
                <p className="text-blue-700">
                  Bạn đã làm tốt! Hãy tiếp tục luyện tập để cải thiện hơn nữa.
                </p>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <XCircleIcon className="h-6 w-6 text-orange-600 mr-2" />
                  <span className="text-orange-800 font-semibold">Cần cải thiện</span>
                </div>
                <p className="text-orange-700">
                  Đừng lo! Hãy thử lại một lần nữa để ghi nhớ tốt hơn.
                </p>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              variant="outline"
              onClick={handleRestart}
              leftIcon={<ArrowPathIcon className="h-5 w-5" />}
            >
              Học lại
            </Button>

            <Button
              variant="primary"
              onClick={() => navigate('/study')}
            >
              Chọn bộ khác
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate(`/flashcard-sets/${selectedSet?.id}`)}
            >
              Xem chi tiết bộ thẻ
            </Button>
          </motion.div>

          {/* Share Achievement */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 pt-6 border-t border-gray-200"
          >
            <p className="text-sm text-gray-500 mb-4">
              Chia sẻ thành tích của bạn:
            </p>
            <div className="text-lg font-medium text-gray-700">
              "Tôi vừa hoàn thành bộ flashcard '{selectedSet?.title}' với độ chính xác {accuracy}%! 🎯"
            </div>
          </motion.div>
        </Card>
      </motion.div>
    );
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
          <p className="text-gray-600">Chọn bộ flashcard đã lưu để bắt đầu học</p>
        </motion.div>

        {loadingSets ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : savedSets.length === 0 ? (
          <EmptyState
            title="Chưa có bộ flashcard nào đã lưu"
            description="Hãy lưu một số bộ flashcard để bắt đầu học tập"
            action={
              <Button onClick={() => navigate('/flashcard-sets')}>
                Khám phá bộ flashcard
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedSets.map(({ flashcard_set, is_favorite, saved_at }) => (
              <Card
                key={flashcard_set.id}
                hover
                onClick={() => handleSetSelect(flashcard_set)}
                className="cursor-pointer"
              >
                {/* Header với icon actions */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {flashcard_set.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {flashcard_set.description}
                    </p>
                  </div>
                  
                  {/* Action buttons - Heart trái, Bookmark phải */}
                  <div className="ml-2 flex-shrink-0 flex items-center space-x-1">
                    {/* Favorite button - bên trái */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavoriteSet(flashcard_set.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title={is_favorite ? "Bỏ yêu thích" : "Thêm yêu thích"}
                    >
                      {is_favorite ? (
                        <HeartSolidIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <HeartIcon className="h-5 w-5" />
                      )}
                    </button>

                    {/* Save button - bên phải */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveSet(flashcard_set.id);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      title="Bỏ lưu"
                    >
                      <BookmarkSolidIcon className="h-5 w-5 text-blue-500" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{flashcard_set.total_cards} thẻ</span>
                  <div className="flex items-center space-x-1">
                    <StarIcon className="h-4 w-4 text-yellow-500" />
                    <span>{flashcard_set.average_rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  Đã lưu: {new Date(saved_at).toLocaleDateString('vi-VN')}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">
                      {flashcard_set.difficulty === 'beginner' && 'Cơ bản'}
                      {flashcard_set.difficulty === 'intermediate' && 'Trung bình'}
                      {flashcard_set.difficulty === 'advanced' && 'Nâng cao'}
                    </span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/flashcard-sets/${flashcard_set.id}`);
                      }}
                    >
                      Xem chi tiết
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="primary"
                      onClick={() => handleSetSelect(flashcard_set)}
                    >
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

  if (!currentCard && !session.isCompleted) {
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

  // Show completion screen
  if (session.isCompleted) {
    return <CompletionScreen />;
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