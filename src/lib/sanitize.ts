import createDOMPurify from 'isomorphic-dompurify';

/**
 * Turn a fetched HTML document into plain, readable text safe to hand to the
 * model and the DOM. We strip scripts/styles/nav chrome, then collapse to text.
 */
export function htmlToReadableText(html: string): string {
  const DOMPurify = createDOMPurify;

  // First pass: sanitize away anything executable or structurally noisy.
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'li', 'ul', 'ol', 'blockquote', 'article', 'section',
      'main', 'span', 'div', 'br', 'strong', 'em', 'a', 'td', 'th', 'tr', 'table',
    ],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  // Second pass: extract text. In the browser a `DOMParser` is available and
  // gives accurate text extraction. On the server (where fetched pages are
  // actually processed) there is no global `DOMParser`, so this always falls
  // through to the regex tag-strip below — that path is the real workhorse here.
  let text: string;
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(clean, 'text/html');
    text = doc.body?.textContent ?? clean.replace(/<[^>]+>/g, ' ');
  } else {
    text = clean.replace(/<[^>]+>/g, ' ');
  }

  return text
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Sanitize a short string (e.g. a search snippet) to plain text. */
export function sanitizeText(input: string): string {
  return createDOMPurify
    .sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .trim();
}
