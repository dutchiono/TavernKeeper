import { PixelButton } from '../../components/PixelComponents';

interface HeroOwnershipBadgeProps {
    tokenId: string;
    contractAddress: string;
    chainId?: number;
}

export default function HeroOwnershipBadge({ tokenId, contractAddress, chainId = 10143 }: HeroOwnershipBadgeProps) {
    const explorerUrl = process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL || 'https://testnet.monadexplorer.com';
    const url = `${explorerUrl}/token/${contractAddress}/instance/${tokenId}`;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-amber-900/10 hover:bg-amber-900/20 px-2 py-1 rounded text-[10px] text-amber-900 transition-colors"
            title="View on Block Explorer"
        >
            <span className="font-bold">NFT #{tokenId}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
        </a>
    );
}
