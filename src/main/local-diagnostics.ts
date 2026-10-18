import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_LOG_BYTES = 2 * 1024 * 1024;
const BACKUP_COUNT = 2;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENTS = new Set([
  'startup.started',
  'startup.stage',
  'startup.failed',
  'app.single_instance_lock',
  'database.initialize',
  'window.create',
  'window.load',
  'preload.load',
  'renderer.ready',
  'renderer.failed',
  'ipc.failed',
  'app.shutdown',
]);
const ERROR_CODES = new Set([
  'SQLITE_MODULE_MISSING',
  'DATABASE_INITIALIZATION_FAILED',
  'STARTUP_FAILED',
  'WINDOW_CREATION_FAILED',
  'WINDOW_LOAD_FAILED',
  'PAGE_LOAD_FAILED',
  'PRELOAD_LOAD_FAILED',
  'RENDERER_PROCESS_GONE',
  'RENDERER_STARTUP_FAILED',
  'RENDERER_NOT_READY',
  'IPC_REQUEST_FAILED',
  'SHUTDOWN_CLEANUP_FAILED',
]);
const METADATA_VALUES: Record<string, ReadonlySet<string>> = {
  stage: new Set([
    'bootstrap',
    'single_instance_lock',
    'app.ready',
    'database.initialize',
    'window.create',
    'window.load',
    'preload.load',
    'renderer.readiness',
    'app.shutdown',
    'ipc.request',
  ]),
  outcome: new Set(['started', 'acquired', 'denied', 'success', 'failure']),
  preloadStatus: new Set(['configured', 'error_not_observed', 'failed']),
};
const BOOLEAN_METADATA = new Set([
  'packaged',
  'appHeading',
  'languageControl',
  'profileSection',
  'createProfileForm',
  'styledBody',
]);

export type DiagnosticLevel = 'info' | 'warn' | 'error';
export type DiagnosticContext = {
  runId: string;
  appVersion: string;
  platform: string;
  arch: string;
  packaged: boolean;
  logDirectory: string;
};

export type DiagnosticRecord = {
  timestamp: string;
  level: DiagnosticLevel;
  event: string;
  runId: string;
  correlationId: string;
  appVersion: string;
  err?: { code: string };
  metadata: Record<string, string | boolean>;
};

let context: DiagnosticContext | undefined;

function safeString(value: unknown, maxLength = 64): string | undefined {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9._+-]+$/.test(value)) return undefined;
  return value.slice(0, maxLength);
}

function sanitizeMetadata(value: unknown): Record<string, string | boolean> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: Record<string, string | boolean> = {};
  for (const [key, allowedValues] of Object.entries(METADATA_VALUES)) {
    const candidate = source[key];
    if (typeof candidate === 'string' && allowedValues.has(candidate)) result[key] = candidate;
  }
  for (const key of ['platform', 'arch']) {
    const candidate = safeString(source[key]);
    if (candidate && new Set(['darwin', 'win32', 'linux', 'arm64', 'x64', 'ia32', 'arm']).has(candidate)) {
      result[key] = candidate;
    }
  }
  for (const key of BOOLEAN_METADATA) {
    if (typeof source[key] === 'boolean') result[key] = source[key] as boolean;
  }
  return result;
}

export function sanitizeDiagnosticRecord(
  input: unknown,
  recordContext: DiagnosticContext,
  timestamp = new Date().toISOString(),
): DiagnosticRecord {
  const source = typeof input === 'object' && input !== null
    ? input as Record<string, unknown>
    : {};
  const level: DiagnosticLevel = source.level === 'error' || source.level === 'warn'
    ? source.level
    : 'info';
  const requestedEvent = typeof source.event === 'string' && EVENTS.has(source.event)
    ? source.event
    : 'startup.stage';
  const sourceError = typeof source.err === 'object' && source.err !== null
    ? source.err as Record<string, unknown>
    : {};
  const errorCode = typeof sourceError.code === 'string' && ERROR_CODES.has(sourceError.code)
    ? sourceError.code
    : undefined;
  const correlationId = typeof source.correlationId === 'string' &&
    UUID_PATTERN.test(source.correlationId)
    ? source.correlationId
    : randomUUID();
  const runId = UUID_PATTERN.test(recordContext.runId) ? recordContext.runId : randomUUID();
  const appVersion = safeString(recordContext.appVersion, 32) ?? 'unknown';
  const metadata = sanitizeMetadata(source.metadata);
  metadata.platform = new Set(['darwin', 'win32', 'linux']).has(recordContext.platform)
    ? recordContext.platform
    : 'unknown';
  metadata.arch = new Set(['arm64', 'x64', 'ia32', 'arm']).has(recordContext.arch)
    ? recordContext.arch
    : 'unknown';
  metadata.packaged = recordContext.packaged;

  return {
    timestamp,
    level,
    event: requestedEvent,
    runId,
    correlationId,
    appVersion,
    ...(errorCode ? { err: { code: errorCode } } : {}),
    metadata,
  };
}

export function initializeLocalDiagnostics(options: {
  logDirectory: string;
  appVersion: string;
  platform: string;
  arch: string;
  packaged: boolean;
}): void {
  try {
    context = {
      ...options,
      runId: randomUUID(),
    };
    mkdirSync(context.logDirectory, { recursive: true, mode: 0o700 });
  } catch {
    // Diagnostics are best effort and must never prevent the app from starting.
    context = undefined;
  }
}

export function createCorrelationId(): string {
  return randomUUID();
}

function rotateIfNeeded(filePath: string, nextRecordBytes: number): void {
  try {
    if (statSync(filePath).size + nextRecordBytes <= MAX_LOG_BYTES) return;
  } catch {
    return;
  }
  try {
    rmSync(`${filePath}.${BACKUP_COUNT}`, { force: true });
    for (let index = BACKUP_COUNT - 1; index >= 1; index -= 1) {
      try {
        renameSync(`${filePath}.${index}`, `${filePath}.${index + 1}`);
      } catch {
        // Missing older generations are expected.
      }
    }
    renameSync(filePath, `${filePath}.1`);
  } catch {
    // Keep logging best effort if rotation is blocked by the filesystem.
  }
}

export function writeLocalDiagnostic(input: unknown): void {
  if (!context) return;
  try {
    const record = sanitizeDiagnosticRecord(input, context);
    const line = `${JSON.stringify(record)}\n`;
    const filePath = path.join(context.logDirectory, 'app.log');
    rotateIfNeeded(filePath, Buffer.byteLength(line));
    appendFileSync(filePath, line, { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Diagnostics are best effort and must never crash the app.
  }
}
