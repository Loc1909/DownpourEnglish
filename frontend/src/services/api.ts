// src/services/api.ts

import axios, { AxiosResponse } from 'axios';
import { 
  User, Topic, FlashcardSet, Flashcard, GameSession, 
  Achievement, UserAchievement, DailyStats, StudySummary,
  AuthResponse, PaginatedResponse, LeaderboardEntry, UserProgress,
  SavedFlashcardSet
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    const firebaseToken = localStorage.getItem('firebaseToken');
    
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    if (firebaseToken) {
      config.headers['Firebase-Token'] = firebaseToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('firebaseToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username: string, password: string): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/users/login/', { username, password }),
  
  register: (userData: {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
  }): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/users/register/', userData),
  
  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/users/logout/'),
  
  getCurrentUser: (): Promise<AxiosResponse<User>> =>
    api.get('/users/current_user/'),
  
  updateProfile: (userData: Partial<User>): Promise<AxiosResponse<User>> =>
    api.patch('/users/current_user/', userData),
};

// Topics API
export const topicsAPI = {
  // Sửa lại return type để match với backend pagination
  getAll: (): Promise<AxiosResponse<PaginatedResponse<Topic>>> =>
    api.get('/topics/'),
  
  getFlashcardSets: (topicId: number): Promise<AxiosResponse<FlashcardSet[]>> =>
    api.get(`/topics/${topicId}/flashcard-sets/`),
};

// Flashcard Sets API
export const flashcardSetsAPI = {
  getAll: (params?: {
    q?: string;
    topic_id?: number;
    difficulty?: string;
    creator_id?: number;
    ordering?: string;
  }): Promise<AxiosResponse<PaginatedResponse<FlashcardSet>>> =>
    api.get('/flashcard-sets/', { params }),
  
  getById: (id: number): Promise<AxiosResponse<FlashcardSet>> =>
    api.get(`/flashcard-sets/${id}/`),
  
  create: (data: {
    title: string;
    description: string;
    topic: number;
    is_public: boolean;
    difficulty: string;
  }): Promise<AxiosResponse<FlashcardSet>> =>
    api.post('/flashcard-sets/', data),
  
  save: (id: number): Promise<AxiosResponse<{
    message: string;
    is_saved: boolean;
    total_saves: number;
  }>> =>
    api.post(`/flashcard-sets/${id}/save/`),
  
  rate: (id: number, rating: number): Promise<AxiosResponse<{
    message: string;
    average_rating: number;
  }>> =>
    api.post(`/flashcard-sets/${id}/rate/`, { rating }),
  
  getFlashcards: (id: number): Promise<AxiosResponse<Flashcard[]>> =>
    api.get(`/flashcard-sets/${id}/flashcards/`),
};

// Flashcards API
export const flashcardsAPI = {
  create: (data: {
    flashcard_set: number;
    vietnamese: string;
    english: string;
    example_sentence_en?: string;
    word_type?: string;
  }): Promise<AxiosResponse<Flashcard>> =>
    api.post('/flashcards/', data),
  
  update: (id: number, data: Partial<Flashcard>): Promise<AxiosResponse<Flashcard>> =>
    api.patch(`/flashcards/${id}/`, data),
  
  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/flashcards/${id}/`),
  
  study: (id: number, data: {
    is_correct: boolean;
    difficulty_rating?: number;
  }): Promise<AxiosResponse<{
    message: string;
    mastery_level: number;
    times_reviewed: number;
  }>> =>
    api.post(`/flashcards/${id}/study/`, data),
};

// User API
export const userAPI = {
  getStudySummary: (): Promise<AxiosResponse<StudySummary>> =>
    api.get('/users/study_summary/'),
  
  getSavedSets: (): Promise<AxiosResponse<SavedFlashcardSet[]>> =>
    api.get('/users/saved_sets/'),
};

// Progress API
export const progressAPI = {
  getAll: (params?: {
    is_difficult?: boolean;
    is_learned?: boolean;
  }): Promise<AxiosResponse<UserProgress[]>> =>
    api.get('/progress/', { params }),
  
  markDifficult: (id: number): Promise<AxiosResponse<{
    message: string;
    is_difficult: boolean;
  }>> =>
    api.post(`/progress/${id}/mark_difficult/`),
};

// Game Sessions API
export const gameAPI = {
  createSession: (data: {
    game_type: string;
    score: number;
    total_questions: number;
    correct_answers: number;
    time_spent: number;
  }): Promise<AxiosResponse<GameSession>> =>
    api.post('/game-sessions/', data),
  
  getSessions: (): Promise<AxiosResponse<GameSession[]>> =>
    api.get('/game-sessions/'),
  
  getLeaderboard: (gameType?: string): Promise<AxiosResponse<LeaderboardEntry[]>> =>
    api.get('/game-sessions/leaderboard/', { params: { game_type: gameType } }),
};

// Achievements API
export const achievementsAPI = {
  getAll: (): Promise<AxiosResponse<Achievement[]>> =>
    api.get('/achievements/'),
  
  getUserAchievements: (): Promise<AxiosResponse<UserAchievement[]>> =>
    api.get('/achievements/my_achievements/'),
};

// Daily Stats API
export const statsAPI = {
  getDailyStats: (days: number = 7): Promise<AxiosResponse<DailyStats[]>> =>
    api.get('/daily-stats/', { params: { days } }),
};

// Feedback API
export const feedbackAPI = {
  create: (data: {
    flashcard: number;
    rating: number;
    comment?: string;
  }): Promise<AxiosResponse<any>> =>
    api.post('/feedback/', data),
  
  getAll: (): Promise<AxiosResponse<any[]>> =>
    api.get('/feedback/'),
};

export default api;