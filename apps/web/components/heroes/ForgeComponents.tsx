import React, { ReactNode } from 'react';

// --- Forge Panel ---
interface ForgePanelProps {
    title?: ReactNode;
    variant?: 'wood' | 'paper';
    children: ReactNode;
    className?: string;
}

export const ForgePanel: React.FC<ForgePanelProps> = ({
    title,
    variant = 'wood',
    children,
    className = ''
}) => {
    const baseStyles = "relative border-4 p-6 shadow-xl";

    const variants = {
        wood: "bg-[#2a1d17] border-[#5c3a1e] text-[#fcdfa6]", // Dark wood (matching demo)
        paper: "bg-[#eaddcf] border-[#8c7b63] text-[#3e3224]", // Parchment
    };

    const titleStyles = variant === 'wood'
        ? "bg-[#5c3a1e] text-[#fcdfa6] border-2 border-[#3e2613]"
        : "bg-[#8c7b63] text-[#eaddcf] border-2 border-[#5c4e3e]";

    return (
        <div className={`${baseStyles} ${variants[variant]} ${className}`}>
            {/* Corner Rivets (matching demo style) */}
            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-black/40 rounded-full"></div>
            <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-black/40 rounded-full"></div>
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-black/40 rounded-full"></div>
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-black/40 rounded-full"></div>

            {title && (
                <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 text-[10px] uppercase font-bold tracking-widest shadow-md whitespace-nowrap z-10 ${titleStyles}`}>
                    {title}
                </div>
            )}
            {children}
        </div>
    );
};

// --- Forge Button ---
interface ForgeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
}

export const ForgeButton: React.FC<ForgeButtonProps> = ({
    variant = 'primary',
    className = '',
    children,
    ...props
}) => {
    const base = "px-6 py-3 font-bold text-xs uppercase tracking-widest transition-all transform active:scale-95 border-b-4 border-r-4 focus:outline-none";

    const variants = {
        primary: "bg-amber-600 text-white border-amber-800 hover:bg-amber-500 active:border-t-4 active:border-b-0",
        secondary: "bg-[#8c7b63] text-[#eaddcf] border-[#5c4e3e] hover:bg-[#9d8b70]",
        danger: "bg-red-600 text-white border-red-800 hover:bg-red-500",
    };

    return (
        <button className={`${base} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

// --- Forge Card ---
export const ForgeCard: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-black/10 border-2 border-black/20 p-4 ${className}`}>
        {children}
    </div>
);
