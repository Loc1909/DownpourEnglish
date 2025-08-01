// src/components/common/Button.tsx

import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

// Type cho button thông thường
interface RegularButtonProps extends BaseButtonProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseButtonProps> {
  as?: never;
}

// Type cho component tùy chỉnh (như Link)
interface AsButtonProps extends BaseButtonProps {
  as: React.ElementType;
  [key: string]: any;
}

type ButtonProps = RegularButtonProps | AsButtonProps;

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  as: Component = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-md hover:shadow-lg',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-md hover:shadow-lg',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 hover:border-blue-700',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500 hover:text-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md hover:shadow-lg',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const disabledClasses = disabled || loading ? 'hover:scale-100 active:scale-100 hover:shadow-md' : '';

  const finalClassName = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;

  // Xử lý props dựa trên Component type
  const componentProps = Component === 'button' 
    ? { 
        ...props, 
        disabled: disabled || loading,
        className: finalClassName
      }
    : {
        ...props,
        className: finalClassName,
        // Không pass disabled prop cho non-button elements
        ...(disabled || loading ? { 'aria-disabled': true, style: { pointerEvents: 'none' } } : {})
      };

  const content = loading ? (
    <LoadingSpinner size="small" color={variant === 'outline' || variant === 'ghost' ? 'gray' : 'white'} />
  ) : (
    <>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </>
  );

  return (
    <Component {...componentProps}>
      {content}
    </Component>
  );
};

export default Button;