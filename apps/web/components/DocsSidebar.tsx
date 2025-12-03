'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Book, Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface DocsSidebarProps {
    allDocs: string[][];
}

export function DocsSidebar({ allDocs }: DocsSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const pathname = usePathname();

    // Group docs by category (first part of slug)
    const groupedDocs = allDocs.reduce((acc, slug) => {
        if (slug.join('/') === 'index') return acc;

        const category = slug.length > 1 ? slug[0] : 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(slug);
        return acc;
    }, {} as Record<string, string[][]>);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="md:hidden fixed top-4 right-4 z-50 p-2 bg-[#1a120b] border border-[#3e2c20] rounded text-[#d4af37]"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <Menu size={24} />
            </button>

            {/* Sidebar Container */}
            <aside
                className={`
          fixed md:relative z-40 h-screen bg-[#1a120b] border-r border-[#3e2c20] transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
            >
                {/* Collapse Toggle */}
                <div className="p-4 flex justify-end">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-[#d4af37] hover:bg-[#2a1f18] p-1 rounded transition-colors"
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>

                {/* Navigation Content */}
                <nav className="p-4 overflow-y-auto h-[calc(100vh-4rem)] scrollbar-thin scrollbar-thumb-[#3e2c20]">
                    <ul className="space-y-6">
                        {/* Introduction Link */}
                        <li>
                            <Link
                                href="/docs"
                                className={`flex items-center gap-3 p-2 rounded transition-colors ${pathname === '/docs'
                                        ? 'bg-[#3e2c20] text-[#d4af37]'
                                        : 'text-[#e5e5e5] hover:bg-[#2a1f18]'
                                    }`}
                                title="Introduction"
                            >
                                <Book size={20} />
                                {!isCollapsed && <span>Introduction</span>}
                            </Link>
                        </li>

                        {/* Categories */}
                        {Object.entries(groupedDocs).map(([category, docs]) => (
                            <li key={category}>
                                {!isCollapsed && (
                                    <h3 className="text-xs font-bold text-[#8b7355] uppercase tracking-wider mb-2 px-2">
                                        {category}
                                    </h3>
                                )}
                                <ul className="space-y-1">
                                    {docs.map((slug) => {
                                        const path = slug.join('/');
                                        const label = slug[slug.length - 1]
                                            .replace(/-/g, ' ')
                                            .replace(/\b\w/g, l => l.toUpperCase());

                                        const isActive = pathname === `/docs/${path}`;

                                        return (
                                            <li key={path}>
                                                <Link
                                                    href={`/docs/${path}`}
                                                    className={`flex items-center gap-3 p-2 rounded text-sm transition-colors ${isActive ? 'bg-[#3e2c20] text-[#d4af37]' : 'text-[#a8a29e] hover:text-[#e5e5e5] hover:bg-[#2a1f18]'
                                                        }`}
                                                    title={label}
                                                >
                                                    {/* Dot indicator for sub-items when collapsed */}
                                                    {isCollapsed ? (
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#d4af37]' : 'bg-[#3e2c20]'}`} />
                                                    ) : (
                                                        <span>{label}</span>
                                                    )}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))
                        }
                    </ul >
                </nav >
            </aside >

            {/* Overlay for mobile */}
            {
                isMobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setIsMobileOpen(false)}
                    />
                )
            }
        </>
    );
}
