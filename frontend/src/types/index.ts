// src/types/index.ts

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  avatar: string;
  total_points: number;
  date_joined: string;
}

export interface Topic {
  id: number;
  name: string;
  description: string;
  icon: string;
  flashcard_sets_count: number;
}

export interface Flashcard {
  id: number;
  vietnamese: string;
  english: string;
  example_sentence_en: string;
  word_type: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'other';
  user_progress?: UserProgress;
}

export interface FlashcardSet {
  id: number;
  title: string;
  description: string;
  topic: Topic;
  creator: User;
  is_public: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  total_cards: number;
  total_saves: number;
  average_rating: number;
  created_at: string;
  is_saved: boolean;
  is_favorite: boolean;
  user_rating?: number;
  flashcards?: Flashcard[];
}

export interface SavedFlashcardSet {
  id: number;
  flashcard_set: FlashcardSet;
  saved_at: string;
  is_favorite: boolean;
  rating: number | null;
}

export interface UserProgress {
  id: number;
  flashcard: Flashcard;
  mastery_level: number;
  times_reviewed: number;
  times_correct: number;
  last_reviewed: string;
  difficulty_rating: number;
  is_learned: boolean;
  is_difficult: boolean;
  accuracy_rate: number;
}

export interface GameSession {
  id: number;
  game_type: 'word_match' | 'guess_word' | 'crossword';
  game_type_display: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent: number;
  completed_at: string;
  accuracy_percentage: number;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  achievement_type: 'learning' | 'gaming' | 'streak' | 'milestone';
  requirement_value: number;
  points: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  rarity_display: string;
  // Các trường được thêm vào động từ backend
  // is_earned?: boolean;
  // earned_at?: string;
  // progress_percentage?: number;
  // user_progress?: number;
}

export interface UserAchievement {
  id: number;
  achievement: Achievement;
  earned_at: string;
  progress_value: number;
  progress_percentage: number;
  // Các trường bổ sung từ backend
  // user_progress?: number;
  // is_earned?: boolean;
}

export interface DailyStats {
  id: number;
  date: string;
  cards_studied: number;
  time_spent: number;
  games_played: number;
  points_earned: number;
  accuracy_rate: number;
  new_words_learned: number;
  words_reviewed: number;
}

export interface StudySummary {
  total_sets_saved: number;
  total_cards_studied: number;
  total_time_spent: number;
  current_streak: number;
  total_achievements: number;
  mastery_distribution: Array<{ mastery_level: number; count: number }>;
  recent_activity: any[];
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  best_score: number;
  total_games: number;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  error?: string;
  [key: string]: any;
}