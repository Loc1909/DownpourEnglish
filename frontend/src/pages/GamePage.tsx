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
  StarIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline';
import { gameAPI, flashcardSetsAPI } from '../services/api';
import { FlashcardSet, Flashcard } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';
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

// Crossword specific types
interface CrosswordCell {
  letter: string;
  isBlocked: boolean;
  wordId?: number;
  direction?: 'horizontal' | 'vertical';
  isStart?: boolean;
  number?: number;
  letterIndex?: number; // Add this to track position in word
}

interface CrosswordWord {
  id: number;
  word: string;
  clue: string;
  startRow: number;
  startCol: number;
  direction: 'horizontal' | 'vertical';
  length: number;
}

interface CrosswordGrid {
  grid: CrosswordCell[][];
  words: CrosswordWord[];
  size: number;
}

const GAME_TIME = 60; // 60 seconds per game
const CROSSWORD_SIZE = 12; // 12x12 grid

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
  
  // Crossword specific states
  const [crosswordGrid, setCrosswordGrid] = useState<CrosswordGrid | null>(null);
  const [crosswordAnswers, setCrosswordAnswers] = useState<{ [wordId: number]: string }>({});
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [currentInput, setCurrentInput] = useState<string>('');

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
      // When time runs out, finish the game
      if (gameState.type === 'crossword') {
        // Calculate final score for crossword
        let finalScore = 0;
        let finalCorrectAnswers = 0;
        
        if (crosswordGrid) {
          crosswordGrid.words.forEach(word => {
            const userAnswer = crosswordAnswers[word.id] || '';
            if (userAnswer === word.word) {
              finalCorrectAnswers++;
              finalScore += 15;
            }
          });
        }
        
        finishGameWithScore(finalScore, finalCorrectAnswers);
      } else {
        finishGame();
      }
    }

    return () => clearInterval(interval);
  }, [gameState.gameStarted, gameState.gameFinished, gameState.timeLeft, crosswordGrid, crosswordAnswers]);

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
    {
      id: 'crossword' as const,
      name: 'Ô chữ',
      description: 'Giải ô chữ tiếng Anh từ gợi ý',
      icon: HashtagIcon,
      color: 'bg-purple-500',
    },
  ];

  // Crossword generation functions
  const createEmptyGrid = (size: number): CrosswordCell[][] => {
    return Array(size).fill(null).map(() =>
      Array(size).fill(null).map(() => ({
        letter: '',
        isBlocked: false,
      }))
    );
  };

  const canPlaceWord = (
    grid: CrosswordCell[][],
    word: string,
    row: number,
    col: number,
    direction: 'horizontal' | 'vertical',
    size: number
  ): boolean => {
    if (direction === 'horizontal') {
      if (col + word.length > size) return false;
      
      for (let i = 0; i < word.length; i++) {
        const cell = grid[row][col + i];
        if (cell.letter && cell.letter !== word[i]) return false;
      }
      
      // Check for adjacent words
      if (col > 0 && grid[row][col - 1].letter) return false;
      if (col + word.length < size && grid[row][col + word.length].letter) return false;
      
    } else {
      if (row + word.length > size) return false;
      
      for (let i = 0; i < word.length; i++) {
        const cell = grid[row + i][col];
        if (cell.letter && cell.letter !== word[i]) return false;
      }
      
      // Check for adjacent words
      if (row > 0 && grid[row - 1][col].letter) return false;
      if (row + word.length < size && grid[row + word.length][col].letter) return false;
    }
    
    return true;
  };

  const placeWordInGrid = (
    grid: CrosswordCell[][],
    word: CrosswordWord
  ): CrosswordCell[][] => {
    const newGrid = grid.map(row => [...row]);
    
    for (let i = 0; i < word.length; i++) {
      if (word.direction === 'horizontal') {
        newGrid[word.startRow][word.startCol + i] = {
          ...newGrid[word.startRow][word.startCol + i],
          letter: word.word[i].toUpperCase(),
          wordId: word.id,
          direction: word.direction,
          isStart: i === 0,
          number: i === 0 ? word.id : undefined,
          letterIndex: i, // Track position in word
        };
      } else {
        newGrid[word.startRow + i][word.startCol] = {
          ...newGrid[word.startRow + i][word.startCol],
          letter: word.word[i].toUpperCase(),
          wordId: word.id,
          direction: word.direction,
          isStart: i === 0,
          number: i === 0 ? word.id : undefined,
          letterIndex: i, // Track position in word
        };
      }
    }
    
    return newGrid;
  };

  const generateCrossword = (flashcards: Flashcard[]): CrosswordGrid => {
    const size = CROSSWORD_SIZE;
    let grid = createEmptyGrid(size);
    const words: CrosswordWord[] = [];
    
    // Select and prepare words (max 8 words for better fit)
    const selectedCards = flashcards
      .filter(card => card.english.length >= 3 && card.english.length <= 10)
      .slice(0, 8)
      .map((card, index): CrosswordWord => ({
        id: index + 1,
        word: card.english.toUpperCase().replace(/\s/g, ''),
        clue: card.vietnamese,
        length: card.english.replace(/\s/g, '').length,
        startRow: 0,
        startCol: 0,
        direction: 'horizontal',
      }));

    // Place first word in center
    if (selectedCards.length > 0) {
      const firstWord: CrosswordWord = {
        ...selectedCards[0],
        startRow: Math.floor(size / 2),
        startCol: Math.floor((size - selectedCards[0].length) / 2),
        direction: 'horizontal'
      };
      
      words.push(firstWord);
      grid = placeWordInGrid(grid, firstWord);
    }

    // Try to place remaining words
    for (let i = 1; i < selectedCards.length; i++) {
      const currentWordTemplate = selectedCards[i];
      let placed = false;
      
      // Try to intersect with existing words
      for (const existingWord of words) {
        if (placed) break;
        
        for (let j = 0; j < existingWord.length; j++) {
          for (let k = 0; k < currentWordTemplate.length; k++) {
            if (existingWord.word[j] === currentWordTemplate.word[k]) {
              // Try horizontal placement
              const newDirection: 'horizontal' | 'vertical' = existingWord.direction === 'horizontal' ? 'vertical' : 'horizontal';
              let newRow: number, newCol: number;
              
              if (newDirection === 'horizontal') {
                newRow = existingWord.direction === 'vertical' 
                  ? existingWord.startRow + j 
                  : existingWord.startRow;
                newCol = existingWord.direction === 'vertical'
                  ? existingWord.startCol - k
                  : existingWord.startCol + j - k;
              } else {
                newRow = existingWord.direction === 'horizontal'
                  ? existingWord.startRow - k
                  : existingWord.startRow + j - k;
                newCol = existingWord.direction === 'horizontal'
                  ? existingWord.startCol + j
                  : existingWord.startCol;
              }
              
              if (newRow >= 0 && newCol >= 0 && 
                  canPlaceWord(grid, currentWordTemplate.word, newRow, newCol, newDirection, size)) {
                
                const currentWord: CrosswordWord = {
                  ...currentWordTemplate,
                  startRow: newRow,
                  startCol: newCol,
                  direction: newDirection
                };
                
                words.push(currentWord);
                grid = placeWordInGrid(grid, currentWord);
                placed = true;
                break;
              }
            }
          }
        }
      }
    }

    return { grid, words, size };
  };

  const startGame = async (gameType: typeof gameState.type, flashcardSet: FlashcardSet) => {
    try {
      // Get flashcards for the selected set
      const response = await flashcardSetsAPI.getFlashcards(flashcardSet.id);
      const flashcards = response.data;

      const minCards = gameType === 'crossword' ? 8 : 5;
      if (flashcards.length < minCards) {
        toast.error(`Bộ flashcard cần có ít nhất ${minCards} thẻ để chơi game này`);
        return;
      }

      // Shuffle and take random questions
      const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
      let questions;
      
      if (gameType === 'crossword') {
        questions = shuffled.slice(0, Math.min(8, flashcards.length));
        // Generate crossword grid
        const crossword = generateCrossword(questions);
        setCrosswordGrid(crossword);
        setCrosswordAnswers({});
        setSelectedWord(null);
        setCurrentInput('');
      } else {
        questions = shuffled.slice(0, Math.min(10, flashcards.length));
      }

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

    const newScore = gameState.score + (isCorrect ? 10 : 0);
    const newCorrectAnswers = gameState.correctAnswers + (isCorrect ? 1 : 0);

    setGameState(prev => ({
      ...prev,
      score: newScore,
      correctAnswers: newCorrectAnswers,
      userAnswers: newUserAnswers
    }));

    setShowAnswer(true);

    // Move to next question after showing result
    setTimeout(() => {
      setShowAnswer(false);
      setSelectedAnswer('');

      if (gameState.currentQuestionIndex < gameState.questions.length - 1) {
        // Move to next question
        setGameState(prev => ({
          ...prev,
          currentQuestionIndex: prev.currentQuestionIndex + 1
        }));
      } else {
        // Finish the game - this is the last question
        finishGameWithScore(newScore, newCorrectAnswers);
      }
    }, 2000);
  };

  // Crossword specific functions
  const handleWordSelect = (wordId: number) => {
    setSelectedWord(wordId);
    setCurrentInput(crosswordAnswers[wordId] || '');
  };

  const handleCrosswordInput = (value: string) => {
    if (selectedWord === null) return;
    
    const word = crosswordGrid?.words.find(w => w.id === selectedWord);
    if (!word) return;
    
    // Limit input to word length
    const sanitizedValue = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, word.length);
    setCurrentInput(sanitizedValue);
    
    setCrosswordAnswers(prev => ({
      ...prev,
      [selectedWord]: sanitizedValue
    }));
  };

  const submitCrosswordAnswer = () => {
    if (!crosswordGrid) return;
    
    let correctCount = 0;
    let totalScore = 0;
    
    // Check all words in crossword
    crosswordGrid.words.forEach(word => {
      const userAnswer = crosswordAnswers[word.id] || '';
      const isCorrect = userAnswer === word.word;
      
      if (isCorrect) {
        correctCount++;
        totalScore += 15; // 15 points per correct word in crossword
      }
    });
    
    // If no answers provided, show warning
    if (Object.keys(crosswordAnswers).length === 0) {
      toast.error('Vui lòng nhập ít nhất một câu trả lời trước khi hoàn thành!');
      return;
    }
    
    // Update state and finish game
    setGameState(prev => ({
      ...prev,
      score: totalScore,
      correctAnswers: correctCount,
      gameFinished: true
    }));
    
    // Finish game with calculated score
    finishGameWithScore(totalScore, correctCount);
  };

  const finishGameWithScore = async (score: number, correctAnswers: number) => {
    const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000);

    // Set game as finished
    setGameState(prev => ({
      ...prev,
      gameFinished: true,
      score: score,
      correctAnswers: correctAnswers
    }));

    // Save game session with provided score
    if (gameState.type) {
      const totalQuestions = gameState.type === 'crossword' 
        ? crosswordGrid?.words.length || 0
        : gameState.questions.length;
        
      const gameData = {
        game_type: gameState.type,
        score: score,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        time_spent: timeSpent
      };
        
      try {
        await saveGameMutation.mutateAsync(gameData);
      } catch (error) {
        console.error('Error saving game session:', error);
        toast.error('Có lỗi khi lưu kết quả game');
      }
    }
  };

  const finishGame = async () => {
    const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000);

    setGameState(prev => ({
      ...prev,
      gameFinished: true
    }));

    // Save game session
    if (gameState.type) {
      const totalQuestions = gameState.type === 'crossword' 
        ? crosswordGrid?.words.length || 0
        : gameState.questions.length;
        
      await saveGameMutation.mutateAsync({
        game_type: gameState.type,
        score: gameState.score,
        total_questions: totalQuestions,
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
    setCrosswordGrid(null);
    setCrosswordAnswers({});
    setSelectedWord(null);
    setCurrentInput('');
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

  // Calculate current question data before using in useMemo
  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];
  const isWordMatch = gameState.type === 'word_match';
  const correctAnswer = currentQuestion ? (isWordMatch ? currentQuestion.vietnamese : currentQuestion.english) : '';

  const options = React.useMemo(() => {
    if (gameState.type !== 'word_match' || !currentQuestion) return [];
    return generateOptions(correctAnswer, gameState.questions, true);
  }, [gameState.type, gameState.currentQuestionIndex, gameState.questions, correctAnswer]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    const totalQuestions = gameState.type === 'crossword' 
      ? crosswordGrid?.words.length || 0 
      : gameState.questions.length;
    const accuracy = totalQuestions > 0 ? Math.round((gameState.correctAnswers / totalQuestions) * 100) : 0;

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
                  className={`w-8 h-8 ${star <= Math.ceil(accuracy / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'
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

  // Crossword Game Screen
  if (gameState.type === 'crossword' && crosswordGrid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Game Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ô chữ</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crossword Grid */}
          <div className="lg:col-span-2">
            <Card>
              <div className="grid grid-cols-12 gap-1 w-fit mx-auto">
                {crosswordGrid.grid.map((row, rowIndex) =>
                  row.map((cell, colIndex) => (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`w-8 h-8 border border-gray-300 flex items-center justify-center text-sm font-bold relative ${
                        cell.letter
                          ? 'bg-white hover:bg-blue-50 cursor-pointer'
                          : 'bg-gray-200'
                      } ${
                        cell.wordId === selectedWord ? 'bg-blue-100 border-blue-500' : ''
                      }`}
                      onClick={() => cell.wordId && handleWordSelect(cell.wordId)}
                    >
                      {cell.number && (
                        <span className="absolute top-0 left-0 text-xs text-blue-600">
                          {cell.number}
                        </span>
                      )}
                      <span className={cell.number ? 'mt-2' : ''}>
                        {cell.letter && cell.wordId && cell.letterIndex !== undefined
                          ? (crosswordAnswers[cell.wordId] || '')[cell.letterIndex] || ''
                          : ''
                        }
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Clues and Input */}
          <div className="space-y-6">
            {/* Current Word Input */}
            {selectedWord && (
              <Card>
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">
                    Từ {selectedWord} ({crosswordGrid.words.find(w => w.id === selectedWord)?.direction === 'horizontal' ? 'Ngang' : 'Dọc'})
                  </h3>
                  <p className="text-gray-600">
                    {crosswordGrid.words.find(w => w.id === selectedWord)?.clue}
                  </p>
                  <input
                    type="text"
                    value={currentInput}
                    onChange={(e) => handleCrosswordInput(e.target.value)}
                    placeholder="Nhập từ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={crosswordGrid.words.find(w => w.id === selectedWord)?.length}
                  />
                </div>
              </Card>
            )}

            {/* All Clues */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Gợi ý</h3>
              <div className="space-y-3">
                {crosswordGrid.words.map(word => (
                  <div
                    key={word.id}
                    className={`cursor-pointer p-2 rounded transition-colors ${
                      selectedWord === word.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleWordSelect(word.id)}
                  >
                    <div className="flex items-start space-x-2">
                      <span className="font-medium text-blue-600 min-w-[20px]">
                        {word.id}.
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            ({word.direction === 'horizontal' ? 'Ngang' : 'Dọc'})
                          </span>
                          <span className="text-sm font-medium">
                            {word.length} chữ cái
                          </span>
                        </div>
                        <p className="text-gray-700 mt-1">{word.clue}</p>
                        {crosswordAnswers[word.id] && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-sm text-gray-500">Đáp án:</span>
                            <span className={`font-medium ${
                              crosswordAnswers[word.id] === word.word 
                                ? 'text-green-600' 
                                : 'text-blue-600'
                            }`}>
                              {crosswordAnswers[word.id]}
                            </span>
                            {crosswordAnswers[word.id] === word.word && (
                              <CheckIcon className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Submit Button */}
            <Button
              onClick={submitCrosswordAnswer}
              className="w-full"
              size="lg"
              disabled={Object.keys(crosswordAnswers).length === 0}
            >
              Hoàn thành ô chữ ({Object.keys(crosswordAnswers).length}/{crosswordGrid.words.length} từ)
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Regular Game Playing Screen - only show if we have a current question
  if (!currentQuestion && gameState.type !== 'crossword') {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Word Match and Guess Word Game Screen
  if (gameState.type !== 'crossword' && currentQuestion) {
    const progress = ((gameState.currentQuestionIndex + 1) / gameState.questions.length) * 100;
    const questionText = isWordMatch ? currentQuestion.english : currentQuestion.vietnamese;

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
                          className={`p-4 rounded-lg border-2 transition-all ${selectedAnswer === option
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
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${selectedAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
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
              className={`w-3 h-3 rounded-full ${index < gameState.currentQuestionIndex
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
  }

  return null;
};

export default GamePage;