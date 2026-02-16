'use client';

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${
        sizes[size]
      } border-[#eaddcf] border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const LoadingOverlay: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 font-pixel"
      role="dialog"
      aria-label={message}
    >
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-[#eaddcf] text-lg">{message}</p>
    </div>
  );
};

export const LoadingInline: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="flex items-center gap-3 text-[#eaddcf]/70 font-pixel">
      <LoadingSpinner size="sm" />
      {message && <span>{message}</span>}
    </div>
  );
};
