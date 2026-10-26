import { useEffect, useState } from 'react';
import type { Profile, UiLanguage } from '../../contracts/profile';
import { settingsApi } from '../api/settings';
import { resolveSelectedProfileId } from './profile-selection';
import { reportRendererReady, reportRendererStartupFailure, isSchoolTutorBridgeAvailable } from '../diagnostics/startup-diagnostics';

export type AppErrorKey = 'startupError' | 'actionError' | 'selectionError' | 'createError';
export type StartupStatus = 'loading' | 'ready' | 'failed';

export function useAppStartup() {
  const [language, setLanguage] = useState<UiLanguage>('uk');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [errorKey, setErrorKey] = useState<AppErrorKey | null>(null);
  const [status, setStatus] = useState<StartupStatus>('loading');

  useEffect(() => {
    const diagnosticsUntil = Date.now() + 15_000;
    const onStartupError = () => {
      if (Date.now() < diagnosticsUntil) reportRendererStartupFailure();
    };
    window.addEventListener('error', onStartupError);
    window.addEventListener('unhandledrejection', onStartupError);
    return () => {
      window.removeEventListener('error', onStartupError);
      window.removeEventListener('unhandledrejection', onStartupError);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const failStartup = () => {
      reportRendererStartupFailure();
      setErrorKey('startupError');
      setStatus('failed');
    };

    if (!isSchoolTutorBridgeAvailable()) {
      failStartup();
      return () => { cancelled = true; };
    }

    void Promise.all([
      window.schoolTutor.profiles.list(),
      settingsApi.getLanguage(),
      settingsApi.getActiveProfile(),
    ]).then(([profileResult, languageResult, activeResult]) => {
      if (cancelled) return;
      if (!profileResult.ok || !languageResult.ok || !activeResult.ok) {
        failStartup();
        return;
      }
      setProfiles(profileResult.value);
      setSelectedId(resolveSelectedProfileId(profileResult.value, activeResult.value));
      setLanguage(languageResult.value);
      setStatus('ready');
    }).catch(() => {
      if (!cancelled) failStartup();
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status === 'ready') reportRendererReady();
  }, [status]);

  return {
    language, setLanguage, profiles, setProfiles, selectedId, setSelectedId,
    errorKey, setErrorKey, status,
  };
}
