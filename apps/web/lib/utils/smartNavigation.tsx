'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { isInFarcasterMiniapp } from './farcasterDetection';

/**
 * Smart navigation hook that works in both web and Farcaster miniapp contexts
 * In miniapp: uses router.push to stay within iframe
 * In web: uses router.push for normal navigation
 */
export function useSmartNavigate() {
    const router = useRouter();
    const isMiniapp = isInFarcasterMiniapp();

    const navigate = (path: string) => {
        // Always use router.push - it works in both contexts
        // In miniapp, router.push stays within the iframe
        // In web, router.push does normal navigation
        router.push(path);
    };

    return { navigate, isMiniapp };
}

/**
 * Smart Link component that works in both web and miniapp contexts
 * Uses Next.js Link in both cases (it works correctly in miniapp)
 */
interface SmartLinkProps {
    href: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    target?: string;
    rel?: string;
}

export function SmartLink({ href, children, className, onClick, target, rel }: SmartLinkProps) {
    // For external links, use regular anchor tag
    if (href.startsWith('http://') || href.startsWith('https://')) {
        return (
            <a
                href={href}
                className={className}
                onClick={onClick}
                target={target || '_blank'}
                rel={rel || 'noopener noreferrer'}
            >
                {children}
            </a>
        );
    }

    // For internal links, use Next.js Link
    // Link works correctly in both miniapp and web contexts
    return (
        <Link href={href} className={className} onClick={onClick} target={target} rel={rel}>
            {children}
        </Link>
    );
}
