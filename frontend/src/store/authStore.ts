// src/store/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (username: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  setLoading: (loading: boolean) => void;
}

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

          toast.success('Đăng xuất thành công!');
        }
      },

      loadUser: async () => {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
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
        } catch (error: any) {
          console.error('Load user error:', error);
          
          // If token is invalid, clear it
          if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('firebaseToken');
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