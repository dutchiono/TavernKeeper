/**
 * Utility for logging RPC errors with consistent formatting and helpful messages
 */

export interface RpcErrorInfo {
    error: any;
    context?: string;
    rpcUrl?: string;
}

export function logRpcError(info: RpcErrorInfo): void {
    const { error, context = 'RPC call', rpcUrl } = info;
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const isRateLimit = errorMessage.includes('429') ||
                       errorMessage.includes('Too Many Requests') ||
                       errorMessage.includes('rate limit') ||
                       errorMessage.toLowerCase().includes('rate limit');
    const isTimeout = errorMessage.includes('timeout') ||
                     errorMessage.includes('Timeout') ||
                     errorMessage.includes('ETIMEDOUT');
    const isNetworkError = errorMessage.includes('network') ||
                          errorMessage.includes('Network') ||
                          errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('ENOTFOUND');

    let logPrefix = '❌';
    let logMessage = `${context} failed:`;
    let solutionMessage = '';

    if (isRateLimit) {
        logPrefix = '🚫';
        logMessage = `RPC Rate Limit Error in ${context}:`;
        solutionMessage = '💡 Solution: Set NEXT_PUBLIC_ALCHEMY_API_KEY in your .env file to use Alchemy instead of the public RPC';
    } else if (isTimeout) {
        logPrefix = '⏱️';
        logMessage = `RPC Timeout Error in ${context}:`;
        solutionMessage = '💡 Solution: Set NEXT_PUBLIC_ALCHEMY_API_KEY in your .env file for more reliable RPC';
    } else if (isNetworkError) {
        logPrefix = '🌐';
        logMessage = `RPC Network Error in ${context}:`;
        solutionMessage = '💡 Solution: Check your internet connection and RPC endpoint availability';
    }

    console.error(`${logPrefix} ${logMessage}`, errorMessage);

    if (rpcUrl) {
        const isPublicRpc = rpcUrl.includes('rpc.monad.xyz') || rpcUrl.includes('testnet-rpc.monad.xyz');
        if (isPublicRpc && !process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
            console.error('⚠️  Using public RPC endpoint:', rpcUrl);
            console.error('   This endpoint has strict rate limits and will fail frequently.');
        }
    }

    if (solutionMessage) {
        console.error(solutionMessage);
    }

    // Log full error details in development
    if (process.env.NODE_ENV === 'development' && error?.stack) {
        console.error('Stack trace:', error.stack);
    }
}

