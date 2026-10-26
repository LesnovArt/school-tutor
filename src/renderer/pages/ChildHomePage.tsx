import type { Profile, UiLanguage } from '../../contracts/profile';
import type { StudySpace } from '../../contracts/study';
import type { AppMessages } from '../localization/messages';
import { AppHeader } from '../components/AppHeader';
import { ProfileList } from '../components/ProfileList';
import { StudySpaceView } from '../components/StudySpaceView';

type Props = {
  text: AppMessages;
  profiles: Profile[];
  hasProfiles: boolean;
  profileSummary: string;
  selectedProfile: Profile | undefined;
  selectedId: string;
  profileMutationPending: boolean;
  space: StudySpace | null;
  language: UiLanguage;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  error: string;
  onLanguageChange: (language: UiLanguage) => void;
  onProfileSelect: (profileId: string) => void;
  onSelectEnrollment: (enrollmentId: string) => void;
  onOpenParent: () => void;
};

export function ChildHomePage(props: Props): React.JSX.Element {
  return (
    <main className="page">
      <AppHeader
        title={props.text.title}
        subtitle={props.text.subtitle}
        languageLabel={props.text.language}
        language={props.language}
        languages={props.languages}
        languageNames={props.languageNames}
        onLanguageChange={props.onLanguageChange}
      >
        <button type="button" className="ghost" onClick={props.onOpenParent}>{props.text.parentSettings}</button>
      </AppHeader>
      <section className="card">
        <div className="section-heading">
          <span className="step">01</span>
          <div>
            <h2>{props.text.profiles}</h2>
            <p>{props.profileSummary}</p>
          </div>
        </div>
        {props.hasProfiles
          ? <ProfileList
            profiles={props.profiles}
            selectedId={props.selectedId}
            disabled={props.profileMutationPending}
            languageNames={props.languageNames}
            onSelect={props.onProfileSelect}
          />
          : <p className="muted">{props.text.emptyChildren}</p>}
        {props.selectedProfile && <div className="selected-note"><span className="dot" /> {props.text.selected}: <strong>{props.selectedProfile.displayName}</strong></div>}
      </section>
      {props.selectedProfile && <StudySpaceView
        text={props.text}
        profile={props.selectedProfile}
        space={props.space}
        languageNames={props.languageNames}
        onSelectEnrollment={props.onSelectEnrollment}
      />}
      {props.error && <p role="alert" className="error">{props.error}</p>}
      <footer>{props.text.footer}</footer>
    </main>
  );
}
