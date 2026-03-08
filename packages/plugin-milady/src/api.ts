/**
 * milady.ai variant of the TavernKeeper API client.
 * Defaults TAVERNKEEPER_URL to http://localhost:4000 for local-first milady deployments.
 */
import type { IAgentRuntime } from "@milady-ai/core";

export function getBaseUrl(runtime: IAgentRuntime): string {
    return (
        runtime.getSetting("TAVERNKEEPER_URL") ||
        process.env.TAVERNKEEPER_URL ||
        "http://localhost:4000"
    );
}

export function getApiKey(runtime: IAgentRuntime): string | null {
    return (
        runtime.getSetting("TAVERNKEEPER_API_KEY") ||
        process.env.TAVERNKEEPER_API_KEY ||
        null
    );
}

export async function tkFetch(
    runtime: IAgentRuntime,
    endpoint: string,
    options: {
        method?: string;
        body?: Record<string, unknown>;
        auth?: boolean;
    } = {}
): Promise<unknown> {
    const { method = "POST", body, auth = true } = options;
    const baseUrl = getBaseUrl(runtime);
    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (auth) {
        // Try runtime cache first (set after ENTER_TAVERN), then env/settings
        const cachedKey = await runtime.getCache<string>("tavernkeeper:api_key");
        const key = cachedKey || getApiKey(runtime);
        if (key) headers["x-api-key"] = key;
    }

    try {
        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        return await res.json();
    } catch (err) {
        console.error(`[plugin-milady] tkFetch error ${endpoint}:`, err);
        return { error: String(err) };
    }
}
