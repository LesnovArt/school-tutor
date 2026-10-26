import type { SubmitEvent } from 'react';
import type { Profile, UiLanguage } from '../../contracts/profile';
import type { ParentConsoleState } from '../hooks/useParentConsole';
import type { AgeBand } from '../hooks/useProfileForm';
import type { AppMessages } from '../localization/messages';
import { EnrollmentManager } from './EnrollmentManager';
import { LessonManager } from './LessonManager';
import { ProfileForm } from './ProfileForm';

export type ProfileFormState = {
  name: string; setName: (value: string) => void;
  ageBand: AgeBand; setAgeBand: (value: AgeBand) => void;
  preferredLanguage: UiLanguage; setPreferredLanguage: (value: UiLanguage) => void;
  preferences: string; setPreferences: (value: string) => void;
  saving: boolean; submit: (event: SubmitEvent<HTMLFormElement>) => void; ageValues: readonly AgeBand[];
};

type Props = {
  text: AppMessages;
  profiles: Profile[];
  canCreateProfile: boolean;
  profileMutationPending: boolean;
  form: ProfileFormState;
  state: ParentConsoleState;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  onExplanationLanguage: (profileId: string, language: UiLanguage) => void;
};

export function ParentConsole(props: Props): React.JSX.Element {
  const { text, profiles, state } = props;
  const managed = profiles.find((profile) => profile.id === state.profileId);
  return (
    <>
      {props.canCreateProfile && <ProfileForm
        text={text}
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
      {!managed && <p className="muted">{text.needProfile}</p>}
      {managed && <>
        <section className="card">
          <div className="two-col">
            <label className="field">{text.manageChild}
              <select value={managed.id} disabled={state.pending} onChange={(event) => state.chooseProfile(event.target.value)}>
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}
              </select>
            </label>
            <label className="field">{text.preferred}
              <select value={managed.preferredLanguage} disabled={props.profileMutationPending}
                onChange={(event) => props.onExplanationLanguage(managed.id, event.target.value as UiLanguage)}>
                {props.languages.map((language) => <option key={language} value={language}>{props.languageNames[language]}</option>)}
              </select>
            </label>
          </div>
        </section>
        <EnrollmentManager text={text} state={state} languages={props.languages} languageNames={props.languageNames} />
        <LessonManager text={text} state={state} languages={props.languages} languageNames={props.languageNames} />
      </>}
    </>
  );
}
