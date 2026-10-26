export function reportRendererStartupFailure(): void {
  try {
    window.schoolTutor?.reportRendererStartupFailure?.();
  } catch {
    // Reporting must not interfere with the fallback UI.
  }
}

export function reportRendererReady(): void {
  try {
    window.schoolTutor?.reportRendererReady?.();
  } catch {
    // Reporting must not interfere with the initialized UI.
  }
}

type RuntimeSchoolTutorBridge = {
  profiles?: { list?: unknown; create?: unknown };
  settings?: {
    getLanguage?: unknown;
    setLanguage?: unknown;
    getActiveProfile?: unknown;
    setActiveProfile?: unknown;
  };
  reportRendererStartupFailure?: unknown;
  reportRendererReady?: unknown;
};

export function isSchoolTutorBridgeAvailable(): boolean {
  try {
    const bridge = (window as Window & { schoolTutor?: RuntimeSchoolTutorBridge }).schoolTutor;
    return Boolean(
      typeof bridge?.profiles?.list === 'function' && typeof bridge.profiles.create === 'function' &&
      typeof bridge.settings?.getLanguage === 'function' && typeof bridge.settings.setLanguage === 'function' &&
      typeof bridge.settings.getActiveProfile === 'function' && typeof bridge.settings.setActiveProfile === 'function' &&
      typeof bridge.reportRendererStartupFailure === 'function' && typeof bridge.reportRendererReady === 'function',
    );
  } catch {
    return false;
  }
}
