/* eslint-disable */
// @ts-nocheck

/**
 * CRITICAL FIX: Fix "Lockdown failed: TypeError: Cannot delete property 'dispose' of function Symbol()"
 * 
 * We act aggressively to prevent SES/Lockdown from running because it conflicts with modern
 * JavaScript environments (Node 20+, Chrome 113+) where Symbol.dispose is native and non-configurable.
 */

try {
    // 1. Aggressively mock lockdown if it doesn't exist
    if (typeof globalThis !== 'undefined') {
        if (!globalThis.lockdown) {
            Object.defineProperty(globalThis, 'lockdown', {
                value: function () {
                    console.warn('⚠️ Prevented SES lockdown() call via shim.');
                    return true;
                },
                writable: true,
                configurable: true // Allow overwrites if absolutely needed, but usually we want to win
            });
        }

        // 2. Mock harden as identity function (often used with lockdown)
        if (!globalThis.harden) {
            Object.defineProperty(globalThis, 'harden', {
                value: function (x: any) {
                    return x;
                },
                writable: true,
                configurable: true
            });
        }
    }

    // 3. Try to handle Symbol.dispose to prevent SES from choking on it
    // If it's configurable (polyfill), we delete it so SES doesn't try to and fail
    if (typeof Symbol !== 'undefined' && 'dispose' in Symbol) {
        const descriptor = Object.getOwnPropertyDescriptor(Symbol, 'dispose');
        if (descriptor?.configurable) {
            delete (Symbol as any).dispose;
        }
    }

    if (typeof Symbol !== 'undefined' && 'asyncDispose' in Symbol) {
        const descriptor = Object.getOwnPropertyDescriptor(Symbol, 'asyncDispose');
        if (descriptor?.configurable) {
            delete (Symbol as any).asyncDispose;
        }
    }

} catch (e) {
    console.warn('Failed to apply SES shim:', e);
}

export { };
