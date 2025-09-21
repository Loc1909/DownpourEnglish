export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/users/login/',
    REGISTER: '/users/register/',
    LOGOUT: '/users/logout/',
    CURRENT_USER: '/users/current_user/',
    STUDY_SUMMARY: '/users/study_summary/',
    SAVED_SETS: '/users/saved_sets/',
  },
  TOPICS: '/topics/',
  FLASHCARD_SETS: '/flashcard-sets/',
  FLASHCARDS: '/flashcards/',
  PROGRESS: '/progress/',
  GAME_SESSIONS: '/game-sessions/',
  ACHIEVEMENTS: '/achievements/',
  DAILY_STATS: '/daily-stats/',
  FEEDBACK: '/feedback/',
};


export const GAME_TYPES = {
  WORD_MATCH: 'word_match',
  GUESS_WORD: 'guess_word',
  CROSSWORD: 'crossword',
} as const;

export const GAME_TYPE_LABELS = {
  [GAME_TYPES.WORD_MATCH]: 'Ghép từ nhanh',
  [GAME_TYPES.GUESS_WORD]: 'Đoán từ',
  [GAME_TYPES.CROSSWORD]: 'Ô chữ',
};


export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export const DIFFICULTY_LABELS = {
  [DIFFICULTY_LEVELS.BEGINNER]: 'Cơ bản',
  [DIFFICULTY_LEVELS.INTERMEDIATE]: 'Trung bình',
  [DIFFICULTY_LEVELS.ADVANCED]: 'Nâng cao',
};

export const DIFFICULTY_COLORS = {
  [DIFFICULTY_LEVELS.BEGINNER]: 'text-green-600 bg-green-100',
  [DIFFICULTY_LEVELS.INTERMEDIATE]: 'text-yellow-600 bg-yellow-100',
  [DIFFICULTY_LEVELS.ADVANCED]: 'text-red-600 bg-red-100',
};


export const WORD_TYPES = {
  NOUN: 'noun',
  VERB: 'verb',
  ADJECTIVE: 'adjective',
  ADVERB: 'adverb',
  PHRASE: 'phrase',
  OTHER: 'other',
} as const;

export const WORD_TYPE_LABELS = {
  [WORD_TYPES.NOUN]: 'Danh từ',
  [WORD_TYPES.VERB]: 'Động từ',
  [WORD_TYPES.ADJECTIVE]: 'Tính từ',
  [WORD_TYPES.ADVERB]: 'Trạng từ',
  [WORD_TYPES.PHRASE]: 'Cụm từ',
  [WORD_TYPES.OTHER]: 'Khác',
};


export const ACHIEVEMENT_TYPES = {
  LEARNING: 'learning',
  GAMING: 'gaming',
  STREAK: 'streak',
  MILESTONE: 'milestone',
} as const;

export const ACHIEVEMENT_TYPE_LABELS = {
  [ACHIEVEMENT_TYPES.LEARNING]: 'Học tập',
  [ACHIEVEMENT_TYPES.GAMING]: 'Chơi game',
  [ACHIEVEMENT_TYPES.STREAK]: 'Chuỗi ngày',
  [ACHIEVEMENT_TYPES.MILESTONE]: 'Cột mốc',
};


export const RARITY_LEVELS = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export const RARITY_LABELS = {
  [RARITY_LEVELS.COMMON]: 'Thường',
  [RARITY_LEVELS.UNCOMMON]: 'Không thường',
  [RARITY_LEVELS.RARE]: 'Hiếm',
  [RARITY_LEVELS.EPIC]: 'Sử thi',
  [RARITY_LEVELS.LEGENDARY]: 'Huyền thoại',
};

export const RARITY_COLORS = {
  [RARITY_LEVELS.COMMON]: 'text-gray-600 bg-gray-100',
  [RARITY_LEVELS.UNCOMMON]: 'text-green-600 bg-green-100',
  [RARITY_LEVELS.RARE]: 'text-blue-600 bg-blue-100',
  [RARITY_LEVELS.EPIC]: 'text-purple-600 bg-purple-100',
  [RARITY_LEVELS.LEGENDARY]: 'text-yellow-600 bg-yellow-100',
};


export const MASTERY_LEVELS = {
  NEW: { min: 0, max: 20, label: 'Mới học', color: 'text-red-600 bg-red-100' },
  LEARNING: { min: 21, max: 50, label: 'Đang học', color: 'text-orange-600 bg-orange-100' },
  GOOD: { min: 51, max: 80, label: 'Khá', color: 'text-yellow-600 bg-yellow-100' },
  EXCELLENT: { min: 81, max: 95, label: 'Giỏi', color: 'text-green-600 bg-green-100' },
  MASTERED: { min: 96, max: 100, label: 'Thành thạo', color: 'text-blue-600 bg-blue-100' },
};


export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  FIREBASE_TOKEN: 'firebaseToken',
  USER_PREFERENCES: 'userPreferences',
  STUDY_SETTINGS: 'studySettings',
  GAME_SETTINGS: 'gameSettings',
};


export const QUERY_KEYS = {
  AUTH: ['auth'],
  USER: ['user'],
  TOPICS: ['topics'],
  FLASHCARD_SETS: ['flashcard-sets'],
  FLASHCARDS: ['flashcards'],
  PROGRESS: ['progress'],
  GAME_SESSIONS: ['game-sessions'],
  ACHIEVEMENTS: ['achievements'],
  USER_ACHIEVEMENTS: ['user-achievements'],
  DAILY_STATS: ['daily-stats'],
  STUDY_SUMMARY: ['study-summary'],
  SAVED_SETS: ['saved-sets'],
  LEADERBOARD: ['leaderboard'],
};


export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/,
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  FLASHCARD_SET: {
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 1000,
  },
  FLASHCARD: {
    VIETNAMESE_MAX_LENGTH: 500,
    ENGLISH_MAX_LENGTH: 500,
    EXAMPLE_MAX_LENGTH: 1000,
  },
};


export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};


export const TIME_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 4000,
  MODAL_ANIMATION_DURATION: 200,
  LOADING_SPINNER_DELAY: 500,
};


export const EXTERNAL_URLS = {
  GITHUB: 'https://github.com',
  DOCS: 'https://docs.example.com',
  SUPPORT: 'mailto:support@example.com',
};


export const FEATURE_FLAGS = {
  ENABLE_DARK_MODE: false,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_SOCIAL_LOGIN: false,
  ENABLE_ANALYTICS: true,
};

export default {
  API_ENDPOINTS,
  GAME_TYPES,
  GAME_TYPE_LABELS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  WORD_TYPES,
  WORD_TYPE_LABELS,
  ACHIEVEMENT_TYPES,
  ACHIEVEMENT_TYPE_LABELS,
  RARITY_LEVELS,
  RARITY_LABELS,
  RARITY_COLORS,
  MASTERY_LEVELS,
  STORAGE_KEYS,
  QUERY_KEYS,
  VALIDATION_RULES,
  PAGINATION,
  TIME_CONSTANTS,
  EXTERNAL_URLS,
  FEATURE_FLAGS,
};