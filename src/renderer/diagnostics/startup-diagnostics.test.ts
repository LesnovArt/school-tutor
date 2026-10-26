import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isSchoolTutorBridgeAvailable,
  reportRendererReady,
  reportRendererStartupFailure,
} from './startup-diagnostics';

afterEach(() => vi.unstubAllGlobals());

describe('renderer startup diagnostics bridge', () => {
  it('shows the bridge as unavailable when preload did not expose it', () => {
    vi.stubGlobal('window', {});
    expect(isSchoolTutorBridgeAvailable()).toBe(false);
    expect(() => reportRendererStartupFailure()).not.toThrow();
    expect(() => reportRendererReady()).not.toThrow();
  });

  it('does not let a throwing diagnostics reporter break fallback rendering', () => {
    vi.stubGlobal('window', {
      schoolTutor: {
        profiles: { list: vi.fn(), create: vi.fn() },
        settings: { getLanguage: vi.fn(), setLanguage: vi.fn(), getActiveProfile: vi.fn(), setActiveProfile: vi.fn() },
        reportRendererStartupFailure: () => { throw new Error('preload bridge failed'); },
        reportRendererReady: vi.fn(),
      },
    });
    expect(isSchoolTutorBridgeAvailable()).toBe(true);
    expect(() => reportRendererStartupFailure()).not.toThrow();
  });
});
