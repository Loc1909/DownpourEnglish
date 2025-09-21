import React from 'react';
import {
  TrophyIcon,
  StarIcon,
  AcademicCapIcon,
  BookOpenIcon,
  LightBulbIcon,
  ChartBarIcon,
  PuzzlePieceIcon,
  BoltIcon,
  RocketLaunchIcon,
  SparklesIcon,
  FireIcon,
  CalendarIcon,
  ClockIcon,
  ShieldCheckIcon,
  HeartIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Icon mapping object
const ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  'trophy': TrophyIcon,
  'star': StarIcon,
  'academic-cap': AcademicCapIcon,
  'book-open': BookOpenIcon,
  'light-bulb': LightBulbIcon,
  'target': ChartBarIcon,
  'puzzle-piece': PuzzlePieceIcon,
  'bolt': BoltIcon,
  'rocket-launch': RocketLaunchIcon,
  'sparkles': SparklesIcon,
  'fire': FireIcon,
  'calendar': CalendarIcon,
  'clock': ClockIcon,
  'shield-check': ShieldCheckIcon,
  'heart': HeartIcon,
  'check-circle': CheckCircleIcon,
  'default': TrophyIcon
};

interface AchievementIconProps {
  iconName: string;
  rarity: string;
  size?: string;
  className?: string;
  useRarityColor?: boolean;
}

const AchievementIcon: React.FC<AchievementIconProps> = ({ 
  iconName, 
  rarity, 
  size = 'h-12 w-12', 
  className = '' ,
  useRarityColor = true
}) => {
  const IconComponent = ICON_MAP[iconName] || ICON_MAP['default'];
  
  const rarityColors = {
    common: 'text-gray-500',
    uncommon: 'text-green-500',
    rare: 'text-blue-500',
    epic: 'text-purple-500',
    legendary: 'text-yellow-500'
  };
  
const shouldUseRarityColor = useRarityColor && !className.includes('text-');
const colorClass = shouldUseRarityColor 
  ? (rarityColors[rarity as keyof typeof rarityColors] || rarityColors.common)
  : '';
    
  return (
    <div className={`${size} ${colorClass} ${className}`}>
      <IconComponent className="w-full h-full" />
    </div>
  );
};

export default AchievementIcon;