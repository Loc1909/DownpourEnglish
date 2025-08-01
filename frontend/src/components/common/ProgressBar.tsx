// src/components/common/ProgressBar.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  color = 'blue',
  showLabel = false,
  label,
  animated = true,
  className = ''
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500'
  };

  const bgColorClasses = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
    purple: 'bg-purple-100',
    indigo: 'bg-indigo-100'
  };

  return (
    <div className={className}>
      {/* Label */}
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {label || 'Tiến trình'}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className={`w-full ${bgColorClasses[color]} rounded-full ${sizeClasses[size]} overflow-hidden`}>
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full transition-all duration-300`}
            style={{ width: `${clampedProgress}%` }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;