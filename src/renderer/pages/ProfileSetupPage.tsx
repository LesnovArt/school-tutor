import type { SubmitEvent } from 'react';
import type { Profile, UiLanguage } from '../../contracts/profile';
import type { AppMessages } from '../localization/messages';
import type { AgeBand } from '../hooks/useProfileForm';
import { AppHeader } from '../components/AppHeader';
import { ProfileForm } from '../components/ProfileForm';
import { ProfileList } from '../components/ProfileList';

type Props = {
  text: AppMessages;
  profiles: Profile[];
  hasProfiles: boolean;
  canCreateProfile: boolean;
  profileSummary: string;
  selectedProfile: Profile | undefined;
  selectedId: string;
  profileMutationPending: boolean;
  language: UiLanguage;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  error: string;
  onLanguageChange: (language: UiLanguage) => void;
  onProfileSelect: (profileId: string) => void;
  form: {
    name: string;
    setName: (value: string) => void;
    ageBand: AgeBand;
    setAgeBand: (value: AgeBand) => void;
    preferredLanguage: UiLanguage;
    setPreferredLanguage: (value: UiLanguage) => void;
    preferences: string;
    setPreferences: (value: string) => void;
    saving: boolean;
    submit: (event: SubmitEvent<HTMLFormElement>) => void;
    ageValues: readonly AgeBand[];
  };
};

export function ProfileSetupPage(props: Props): React.JSX.Element {
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
      />
      <section className="card">
        <div className="section-heading">
          <span className="step">01</span>
          <div>
            <h2>{props.text.profiles}</h2>
            <p>{props.profileSummary}</p>
          </div>
        </div>
        {props.hasProfiles && <ProfileList
          profiles={props.profiles}
          selectedId={props.selectedId}
          disabled={props.profileMutationPending}
          languageNames={props.languageNames}
          onSelect={props.onProfileSelect}
        />}
        {props.selectedProfile && <div className="selected-note"><span className="dot" /> {props.text.selected}: <strong>{props.selectedProfile.displayName}</strong></div>}
      </section>
      {props.canCreateProfile && <ProfileForm
        text={props.text}
        ageValues={props.form.ageValues}
        name={props.form.name}
        ageBand={props.form.ageBand}
        preferredLanguage={props.form.preferredLanguage}
        preferences={props.form.preferences}
        saving={props.form.saving}
        disabled={props.profileMutationPending}
        languages={props.languages}
        languageNames={props.languageNames}
        onNameChange={props.form.setName}
        onAgeBandChange={props.form.setAgeBand}
        onPreferredLanguageChange={props.form.setPreferredLanguage}
        onPreferencesChange={props.form.setPreferences}
        onSubmit={props.form.submit}
      />}
      {props.error && <p role="alert" className="error">{props.error}</p>}
      <footer>{props.text.footer}</footer>
    </main>
  );
}
