const DEFAULT_TIMEOUT_MS = 14_000;
const MAX_ATTEMPTS = 2;

/** HAFAS transport.rest — mit Retry bei 5xx/Timeout. */
export async function fetchUpstreamJson(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: { Accept: "application/json", "User-Agent": "NeonLink-Server/1.0" },
      });
      clearTimeout(timer);
      if (res.ok) {
        return await res.json();
      }
      const body = await res.text();
      if (res.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      throw new Error(`upstream_${res.status}: ${body.slice(0, 240)}`);
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("upstream_failed");
}
