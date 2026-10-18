import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  initializeLocalDiagnostics,
  sanitizeDiagnosticRecord,
  type DiagnosticContext,
  writeLocalDiagnostic,
} from './local-diagnostics';

const context: DiagnosticContext = {
  runId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  appVersion: '0.1.0',
  platform: 'darwin',
  arch: 'arm64',
  packaged: true,
  logDirectory: '/private/test-user-data/School Tutor/logs',
};

describe('local diagnostic redaction', () => {
  it('drops raw errors, console output, personal content, credentials, paths, and unknown fields', () => {
    const record = sanitizeDiagnosticRecord({
      level: 'error',
      event: 'startup.failed',
      correlationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      err: {
        code: 'SQLITE_MODULE_MISSING',
        message: 'Cannot find module at /Users/child/App/secrets/token.txt',
        rawError: new Error('database password is hunter2'),
      },
      metadata: {
        stage: 'database.initialize',
        outcome: 'failure',
        personalPath: '/Users/child/Library/Application Support/School Tutor',
        childName: 'Mila',
        credential: 'api-key-secret',
        consoleOutput: 'user typed their password',
        platform: 'darwin',
        arch: 'arm64',
        packaged: true,
      },
      console: 'raw renderer output',
      userContent: 'private study notes',
    }, context, '2026-10-18T12:00:00.000Z');

    expect(record).toEqual({
      timestamp: '2026-10-18T12:00:00.000Z',
      level: 'error',
      event: 'startup.failed',
      runId: context.runId,
      correlationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      appVersion: '0.1.0',
      err: { code: 'SQLITE_MODULE_MISSING' },
      metadata: {
        stage: 'database.initialize',
        outcome: 'failure',
        platform: 'darwin',
        arch: 'arm64',
        packaged: true,
      },
    });
    const serialized = JSON.stringify(record);
    for (const prohibited of [
      'Users/child',
      'hunter2',
      'api-key-secret',
      'Mila',
      'private study notes',
      'raw renderer output',
      'consoleOutput',
      'personalPath',
      'message',
    ]) {
      expect(serialized).not.toContain(prohibited);
    }
  });

  it('does not throw when the log location cannot be created', () => {
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'school-tutor-diagnostics-test-'));
    const pathBlocker = path.join(temporaryDirectory, 'file');
    writeFileSync(pathBlocker, 'not a directory');
    initializeLocalDiagnostics({
      logDirectory: path.join(pathBlocker, 'logs'),
      appVersion: '0.1.0',
      platform: 'darwin',
      arch: 'arm64',
      packaged: true,
    });
    expect(() => writeLocalDiagnostic({
      level: 'error',
      event: 'startup.failed',
      err: { code: 'STARTUP_FAILED' },
    })).not.toThrow();
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('writes only sanitized fields to the actual local log file', () => {
    const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'school-tutor-diagnostics-write-'));
    initializeLocalDiagnostics({
      logDirectory: temporaryDirectory,
      appVersion: '0.1.0',
      platform: 'darwin',
      arch: 'arm64',
      packaged: true,
    });
    writeLocalDiagnostic({
      level: 'error',
      event: 'startup.failed',
      correlationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      err: { code: 'STARTUP_FAILED', message: 'raw error with /Users/child/private.db' },
      metadata: {
        stage: 'database.initialize',
        outcome: 'failure',
        childName: 'Mila',
        email: 'child@example.test',
        credential: 'secret-token',
        profileId: 'private-profile-id',
      },
    });

    try {
      const serialized = readFileSync(path.join(temporaryDirectory, 'app.log'), 'utf8');
      expect(serialized).toContain('"err":{"code":"STARTUP_FAILED"}');
      for (const prohibited of ['/Users/child', 'private.db', 'Mila', 'child@example.test', 'secret-token', 'private-profile-id', 'raw error']) {
        expect(serialized).not.toContain(prohibited);
      }
      const record = JSON.parse(serialized) as Record<string, unknown>;
      expect(Object.keys(record).sort()).toEqual(['appVersion', 'correlationId', 'err', 'event', 'level', 'metadata', 'runId', 'timestamp']);
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
