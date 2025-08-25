// src/services/api.ts

import axios, { AxiosResponse } from 'axios';
import { 
  User, Topic, FlashcardSet, Flashcard, GameSession, 
  Achievement, UserAchievement, DailyStats, StudySummary,
  AuthResponse, PaginatedResponse, LeaderboardEntry, UserProgress
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Add SavedFlashcardSet interface
export interface SavedFlashcardSet {
  id: number;
  flashcard_set: FlashcardSet;
  saved_at: string;
  is_favorite: boolean;
  rating: number | null;
}

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
  
  register: (userData: FormData | {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    avatar?: string;
  }): Promise<AxiosResponse<AuthResponse>> => {
    // Nếu userData là FormData, gửi với multipart/form-data
    if (userData instanceof FormData) {
      console.log('Sending FormData to /users/ endpoint');
      return api.post('/users/', userData, {
        headers: {
          // Đặt Content-Type thành multipart/form-data
          // Axios sẽ tự động set boundary
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    // Nếu không, gửi với JSON như bình thường
    console.log('Sending JSON to /users/ endpoint');
    return api.post('/users/', userData);
  },
  
  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/users/logout/'),
  
  getCurrentUser: (): Promise<AxiosResponse<User>> =>
    api.get('/users/current_user/'),
  
  updateProfile: (userData: Partial<User>): Promise<AxiosResponse<User>> =>
    api.patch('/users/current_user/', userData),
};

// Topics API - Uses pagination
export const topicsAPI = {
  getAll: (params?: {
    page?: number;
    page_size?: number;
  }): Promise<AxiosResponse<PaginatedResponse<Topic>>> =>
    api.get('/topics/', { params }),
  
  create: (data: {
    name: string;
    description: string;
    icon: string;
  }): Promise<AxiosResponse<Topic>> =>
    api.post('/topics/', data),
  
  // This returns array, not paginated (custom action)
  getFlashcardSets: (topicId: number): Promise<AxiosResponse<FlashcardSet[]>> =>
    api.get(`/topics/${topicId}/flashcard-sets/`),
};

// Flashcard Sets API - Uses pagination for list
export const flashcardSetsAPI = {
  getAll: (params?: {
    q?: string;
    topic_id?: number;
    difficulty?: string;
    creator_id?: number;
    ordering?: string;
    page?: number;
    page_size?: number;
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
  
  update: (id: number, data: Partial<{
    title: string;
    description: string;
    topic: number;
    is_public: boolean;
    difficulty: string;
  }>): Promise<AxiosResponse<FlashcardSet>> =>
    api.patch(`/flashcard-sets/${id}/`, data),
  
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
  
  // This returns array, not paginated (custom action)
  getFlashcards: (id: number): Promise<AxiosResponse<Flashcard[]>> =>
    api.get(`/flashcard-sets/${id}/flashcards/`),

  // Thêm method favorite
  favorite: (id: number): Promise<AxiosResponse<{
    message: string;
    is_favorite: boolean;
    total_saves: number;
  }>> =>
    api.post(`/flashcard-sets/${id}/favorite/`),

  // Lấy danh sách yêu thích  
  getFavorites: (): Promise<AxiosResponse<SavedFlashcardSet[]>> =>
    api.get('/flashcard-sets/favorites/'),
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
  // This returns object, not paginated (custom action)
  getStudySummary: (): Promise<AxiosResponse<StudySummary>> =>
    api.get('/users/study_summary/'),
  
  // This returns array, not paginated (custom action)
  getSavedSets: (): Promise<AxiosResponse<SavedFlashcardSet[]>> =>
    api.get('/users/saved_sets/'),
};

// Progress API - Uses pagination
export const progressAPI = {
  getAll: (params?: {
    is_difficult?: boolean;
    is_learned?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<AxiosResponse<PaginatedResponse<UserProgress>>> =>
    api.get('/progress/', { params }),
  
  markDifficult: (id: number): Promise<AxiosResponse<{
    message: string;
    is_difficult: boolean;
  }>> =>
    api.post(`/progress/${id}/mark_difficult/`),
};

// Game Sessions API - Uses pagination for list
export const gameAPI = {
  createSession: (data: {
    game_type: string;
    score: number;
    total_questions: number;
    correct_answers: number;
    time_spent: number;
  }): Promise<AxiosResponse<GameSession>> =>
    api.post('/game-sessions/', data),
  
  getSessions: (params?: {
    page?: number;
    page_size?: number;
  }): Promise<AxiosResponse<PaginatedResponse<GameSession>>> =>
    api.get('/game-sessions/', { params }),
  
  // This returns array, not paginated (custom action)
  getLeaderboard: (gameType?: string): Promise<AxiosResponse<LeaderboardEntry[]>> =>
    api.get('/game-sessions/leaderboard/', { params: { game_type: gameType } }),
};

// Achievements API - Backend giờ trả về array trực tiếp, không pagination
export const achievementsAPI = {
  getAll: (params?: {
    page?: number;
    page_size?: number;
  }): Promise<AxiosResponse<Achievement[]>> =>  // Trả về array thay vì PaginatedResponse
    api.get('/achievements/', { params }),
  
  // This returns array, not paginated (custom action)
  getUserAchievements: (): Promise<AxiosResponse<UserAchievement[]>> =>
    api.get('/achievements/my_achievements/'),

  // Method mới để kiểm tra thành tích
  checkAchievements: (): Promise<AxiosResponse<{
    message: string;
    new_achievements: Achievement[];
  }>> =>
    api.post('/achievements/check_achievements/'),
};


// Daily Stats API - Uses pagination
export const statsAPI = {
  getDailyStats: (params?: {
    days?: number;
    page?: number;
    page_size?: number;
  }): Promise<AxiosResponse<PaginatedResponse<DailyStats>>> =>
    api.get('/daily-stats/', { params }),
};

// Feedback API - Uses pagination
export const feedbackAPI = {
  create: (data: {
    flashcard: number;
    rating: number;
    comment?: string;
  }): Promise<AxiosResponse<any>> =>
    api.post('/feedback/', data),
  
  getAll: (params?: {
    page?: number;
    page_size?: number;
  }): Promise<AxiosResponse<PaginatedResponse<any>>> =>
    api.get('/feedback/', { params }),
};

export default api;