import React from 'react';

interface PixelBoxProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  variant?: 'primary' | 'dark' | 'paper' | 'wood';
  onClick?: (e?: React.MouseEvent) => void;
}

export const PixelBox: React.FC<PixelBoxProps> = ({ children, className = '', title, variant = 'primary', onClick }) => {
  // We use box-shadows to create crisp non-anti-aliased borders
  const getStyles = (v: string) => {
    switch (v) {
      case 'dark':
        return 'bg-slate-900 shadow-[inset_0_0_0_4px_#1e293b] border-4 border-slate-950 text-slate-200';
      case 'paper':
        return 'bg-[#eaddcf] shadow-[inset_0_0_0_4px_#d4c5b0] border-4 border-[#8c7b63] text-amber-950';
      case 'wood':
        return 'bg-[#5c4033] shadow-[inset_0_0_0_4px_#3e2b22] border-4 border-[#2a1d17] text-[#eaddcf]';
      case 'primary':
      default:
        return 'bg-blue-900 shadow-[inset_0_0_0_4px_#1e3a8a] border-4 border-slate-950 text-white';
    }
  };

  return (
    <div className={`relative ${getStyles(variant)} ${className} p-4`} onClick={onClick}>
      {/* Corner decorations for extra flair */}
      <div className="absolute top-0 left-0 w-1 h-1 bg-white/20" />
      <div className="absolute top-0 right-0 w-1 h-1 bg-white/20" />
      <div className="absolute bottom-0 left-0 w-1 h-1 bg-black/20" />
      <div className="absolute bottom-0 right-0 w-1 h-1 bg-black/20" />

      {title && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black border-2 border-slate-600 text-[10px] uppercase tracking-wider text-yellow-400 shadow-md whitespace-nowrap z-20">
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'success' | 'neutral' | 'secondary' | 'wood';
  isActive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PixelButton: React.FC<PixelButtonProps> = ({ children, className = '', variant = 'primary', isActive = false, size = 'md', ...props }) => {
  const getColors = () => {
    if (props.disabled) return 'bg-slate-700 border-slate-600 text-slate-500 cursor-not-allowed';

    switch (variant) {
      case 'danger':
        return 'bg-red-600 border-red-800 hover:bg-red-500 text-white shadow-[0_4px_0_#7f1d1d] active:shadow-none active:translate-y-[4px]';
      case 'success':
        return 'bg-emerald-600 border-emerald-800 hover:bg-emerald-500 text-white shadow-[0_4px_0_#064e3b] active:shadow-none active:translate-y-[4px]';
      case 'neutral':
        return `bg-slate-200 border-slate-400 hover:bg-white text-slate-800 shadow-[0_4px_0_#94a3b8] active:shadow-none active:translate-y-[4px] ${isActive ? 'bg-white translate-y-[4px] shadow-none ring-2 ring-yellow-400' : ''}`;
      case 'secondary': // Added for backward compatibility
        return 'bg-slate-600 border-slate-800 hover:bg-slate-500 text-white shadow-[0_4px_0_#334155] active:shadow-none active:translate-y-[4px]';
      case 'wood':
        return 'bg-[#5c4033] border-[#2a1d17] hover:bg-[#6d4c3d] text-[#eaddcf] shadow-[0_4px_0_#3e2b22] active:shadow-none active:translate-y-[4px]';
      case 'primary':
      default:
        return `bg-blue-600 border-blue-800 hover:bg-blue-500 text-white shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-[4px] ${isActive ? 'bg-blue-500 translate-y-[4px] shadow-none ring-2 ring-yellow-400' : ''}`;
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-[8px]';
      case 'lg': return 'px-4 py-3 text-xs';
      default: return 'px-3 py-2 text-[10px]';
    }
  }

  return (
    <button
      className={`
        relative
        border-x-2 border-t-2 border-b-2
        font-bold uppercase tracking-wider
        transition-all duration-75
        ${getColors()}
        ${getSize()}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export const PixelBadge: React.FC<{ text: string; color?: string }> = ({ text, color = 'bg-yellow-600' }) => (
  <span className={`${color} px-2 py-0.5 text-[8px] border border-black/20 shadow-[1px_1px_0_rgba(0,0,0,0.3)] text-white uppercase tracking-tight`}>
    {text}
  </span>
);

// Aliases for backward compatibility
export const PixelPanel = PixelBox;

interface PixelCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'wood' | 'paper';
}

export const PixelCard: React.FC<PixelCardProps> = ({ children, className = '', onClick, variant = 'default' }) => {
  const getStyles = () => {
    switch (variant) {
      case 'wood':
        return 'bg-[#4a3b32] border-[#2a1d17] text-[#eaddcf] hover:border-[#eaddcf]';
      case 'paper':
        return 'bg-[#eaddcf] border-[#8c7b63] text-amber-950 hover:border-amber-700';
      case 'default':
      default:
        return 'bg-slate-800 border-slate-600 text-slate-200 hover:border-amber-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`border-2 p-2 transition-colors ${getStyles()} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
