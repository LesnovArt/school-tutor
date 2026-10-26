import type { UiLanguage } from '../../contracts/profile';

type Props = {
  label: string;
  value: UiLanguage;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  onChange: (language: UiLanguage) => void;
};

export function LanguagePicker({ label, value, languages, languageNames, onChange }: Props): React.JSX.Element {
  return (
    <label className="language-control">{label}
      <select value={value} onChange={(event) => onChange(event.target.value as UiLanguage)}>
        {languages.map((language) => <option key={language} value={language}>{languageNames[language]}</option>)}
      </select>
    </label>
  );
}
