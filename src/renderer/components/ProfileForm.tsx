import type { SubmitEvent } from 'react';
import type { UiLanguage } from '../../contracts/profile';
import type { AppMessages } from '../localization/messages';
import type { AgeBand } from '../hooks/useProfileForm';

type Props = {
  text: AppMessages;
  ageValues: readonly AgeBand[];
  name: string;
  ageBand: AgeBand;
  preferredLanguage: UiLanguage;
  preferences: string;
  saving: boolean;
  disabled: boolean;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  onNameChange: (value: string) => void;
  onAgeBandChange: (value: AgeBand) => void;
  onPreferredLanguageChange: (value: UiLanguage) => void;
  onPreferencesChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

export function ProfileForm(props: Props): React.JSX.Element {
  return (
    <section className="card form-card">
      <div className="section-heading"><div><h2>{props.text.create}</h2></div></div>
      <form onSubmit={props.onSubmit}>
        <label>{props.text.name}<input disabled={props.disabled} autoComplete="off" maxLength={40} required value={props.name} onChange={(event) => props.onNameChange(event.target.value)} /></label>
        <div className="two-col">
          <label>{props.text.age}<select disabled={props.disabled} value={props.ageBand} onChange={(event) => props.onAgeBandChange(event.target.value as AgeBand)}>
            {props.ageValues.map((value, index) => <option value={value} key={value}>{props.text.ageOptions[index]}</option>)}
          </select></label>
          <label>{props.text.preferred}<select disabled={props.disabled} value={props.preferredLanguage} onChange={(event) => props.onPreferredLanguageChange(event.target.value as UiLanguage)}>
            {props.languages.map((language) => <option value={language} key={language}>{props.languageNames[language]}</option>)}
          </select></label>
        </div>
        <label>{props.text.preferences}<textarea disabled={props.disabled} maxLength={240} rows={2} value={props.preferences} onChange={(event) => props.onPreferencesChange(event.target.value)} /></label>
        <button className="primary" type="submit" disabled={props.disabled}>
          {props.saving ? props.text.saving : props.text.create}<span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}
