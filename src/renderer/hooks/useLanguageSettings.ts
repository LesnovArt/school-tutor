import type { Dispatch, SetStateAction } from 'react';
import type { UiLanguage } from '../../contracts/profile';
import type { AppErrorKey } from './useAppStartup';

export function useLanguageSettings(options: {
  setLanguage: Dispatch<SetStateAction<UiLanguage>>;
  setErrorKey: Dispatch<SetStateAction<AppErrorKey | null>>;
}) {
  async function changeLanguage(next: UiLanguage): Promise<void> {
    try {
      const result = await window.schoolTutor.settings.setLanguage(next);
      if (result.ok) {
        options.setLanguage(result.value);
        options.setErrorKey(null);
      } else {
        options.setErrorKey('actionError');
      }
    } catch {
      options.setErrorKey('actionError');
    }
  }

  return { changeLanguage };
}
