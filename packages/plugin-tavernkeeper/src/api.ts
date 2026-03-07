import type { IAgentRuntime } from '@elizaos/core';

export function getBaseUrl(runtime: IAgentRuntime): string {
  return (runtime.getSetting('TAVERNKEEPER_URL') || 'https://tavernkeeper.xyz').replace(/\/$/, '');
}

export function getApiKey(runtime: IAgentRuntime): string | null {
  return runtime.getSetting('TAVERNKEEPER_API_KEY') || null;
}

export async function tkFetch(
  runtime: IAgentRuntime,
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<unknown> {
  const base = getBaseUrl(runtime);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.auth !== false) {
    const key = getApiKey(runtime);
    if (key) headers['X-Agent-Key'] = key;
  }
  const res = await fetch(`${base}${path}`, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return res.json();
}
