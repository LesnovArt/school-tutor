import { LoadingScreen } from './components/LoadingScreen';
import { StartupFailureScreen } from './components/StartupFailureScreen';
import { ChildHomePage } from './pages/ChildHomePage';
import { ParentPage } from './pages/ParentPage';
import { useTutorApp } from './hooks/useTutorApp';
import './style.css';

export function App(): React.JSX.Element {
  const app = useTutorApp();

  if (app.status === 'loading') return <LoadingScreen message={app.text.loading} />;
  if (app.status === 'failed') {
    return <StartupFailureScreen title={app.text.startupTitle} message={app.text.startupError} hint={app.text.startupHint} />;
  }

  if (app.view === 'parent') {
    return <ParentPage
      text={app.text}
      status={app.parentAccess.status}
      notice={app.parentAccess.notice}
      accessPending={app.parentAccess.pending}
      profiles={app.profiles}
      canCreateProfile={app.canCreateProfile}
      profileMutationPending={app.profileMutationPending}
      form={app.profileForm}
      state={app.parentConsole}
      language={app.language}
      languages={app.supportedLanguages}
      languageNames={app.languageNames}
      error={app.error}
      onLanguageChange={(language) => void app.changeLanguage(language)}
      onSetupPin={app.parentAccess.setupPin}
      onUnlock={app.parentAccess.unlock}
      onLock={() => void app.parentAccess.lock()}
      onExplanationLanguage={(profileId, language) => void app.setExplanationLanguage(profileId, language)}
      onClose={app.closeParent}
    />;
  }

  return <ChildHomePage
    text={app.text}
    profiles={app.profiles}
    hasProfiles={app.hasProfiles}
    profileSummary={app.profileSummary}
    selectedProfile={app.selectedProfile}
    selectedId={app.selectedId}
    profileMutationPending={app.profileMutationPending}
    space={app.studySpace}
    language={app.language}
    languages={app.supportedLanguages}
    languageNames={app.languageNames}
    error={app.error}
    onLanguageChange={(language) => void app.changeLanguage(language)}
    onProfileSelect={(profileId) => void app.selectProfile(profileId)}
    onSelectEnrollment={(enrollmentId) => void app.selectEnrollment(enrollmentId)}
    onOpenParent={app.openParent}
  />;
}
