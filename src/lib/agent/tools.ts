import { Type, type FunctionDeclaration } from '@google/genai';

/**
 * The toolset is deliberately tiny and legible — the point is to show the
 * loop, not build a kitchen sink. web_search discovers sources, fetch_url
 * reads one, finish ends the loop.
 */
export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'web_search',
    description:
      'Search the web for sources relevant to a query. Returns up to 5 results with title, url, and a short snippet. Use this to discover sources before reading them.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'A focused search query.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_url',
    description:
      'Fetch a single web page and return its readable text. Use this to read a promising source found via web_search. Only http/https public URLs are allowed.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: 'The full http(s) URL of the page to read.',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'finish',
    description:
      'Call this when you have gathered enough grounded evidence to answer the question. Signals the loop to stop and write the cited report.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
];
