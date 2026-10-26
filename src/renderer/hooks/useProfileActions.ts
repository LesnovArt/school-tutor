import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { CreateProfileInput, Profile, UiLanguage } from '../../contracts/profile';
import { settingsApi } from '../api/settings';
import type { AppErrorKey } from './useAppStartup';

export type ProfileMutation = 'idle' | 'selecting' | 'creating' | 'updating';
export type CreateProfileOutcome = 'failed' | 'created' | 'created-and-selected';

export function useProfileActions(options: {
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  setSelectedId: Dispatch<SetStateAction<string>>;
  setErrorKey: Dispatch<SetStateAction<AppErrorKey | null>>;
  onLocked: () => void;
}) {
  const { setProfiles, setSelectedId, setErrorKey, onLocked } = options;
  const mutationInProgress = useRef(false);
  const [pending, setPending] = useState<ProfileMutation>('idle');

  function beginMutation(mutation: Exclude<ProfileMutation, 'idle'>): boolean {
    if (mutationInProgress.current) return false;
    mutationInProgress.current = true;
    setPending(mutation);
    setErrorKey(null);
    return true;
  }

  function finishMutation(): void {
    mutationInProgress.current = false;
    setPending('idle');
  }

  async function selectProfile(profileId: string): Promise<void> {
    if (!beginMutation('selecting')) return;
    try {
      const result = await settingsApi.setActiveProfile(profileId);
      if (result.ok) {
        setSelectedId(result.value);
        setErrorKey(null);
      } else {
        setErrorKey('selectionError');
      }
    } catch {
      setErrorKey('selectionError');
    } finally {
      finishMutation();
    }
  }

  async function createProfile(input: CreateProfileInput): Promise<CreateProfileOutcome> {
    if (!beginMutation('creating')) return 'failed';
    let profileCreated = false;
    try {
      const result = await window.schoolTutor.profiles.create(input);
      if (!result.ok) {
        if (result.error.code === 'UnauthorizedAction') onLocked();
        setErrorKey(result.error.code === 'UnauthorizedAction' ? 'lockedError' : 'createError');
        return 'failed';
      }
      profileCreated = true;
      setProfiles((current) => [...current, result.value]);
      const selectedResult = await settingsApi.setActiveProfile(result.value.id);
      if (!selectedResult.ok) {
        setErrorKey('selectionError');
        return 'created';
      }
      setSelectedId(selectedResult.value);
      return 'created-and-selected';
    } catch {
      setErrorKey(profileCreated ? 'selectionError' : 'createError');
      return profileCreated ? 'created' : 'failed';
    } finally {
      finishMutation();
    }
  }

  async function setExplanationLanguage(profileId: string, preferredLanguage: UiLanguage): Promise<void> {
    if (!beginMutation('updating')) return;
    try {
      const result = await window.schoolTutor.profiles.setExplanationLanguage({ profileId, preferredLanguage });
      if (result.ok) {
        setProfiles((current) => current.map((profile) => (profile.id === profileId ? result.value : profile)));
      } else {
        if (result.error.code === 'UnauthorizedAction') onLocked();
        setErrorKey(result.error.code === 'UnauthorizedAction' ? 'lockedError' : 'actionError');
      }
    } catch {
      setErrorKey('actionError');
    } finally {
      finishMutation();
    }
  }

  return { selectProfile, createProfile, setExplanationLanguage, pending };
}
