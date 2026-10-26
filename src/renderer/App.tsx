import { LoadingScreen } from './components/LoadingScreen';
import { StartupFailureScreen } from './components/StartupFailureScreen';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { useTutorApp } from './hooks/useTutorApp';
import './style.css';

export function App(): React.JSX.Element {
  const app = useTutorApp();

  if (app.status === 'loading') return <LoadingScreen message={app.text.loading} />;
  if (app.status === 'failed') {
    return <StartupFailureScreen title={app.text.startupTitle} message={app.text.startupError} hint={app.text.startupHint} />;
  }

  return <ProfileSetupPage
    text={app.text}
    profiles={app.profiles}
    hasProfiles={app.hasProfiles}
    canCreateProfile={app.canCreateProfile}
    profileSummary={app.profileSummary}
    selectedProfile={app.selectedProfile}
    selectedId={app.selectedId}
    profileMutationPending={app.profileMutationPending}
    language={app.language}
    languages={app.supportedLanguages}
    languageNames={app.languageNames}
    error={app.error}
    onLanguageChange={(language) => void app.changeLanguage(language)}
    onProfileSelect={(profileId) => void app.selectProfile(profileId)}
    form={app.profileForm}
  />;
}
