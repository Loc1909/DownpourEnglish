import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  BookOpenIcon,
  AcademicCapIcon,
  UserIcon,
  TrophyIcon,
  ChartBarIcon,
  PuzzlePieceIcon,
  HeartIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const userNavigation = [
    { name: 'Trang chủ', href: '/', icon: HomeIcon },
    { name: 'Chủ đề', href: '/topics', icon: BookOpenIcon },
    { name: 'Bộ flashcard', href: '/flashcard-sets', icon: AcademicCapIcon },
    { name: 'Yêu thích', href: '/favorites', icon: HeartIcon },
    { name: 'Học tập', href: '/study', icon: BookOpenIcon },
    { name: 'Trò chơi', href: '/games', icon: PuzzlePieceIcon },
    { name: 'Bảng xếp hạng', href: '/leaderboard', icon: TrophyIcon },
    { name: 'Thành tích', href: '/achievements', icon: TrophyIcon },
    { name: 'Thống kê', href: '/stats', icon: ChartBarIcon },
  ];

  const adminNavigation = [
    { name: 'Trang chủ Admin', href: '/admin', icon: HomeIcon },
    { name: 'Quản lý chủ đề', href: '/admin/topics', icon: BookOpenIcon },
    { name: 'Quản lý bộ flashcard', href: '/admin/flashcard-sets', icon: AcademicCapIcon },
    { name: 'Quản lý người dùng', href: '/admin/users', icon: UserIcon },
    
  ];

  const navigation = user?.role === 'admin' ? adminNavigation : userNavigation;

  const isActiveRoute = (href: string) => {
    return location.pathname === href;
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="fixed inset-0 bg-gray-600 bg-opacity-75"
              onClick={() => setSidebarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:hidden"
          >
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">FC</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">Flashcard</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-8 px-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActiveRoute(item.href)
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 ${
                      isActiveRoute(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">FC</span>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">Flashcard</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-semibold transition-colors ${
                          isActiveRoute(item.href)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 ${
                            isActiveRoute(item.href) ? 'text-blue-500' : 'text-gray-400 group-hover:text-blue-500'
                          }`}
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Empty div for spacing on desktop */}
          <div className="hidden lg:block"></div>

          {/* Profile dropdown */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">


            {/* User menu */}
            <div className="relative">
              <div className="flex items-center gap-x-3">
                {user?.avatar ? (
                  <img
                    className="h-8 w-8 rounded-full bg-gray-50"
                    src={user.avatar}
                    alt={user.display_name || user.username}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {(user?.display_name || user?.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="hidden lg:flex lg:flex-col lg:items-start">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.display_name || user?.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.total_points || 0} điểm
                  </p>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-gray-900 hover:text-red-600 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Main content area */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;