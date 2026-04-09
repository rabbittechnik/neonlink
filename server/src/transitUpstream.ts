const DEFAULT_TIMEOUT_MS = 18_000;
/** transport.rest ist gemeinschaftlich betrieben — 503/429 kommen häufig; etwas mehr Versuche + Backoff. */
const MAX_ATTEMPTS = 5;

function shouldRetryHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/** HAFAS transport.rest — mit Retry bei 429/5xx/Timeout. */
export async function fetchUpstreamJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: { Accept: "application/json", "User-Agent": "NeonLink-Server/1.0 (NeonLink)" },
      });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
      const body = await res.text();
      if (shouldRetryHttpStatus(res.status) && attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 450 * 2 ** attempt));
        continue;
      }
      throw new Error(`upstream_${res.status}: ${body.slice(0, 240)}`);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 450 * 2 ** attempt));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("upstream_failed");
}
