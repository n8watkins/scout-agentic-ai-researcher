import { sanitizeText } from './sanitize';
import { logger } from './logger';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Web search adapter. Tavily is primary (clean text, generous free tier);
 * Google Programmable Search is the fallback. If neither key is configured,
 * we return a small DuckDuckGo Instant Answer result set so the demo still
 * does *something* without any paid key — clearly a best-effort fallback.
 */
export async function webSearch(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  if (tavilyKey) {
    try {
      return await tavilySearch(query, tavilyKey, signal);
    } catch (err) {
      logger.warn('Tavily search failed, trying fallback', { err: String(err) });
    }
  }

  const googleKey = process.env.GOOGLE_SEARCH_API_KEY?.trim();
  const googleCx = process.env.GOOGLE_SEARCH_ENGINE_ID?.trim();
  if (googleKey && googleCx) {
    try {
      return await googleSearch(query, googleKey, googleCx, signal);
    } catch (err) {
      logger.warn('Google CSE search failed, trying fallback', { err: String(err) });
    }
  }

  // Keyless best-effort fallback. DuckDuckGo's Instant Answer API only covers
  // a narrow set of queries, so we lead with Wikipedia's search API (keyless,
  // returns real citable articles) and fall back to DDG for the rest.
  try {
    const wiki = await wikipediaSearch(query, signal);
    if (wiki.length > 0) return wiki;
  } catch (err) {
    logger.warn('Wikipedia fallback failed', { err: String(err) });
  }
  try {
    return await duckDuckGoSearch(query, signal);
  } catch (err) {
    logger.warn('DuckDuckGo fallback failed', { err: String(err) });
    return [];
  }
}

async function wikipediaSearch(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', '5');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': 'ScoutResearchBot/1.0 (+https://github.com/n8watkins)' },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  const data = (await res.json()) as {
    query?: { search?: Array<{ title?: string; snippet?: string }> };
  };
  return (data.query?.search ?? []).slice(0, 5).map((r) => {
    const title = r.title ?? 'Untitled';
    return {
      title: sanitizeText(title),
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      snippet: sanitizeText((r.snippet ?? '').replace(/<[^>]+>/g, '')),
    };
  });
}

async function tavilySearch(
  query: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      search_depth: 'basic',
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
  return (data.results ?? []).slice(0, 5).map((r) => ({
    title: sanitizeText(r.title ?? r.url ?? 'Untitled'),
    url: r.url ?? '',
    snippet: sanitizeText(r.content ?? ''),
  }));
}

async function googleSearch(
  query: string,
  apiKey: string,
  cx: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '5');
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Google CSE ${res.status}`);
  const data = (await res.json()) as { items?: Array<{ title?: string; link?: string; snippet?: string }> };
  return (data.items ?? []).slice(0, 5).map((r) => ({
    title: sanitizeText(r.title ?? r.link ?? 'Untitled'),
    url: r.link ?? '',
    snippet: sanitizeText(r.snippet ?? ''),
  }));
}

async function duckDuckGoSearch(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const url = new URL('https://api.duckduckgo.com/');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_html', '1');
  url.searchParams.set('skip_disambig', '1');
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`DDG ${res.status}`);
  const data = (await res.json()) as {
    AbstractURL?: string;
    Heading?: string;
    AbstractText?: string;
    RelatedTopics?: Array<{ FirstURL?: string; Text?: string }>;
  };
  const out: SearchResult[] = [];
  if (data.AbstractText && data.AbstractURL) {
    out.push({
      title: sanitizeText(data.Heading ?? query),
      url: data.AbstractURL,
      snippet: sanitizeText(data.AbstractText),
    });
  }
  for (const t of data.RelatedTopics ?? []) {
    if (out.length >= 5) break;
    if (t.FirstURL && t.Text) {
      out.push({
        title: sanitizeText(t.Text.slice(0, 80)),
        url: t.FirstURL,
        snippet: sanitizeText(t.Text),
      });
    }
  }
  return out;
}
