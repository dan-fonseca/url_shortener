type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[(process.env.LOG_LEVEL?.toLowerCase() as Level) ?? 'info'] ?? LEVELS.info;

let baseContext: Record<string, unknown> = {};

/**
 * Minimal structured logger. Each line is a standalone JSON object so CloudWatch
 * Logs Insights discovers every field automatically (e.g. `filter code = "abc"`).
 */
export const logger = {
  setContext(context: Record<string, unknown>) {
    baseContext = context;
  },
  debug: (msg: string, fields?: Record<string, unknown>) => write('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write('error', msg, fields),
};

function write(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  if (LEVELS[level] < threshold) return;
  const entry = { timestamp: new Date().toISOString(), level, msg, ...baseContext, ...fields };
  process.stdout.write(`${JSON.stringify(entry, errorReplacer)}\n`);
}

function errorReplacer(_key: string, value: unknown) {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}
