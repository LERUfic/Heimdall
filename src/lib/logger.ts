type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogPayload {
  event: string;
  userId?: string;
  username?: string;
  metadata?: Record<string, any>;
  error?: any;
}

/**
 * Logs a structured JSON block to stdout for downstream log analyzers (Datadog, Loki, etc.)
 */
function emitLog(level: LogLevel, payload: LogPayload) {
  const logObject = {
    timestamp: new Date().toISOString(),
    level,
    event: payload.event,
    userId: payload.userId || 'SYSTEM',
    username: payload.username || 'SYSTEM',
    ...payload.metadata
  };

  if (payload.error) {
    (logObject as any).error = payload.error instanceof Error ? payload.error.message : String(payload.error);
    (logObject as any).stack = payload.error instanceof Error ? payload.error.stack : undefined;
  }

  // Using console.* directly so physical shell/docker stream catches it perfectly.
  const jsonStr = JSON.stringify(logObject);
  switch (level) {
    case 'INFO':
      console.log(jsonStr);
      break;
    case 'WARN':
      console.warn(jsonStr);
      break;
    case 'ERROR':
      console.error(jsonStr);
      break;
  }
}

export const logger = {
  info: (payload: LogPayload) => emitLog('INFO', payload),
  warn: (payload: LogPayload) => emitLog('WARN', payload),
  error: (payload: LogPayload) => emitLog('ERROR', payload)
};
