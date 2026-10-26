import type { UiLanguage } from '../../contracts/profile';
import { LanguagePicker } from './LanguagePicker';

type Props = {
  title: string;
  subtitle: string;
  languageLabel: string;
  language: UiLanguage;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  onLanguageChange: (language: UiLanguage) => void;
  children?: React.ReactNode;
};

export function AppHeader(props: Props): React.JSX.Element {
  return (
    <header className="topbar">
      <div><p className="eyebrow">SCHOOL TUTOR</p><h1>{props.title}</h1><p className="subtitle">{props.subtitle}</p></div>
      <div className="header-controls">
        <LanguagePicker
          label={props.languageLabel}
          value={props.language}
          languages={props.languages}
          languageNames={props.languageNames}
          onChange={props.onLanguageChange}
        />
        {props.children}
      </div>
    </header>
  );
}
