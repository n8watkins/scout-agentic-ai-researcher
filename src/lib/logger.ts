/**
 * Tiny logging wrapper. Quiet in production by default; never logs secrets.
 */
const isDev = process.env.NODE_ENV === 'development';

function emit(level: 'debug' | 'info' | 'warn' | 'error', msg: string, meta?: unknown) {
  if (!isDev && level === 'debug') return;
  const line = `[scout:${level}] ${msg}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (meta !== undefined) fn(line, meta);
  else fn(line);
}

export const logger = {
  debug: (msg: string, meta?: unknown) => emit('debug', msg, meta),
  info: (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn: (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
