// src/pages/GamePage.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  PuzzlePieceIcon,
  ClockIcon,
  TrophyIcon,
  PlayIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { gameAPI, flashcardSetsAPI } from '../services/api';
import { FlashcardSet, Flashcard } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
//import Badge from '../components/common/Badge';
import toast from 'react-hot-toast';

interface GameState {
  type: 'word_match' | 'guess_word' | 'crossword' | null;
  flashcardSet: FlashcardSet | null;
  questions: Flashcard[];
  currentQuestionIndex: number;
  score: number;
  correctAnswers: number;
  timeLeft: number;
  gameStarted: boolean;
  gameFinished: boolean;
  startTime: number;
  userAnswers: { [key: number]: string };
  showResult: boolean;
}

const GAME_TIME = 60; // 60 seconds per game

const GamePage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    type: null,
    flashcardSet: null,
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    correctAnswers: 0,
    timeLeft: GAME_TIME,
    gameStarted: false,
    gameFinished: false,
    startTime: 0,
    userAnswers: {},
    showResult: false
  });

  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showAnswer, setShowAnswer] = useState(false);

  // Query for flashcard sets
  const { data: flashcardSets, isLoading: setsLoading } = useQuery({
    queryKey: ['flashcardSets'],
    queryFn: () => flashcardSetsAPI.getAll().then(res => res.data.results),
  });

  // Mutation for saving game session
  const saveGameMutation = useMutation({
    mutationFn: (gameData: {
      game_type: string;
      score: number;
      total_questions: number;
      correct_answers: number;
      time_spent: number;
    }) => gameAPI.createSession(gameData),
    onSuccess: () => {
      toast.success('Đã lưu kết quả game!');
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.gameStarted && !gameState.gameFinished && gameState.timeLeft > 0) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1
        }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.gameStarted) {
      finishGame();
    }

    return () => clearInterval(interval);
  }, [gameState.gameStarted, gameState.gameFinished, gameState.timeLeft]);

  const gameTypes = [
    {
      id: 'word_match' as const,
      name: 'Ghép từ nhanh',
      description: 'Tìm nghĩa đúng của từ tiếng Anh',
      icon: PuzzlePieceIcon,
      color: 'bg-blue-500',
    },
    {
      id: 'guess_word' as const,
      name: 'Đoán từ',
      description: 'Đoán từ tiếng Anh từ nghĩa tiếng Việt',
      icon: TrophyIcon,
      color: 'bg-green-500',
    },
  ];

  const startGame = async (gameType: typeof gameState.type, flashcardSet: FlashcardSet) => {
    try {
      // Get flashcards for the selected set
      const response = await flashcardSetsAPI.getFlashcards(flashcardSet.id);
      const flashcards = response.data;

      if (flashcards.length < 5) {
        toast.error('Bộ flashcard cần có ít nhất 5 thẻ để chơi game');
        return;
      }

      // Shuffle and take random questions
      const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
      const questions = shuffled.slice(0, Math.min(10, flashcards.length));

      setGameState({
        type: gameType,
        flashcardSet,
        questions,
        currentQuestionIndex: 0,
        score: 0,
        correctAnswers: 0,
        timeLeft: GAME_TIME,
        gameStarted: true,
        gameFinished: false,
        startTime: Date.now(),
        userAnswers: {},
        showResult: false
      });
    } catch (error) {
      toast.error('Có lỗi khi tải dữ liệu game');
    }
  };

  const submitAnswer = () => {
    if (!selectedAnswer.trim()) return;

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
    const isCorrect = gameState.type === 'word_match' 
      ? selectedAnswer.toLowerCase().trim() === currentQuestion.vietnamese.toLowerCase().trim()
      : selectedAnswer.toLowerCase().trim() === currentQuestion.english.toLowerCase().trim();

    const newUserAnswers = {
      ...gameState.userAnswers,
      [gameState.currentQuestionIndex]: selectedAnswer
    };

    setGameState(prev => ({
      ...prev,
      score: prev.score + (isCorrect ? 10 : 0),
      correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
      userAnswers: newUserAnswers
    }));

    setShowAnswer(true);

    // Move to next question after showing result
    setTimeout(() => {
      setShowAnswer(false);
      setSelectedAnswer('');
      
      if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
        setGameState(prev => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1
        }));
      } else {
        finishGame();
      }
    }, 2000);
  };

  const finishGame = async () => {
    const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000);
    
    setGameState(prev => ({
      ...prev,
      gameFinished: true
    }));

    // Save game session
    if (gameState.type) {
      await saveGameMutation.mutateAsync({
        game_type: gameState.type,
        score: gameState.score,
        total_questions: gameState.questions.length,
        correct_answers: gameState.correctAnswers,
        time_spent: timeSpent
      });
    }
  };

  const resetGame = () => {
    setGameState({
      type: null,
      flashcardSet: null,
      questions: [],
      currentQuestionIndex: 0,
      score: 0,
      correctAnswers: 0,
      timeLeft: GAME_TIME,
      gameStarted: false,
      gameFinished: false,
      startTime: 0,
      userAnswers: {},
      showResult: false
    });
    setSelectedAnswer('');
    setShowAnswer(false);
  };

  const generateOptions = (correctAnswer: string, allQuestions: Flashcard[], isVietnamese: boolean): string[] => {
    const options = [correctAnswer];
    const availableOptions = allQuestions
      .map(q => isVietnamese ? q.vietnamese : q.english)
      .filter(option => option !== correctAnswer);
    
    // Add 3 random wrong options
    for (let i = 0; i < 3 && availableOptions.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableOptions.length);
      options.push(availableOptions[randomIndex]);
      availableOptions.splice(randomIndex, 1);
    }
    
    return options.sort(() => Math.random() - 0.5);
  };

  if (setsLoading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Game Selection Screen
  if (!gameState.gameStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-8"
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Trò chơi học từ vựng</h1>
          <p className="text-lg text-gray-600">Chọn trò chơi và bộ flashcard để bắt đầu</p>
        </div>

        {/* Game Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gameTypes.map((game) => (
            <Card key={game.id} className="text-center hover:shadow-lg transition-shadow cursor-pointer">
              <div className="space-y-4">
                <div className={`w-16 h-16 ${game.color} rounded-full flex items-center justify-center mx-auto`}>
                  <game.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{game.name}</h3>
                  <p className="text-gray-600 mt-2">{game.description}</p>
                </div>
                
                {/* Flashcard Set Selection */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn bộ flashcard:
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onChange={(e) => {
                      const setId = parseInt(e.target.value);
                      const selectedSet = flashcardSets?.find(set => set.id === setId);
                      if (selectedSet) {
                        setGameState(prev => ({ ...prev, flashcardSet: selectedSet }));
                      }
                    }}
                  >
                    <option value="">-- Chọn bộ flashcard --</option>
                    {flashcardSets?.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.title} ({set.total_cards} thẻ)
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  onClick={() => startGame(game.id, gameState.flashcardSet!)}
                  disabled={!gameState.flashcardSet}
                  leftIcon={<PlayIcon className="w-5 h-5" />}
                  className="w-full"
                >
                  Bắt đầu chơi
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  // Game Finished Screen
  if (gameState.gameFinished) {
    const accuracy = Math.round((gameState.correctAnswers / gameState.questions.length) * 100);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="text-center">
          <div className="space-y-6">
            <div className="text-6xl">🎉</div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Hoàn thành!</h2>
              <p className="text-gray-600">Bạn đã hoàn thành trò chơi {gameTypes.find(g => g.id === gameState.type)?.name}</p>
            </div>

            {/* Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{gameState.score}</div>
                <div className="text-sm text-gray-500">Điểm số</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{gameState.correctAnswers}</div>
                <div className="text-sm text-gray-500">Câu đúng</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{accuracy}%</div>
                <div className="text-sm text-gray-500">Độ chính xác</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{GAME_TIME - gameState.timeLeft}s</div>
                <div className="text-sm text-gray-500">Thời gian</div>
              </div>
            </div>

            {/* Performance Rating */}
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={`w-8 h-8 ${
                    star <= Math.ceil(accuracy / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={resetGame}
                variant="outline"
                className="flex-1"
              >
                Chơi lại
              </Button>
              <Button
                onClick={() => window.location.href = '/leaderboard'}
                className="flex-1"
              >
                Xem bảng xếp hạng
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Game Playing Screen
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const progress = ((gameState.currentQuestionIndex + 1) / gameState.questions.length) * 100;
  const isWordMatch = gameState.type === 'word_match';
  const questionText = isWordMatch ? currentQuestion.english : currentQuestion.vietnamese;
  const correctAnswer = isWordMatch ? currentQuestion.vietnamese : currentQuestion.english;
  
  const options = gameState.type === 'word_match' 
    ? generateOptions(correctAnswer, gameState.questions, true)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Game Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {gameTypes.find(g => g.id === gameState.type)?.name}
          </h1>
          <p className="text-gray-600">{gameState.flashcardSet?.title}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-5 h-5 text-orange-500" />
            <span className={`font-semibold ${gameState.timeLeft <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
              {gameState.timeLeft}s
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Điểm số</div>
            <div className="text-xl font-bold text-blue-600">{gameState.score}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="bg-blue-600 h-2 rounded-full"
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question Card */}
      <Card className="text-center">
        <div className="space-y-6">
          <div>
            <div className="text-sm text-gray-500 mb-2">
              Câu {gameState.currentQuestionIndex + 1} / {gameState.questions.length}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {questionText}
            </h2>
            {currentQuestion.example_sentence_en && isWordMatch && (
              <p className="text-gray-600 italic">
                "{currentQuestion.example_sentence_en}"
              </p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!showAnswer ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {gameState.type === 'word_match' ? (
                  // Multiple choice for word match
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAnswer(option)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedAnswer === option
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  // Text input for guess word
                  <div className="max-w-md mx-auto">
                    <input
                      type="text"
                      value={selectedAnswer}
                      onChange={(e) => setSelectedAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
                      placeholder="Nhập từ tiếng Anh..."
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                      autoFocus
                    />
                  </div>
                )}

                <Button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer.trim()}
                  rightIcon={<ArrowRightIcon className="w-5 h-5" />}
                  size="lg"
                >
                  Trả lời
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="answer"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="space-y-4"
              >
                {/* Answer Result */}
                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                  selectedAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim() ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <XMarkIcon className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    {selectedAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim() ? 'Chính xác!' : 'Sai rồi!'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-lg">
                    <span className="text-gray-500">Đáp án đúng: </span>
                    <span className="font-semibold text-green-600">{correctAnswer}</span>
                  </div>
                  {selectedAnswer.toLowerCase().trim() !== correctAnswer.toLowerCase().trim() && (
                    <div className="text-lg">
                      <span className="text-gray-500">Câu trả lời của bạn: </span>
                      <span className="font-semibold text-red-600">{selectedAnswer}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Question Counter */}
      <div className="flex justify-center space-x-1">
        {gameState.questions.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full ${
              index < gameState.currentQuestionIndex
                ? 'bg-green-500'
                : index === gameState.currentQuestionIndex
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
};

export default GamePage;