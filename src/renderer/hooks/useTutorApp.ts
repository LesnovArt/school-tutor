import { useLocalization } from './useLocalization';
import { useAppStartup } from './useAppStartup';
import { useLanguageSettings } from './useLanguageSettings';
import { useProfileActions } from './useProfileActions';
import { useProfileForm } from './useProfileForm';

export function useTutorApp() {
  const startup = useAppStartup();
  const localization = useLocalization(startup.language);
  const profileActions = useProfileActions({
    setProfiles: startup.setProfiles,
    setSelectedId: startup.setSelectedId,
    setErrorKey: startup.setErrorKey,
  });
  const languageSettings = useLanguageSettings({
    setLanguage: startup.setLanguage,
    setErrorKey: startup.setErrorKey,
  });
  const profileForm = useProfileForm(profileActions.createProfile, profileActions.pending);
  const selectedProfile = startup.profiles.find((profile) => profile.id === startup.selectedId);

  return {
    ...startup,
    ...localization,
    ...profileActions,
    ...languageSettings,
    profileForm,
    profileMutationPending: profileActions.pending !== 'idle',
    selectedProfile,
    hasProfiles: startup.profiles.length > 0,
    canCreateProfile: startup.profiles.length < 2,
    profileSummary: startup.profiles.length ? `${startup.profiles.length} / 2` : localization.text.empty,
    error: startup.errorKey ? localization.text[startup.errorKey] : '',
  };
}
