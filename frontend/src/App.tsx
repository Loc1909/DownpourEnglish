// src/App.tsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore, setQueryClient } from './store/authStore';

// Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import TopicsPage from './pages/TopicsPage';
import FlashcardSetsPage from './pages/FlashcardSetsPage';
import FlashcardSetDetailPage from './pages/FlashcardSetDetailPage';
import CreateFlashcardSetPage from './pages/CreateFlashcardSetPage';
import FavoritesPage from './pages/FavoritesPage';
import StudyPage from './pages/StudyPage';
import ProfilePage from './pages/ProfilePage';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AchievementsPage from './pages/AchievementsPage';
import StatsPage from './pages/StatsPage';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Set queryClient in auth store
setQueryClient(queryClient);

function App() {
  const { loadUser, isLoading } = useAuthStore();

  useEffect(() => {
    // Load user on app start
    loadUser();
  }, [loadUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/topics" element={<TopicsPage />} />
                      <Route path="/flashcard-sets" element={<FlashcardSetsPage />} />
                      <Route path="/flashcard-sets/:id" element={<FlashcardSetDetailPage />} />
                      <Route path="/create-flashcard-set" element={<CreateFlashcardSetPage />} />
                      <Route path="/favorites" element={<FavoritesPage />} />
                      <Route path="/study" element={<StudyPage />} />
                      <Route path="/study/:setId" element={<StudyPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/games" element={<GamePage />} />
                      <Route path="/leaderboard" element={<LeaderboardPage />} />
                      <Route path="/achievements" element={<AchievementsPage />} />
                      <Route path="/stats" element={<StatsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;