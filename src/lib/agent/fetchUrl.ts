import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { htmlToReadableText } from '../sanitize';

/**
 * SSRF-hardened URL fetcher.
 *
 * The *request itself* is the risk, not just the content. So before fetching:
 *  - allow only http/https
 *  - resolve the hostname and block private, loopback, and link-local IPs
 *  - enforce a request timeout (~8s) and a response-size cap (~2MB)
 */

const TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_TEXT_CHARS = 24_000; // ~6k tokens

export interface FetchUrlResult {
  ok: boolean;
  url: string;
  text: string;
  title: string;
  error?: string;
}

/** True if an IP string is in a private / loopback / link-local / reserved range. */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    // IPv4-mapped (::ffff:a.b.c.d)
    const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
    if (mapped) return isBlockedIp(mapped[1]);
    return false;
  }
  return true; // not a parseable IP — be safe
}

async function assertSafeHost(hostname: string): Promise<void> {
  // If the host is already a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('Blocked address (private/loopback)');
    return;
  }
  if (hostname.toLowerCase() === 'localhost') {
    throw new Error('Blocked host (localhost)');
  }
  const records = await lookup(hostname, { all: true });
  if (records.length === 0) throw new Error('Host did not resolve');
  for (const r of records) {
    if (isBlockedIp(r.address)) throw new Error('Blocked address (private/loopback)');
  }
}

export async function fetchUrl(rawUrl: string, signal?: AbortSignal): Promise<FetchUrlResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, url: rawUrl, text: '', title: '', error: 'Invalid URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, url: rawUrl, text: '', title: '', error: 'Only http/https URLs are allowed' };
  }

  try {
    await assertSafeHost(url.hostname);
  } catch (err) {
    return { ok: false, url: rawUrl, text: '', title: '', error: (err as Error).message };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'ScoutResearchBot/1.0 (+https://github.com/n8watkins)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
      },
    });

    if (!res.ok) {
      return { ok: false, url: url.toString(), text: '', title: '', error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!/text\/html|text\/plain|application\/xhtml/.test(contentType)) {
      return {
        ok: false,
        url: url.toString(),
        text: '',
        title: '',
        error: `Unsupported content type: ${contentType || 'unknown'}`,
      };
    }

    // Read with a hard byte cap so a giant page can't blow up memory.
    const reader = res.body?.getReader();
    if (!reader) {
      return { ok: false, url: url.toString(), text: '', title: '', error: 'No response body' };
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.length;
        if (received > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }
    const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    const html = buf.toString('utf-8');

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url.hostname;

    let text = htmlToReadableText(html);
    if (text.length > MAX_TEXT_CHARS) {
      text = text.slice(0, MAX_TEXT_CHARS) + '\n\n[…truncated]';
    }

    return { ok: true, url: url.toString(), text, title };
  } catch (err) {
    const msg = (err as Error).name === 'AbortError' ? 'Request timed out' : (err as Error).message;
    return { ok: false, url: url.toString(), text: '', title: '', error: msg };
  } finally {
    clearTimeout(timer);
  }
}
