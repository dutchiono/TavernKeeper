/**
 * Office PnL Service
 * Calculates Office PnL using two methods:
 * 1. Dutch Auction PnL (price paid vs current price)
 * 2. KEEP Earnings PnL (KEEP minted × current KEEP price)
 */

import { OfficeState } from './tavernKeeperService';
import { mcapService } from './mcapService';
import { getMonPrice } from './monPriceService';

export interface OfficePnlData {
    // Dutch Auction PnL (current)
    dutchAuctionPnl: {
        value: number;          // Raw value in MON
        valueUsd: number;       // Value in USD
        formatted: string;      // Formatted string (e.g., "+$5.23")
        color: 'green' | 'red'; // Color for display
    };

    // KEEP Earnings PnL (new)
    keepEarningsPnl: {
        value: number;          // Raw value in USD
        formatted: string;      // Formatted string (e.g., "+$12.45")
        keepMinted: string;     // KEEP tokens minted
        keepPriceUsd: string;   // Current KEEP price in USD
        color: 'green' | 'red';
    };

    // Combined PnL
    totalPnl: {
        value: number;          // Total value in USD
        formatted: string;      // Formatted string (e.g., "+$17.68")
        color: 'green' | 'red';
    };
}

export const officePnlService = {
    /**
     * Calculate Office PnL using both methods
     */
    async calculateOfficePnl(
        officeState: OfficeState,
        monPriceUsd?: number
    ): Promise<OfficePnlData | null> {
        try {
            // Get MON price if not provided
            if (!monPriceUsd) {
                monPriceUsd = await getMonPrice();
            }

            // Get KEEP price in USD
            const keepPriceUsd = await mcapService.getKeepPriceUsd();
            if (keepPriceUsd === null) {
                console.warn('Unable to calculate KEEP price, skipping KEEP earnings PnL');
                // Still calculate Dutch auction PnL
            }

            // 1. Calculate Dutch Auction PnL
            const initPrice = parseFloat(officeState.initPrice || '1.0');
            const currentPrice = parseFloat(officeState.currentPrice || '1.0');
            const halfInitPrice = initPrice / 2.0;

            let dutchPnlValue: number;
            if (currentPrice > initPrice) {
                // If price went UP: 80% of current - half init
                dutchPnlValue = (currentPrice * 0.8) - halfInitPrice;
            } else {
                // If price went DOWN: current - half init
                dutchPnlValue = currentPrice - halfInitPrice;
            }

            const dutchPnlUsd = dutchPnlValue * monPriceUsd;
            const dutchPnlFormatted = dutchPnlUsd >= 0
                ? `+$${dutchPnlUsd.toFixed(2)}`
                : `-$${Math.abs(dutchPnlUsd).toFixed(2)}`;

            // 2. Calculate KEEP Earnings PnL
            const keepMinted = parseFloat(officeState.totalEarned || '0');
            let keepEarningsUsd = 0;
            let keepEarningsFormatted = '$0.00';
            let keepPriceUsdStr = '0.00';

            if (keepPriceUsd !== null && keepMinted > 0) {
                keepEarningsUsd = keepMinted * keepPriceUsd;
                keepEarningsFormatted = keepEarningsUsd >= 0
                    ? `+$${keepEarningsUsd.toFixed(2)}`
                    : `-$${Math.abs(keepEarningsUsd).toFixed(2)}`;
                keepPriceUsdStr = keepPriceUsd.toFixed(6);
            }

            // 3. Calculate Total PnL
            const totalPnlUsd = dutchPnlUsd + keepEarningsUsd;
            const totalPnlFormatted = totalPnlUsd >= 0
                ? `+$${totalPnlUsd.toFixed(2)}`
                : `-$${Math.abs(totalPnlUsd).toFixed(2)}`;

            return {
                dutchAuctionPnl: {
                    value: dutchPnlValue,
                    valueUsd: dutchPnlUsd,
                    formatted: dutchPnlFormatted,
                    color: dutchPnlUsd >= 0 ? 'green' : 'red',
                },
                keepEarningsPnl: {
                    value: keepEarningsUsd,
                    formatted: keepEarningsFormatted,
                    keepMinted: keepMinted.toFixed(2),
                    keepPriceUsd: keepPriceUsdStr,
                    color: keepEarningsUsd >= 0 ? 'green' : 'red',
                },
                totalPnl: {
                    value: totalPnlUsd,
                    formatted: totalPnlFormatted,
                    color: totalPnlUsd >= 0 ? 'green' : 'red',
                },
            };
        } catch (error) {
            console.error('Error calculating Office PnL:', error);
            return null;
        }
    },
};

