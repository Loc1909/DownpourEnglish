// src/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { signInWithGooglePopup } from '../services/firebase';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: FormData | {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    avatar?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

// Import queryClient để có thể invalidate queries
let queryClient: any = null;

export const setQueryClient = (client: any) => {
  queryClient = client;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true });
          
          const response = await authAPI.login(username, password);
          const { token, user, message } = response.data;

          // Store token in localStorage
          localStorage.setItem('authToken', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // QUAN TRỌNG: Clear toàn bộ cache và refetch lại với user mới
          if (queryClient) {
            await queryClient.clear();
            // Refetch các queries cần thiết với user mới
            queryClient.refetchQueries();
          }

          toast.success(message || 'Đăng nhập thành công!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 
                              error.response?.data?.detail || 
                              'Đăng nhập thất bại';
          
          set({ isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      loginWithGoogle: async () => {
        try {
          set({ isLoading: true });
          const { idToken } = await signInWithGooglePopup();

          // Lưu firebase token để backend xác thực
          localStorage.setItem('firebaseToken', idToken);

          // Gọi current_user để sync user về store
          const response = await authAPI.getCurrentUser();
          const user = response.data;

          set({
            user,
            token: localStorage.getItem('authToken'),
            isAuthenticated: true,
            isLoading: false,
          });

          if (queryClient) {
            await queryClient.clear();
            queryClient.refetchQueries();
          }

          toast.success('Đăng nhập Google thành công!');
        } catch (error: any) {
          set({ isLoading: false });
          const errorMessage = error.response?.data?.error || error.message || 'Đăng nhập Google thất bại';
          toast.error(errorMessage);
          throw error;
        }
      },

      register: async (userData) => {
        try {
          set({ isLoading: true });
          
          const response = await authAPI.register(userData);
          const { token, user, message } = response.data;

          // Store token in localStorage
          localStorage.setItem('authToken', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Clear cache và refetch với user mới
          if (queryClient) {
            await queryClient.clear();
            queryClient.refetchQueries();
          }

          toast.success(message || 'Đăng ký thành công!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 
                              error.response?.data?.detail || 
                              'Đăng ký thất bại';
          
          set({ isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear localStorage
          localStorage.removeItem('authToken');
          localStorage.removeItem('firebaseToken');
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });

          // QUAN TRỌNG: Clear toàn bộ cache khi logout
          if (queryClient) {
            await queryClient.clear();
            // Reset về trạng thái ban đầu
            queryClient.resetQueries();
          }

          toast.success('Đăng xuất thành công!');
        }
      },

      loadUser: async () => {
        const token = localStorage.getItem('authToken');
        const firebaseToken = localStorage.getItem('firebaseToken');
        
        if (!token && !firebaseToken) {
          set({ isLoading: false });
          return;
        }

        try {
          set({ isLoading: true });
          
          const response = await authAPI.getCurrentUser();
          const user = response.data;

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Chỉ invalidate các queries user-specific, không clear toàn bộ
          if (queryClient) {
            queryClient.invalidateQueries({
              predicate: (query: any) => {
                const userSpecificQueries = [
                  'studySummary',
                  'userAchievements', 
                  'savedSets',
                  'userProgress',
                  'dailyStats'
                ];
                return userSpecificQueries.some(key => 
                  query.queryKey.includes(key)
                );
              }
            });
          }
        } catch (error: any) {
          console.error('Load user error:', error);
          
          // If token is invalid, clear it
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('firebaseToken');
            
            // Clear cache khi token invalid
            if (queryClient) {
              await queryClient.clear();
            }
          }
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      updateProfile: async (userData) => {
        try {
          set({ isLoading: true });
          
          const response = await authAPI.updateProfile(userData);
          const updatedUser = response.data;

          set({
            user: updatedUser,
            isLoading: false,
          });

          // Invalidate user-related queries
          if (queryClient) {
            queryClient.invalidateQueries({
              queryKey: ['studySummary']
            });
          }

          toast.success('Cập nhật thông tin thành công!');
        } catch (error: any) {
          const errorMessage = error.response?.data?.error || 
                              error.response?.data?.detail || 
                              'Cập nhật thất bại';
          
          set({ isLoading: false });
          toast.error(errorMessage);
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);