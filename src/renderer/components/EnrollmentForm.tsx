import { useState, type SubmitEvent } from 'react';
import type { UiLanguage } from '../../contracts/profile';
import type { SchoolSystem } from '../../contracts/study';
import type { AppMessages } from '../localization/messages';

export type EnrollmentValues = { schoolSystem: SchoolSystem; academicYear: string; grade: number; homeworkLanguage: UiLanguage };

const grades = Array.from({ length: 12 }, (_, index) => index + 1);

export function defaultAcademicYear(now = new Date()): string {
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

type Props = {
  text: AppMessages;
  initial: EnrollmentValues;
  lockSchoolSystem: boolean;
  submitLabel: string;
  disabled: boolean;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  onSubmit: (values: EnrollmentValues) => Promise<boolean>;
  onCancel?: () => void;
};

export function EnrollmentForm(props: Props): React.JSX.Element {
  const { text, initial } = props;
  const [schoolSystem, setSchoolSystem] = useState(initial.schoolSystem);
  const [academicYear, setAcademicYear] = useState(initial.academicYear);
  const [grade, setGrade] = useState(initial.grade);
  const [homeworkLanguage, setHomeworkLanguage] = useState(initial.homeworkLanguage);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (await props.onSubmit({ schoolSystem, academicYear, grade, homeworkLanguage })) props.onCancel?.();
  }

  return (
    <form className="inline-form" onSubmit={(event) => void submit(event)}>
      <div className="two-col">
        <label>{text.schoolSystem}<select disabled={props.disabled || props.lockSchoolSystem} value={schoolSystem}
          onChange={(event) => setSchoolSystem(event.target.value as SchoolSystem)}>
          <option value="ua">{text.schoolNames.ua}</option>
          <option value="bg">{text.schoolNames.bg}</option>
        </select></label>
        <label>{text.year}<input disabled={props.disabled} required pattern="\d{4}-\d{4}" placeholder="2026-2027" maxLength={9}
          value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} /></label>
      </div>
      <div className="two-col">
        <label>{text.grade}<select disabled={props.disabled} value={grade} onChange={(event) => setGrade(Number(event.target.value))}>
          {grades.map((value) => <option key={value} value={value}>{value}</option>)}
        </select></label>
        <label>{text.homeworkLanguage}<select disabled={props.disabled} value={homeworkLanguage}
          onChange={(event) => setHomeworkLanguage(event.target.value as UiLanguage)}>
          {props.languages.map((language) => <option key={language} value={language}>{props.languageNames[language]}</option>)}
        </select></label>
      </div>
      <div className="actions">
        <button className="primary" type="submit" disabled={props.disabled}>{props.submitLabel}</button>
        {props.onCancel && <button className="ghost" type="button" onClick={props.onCancel}>{text.cancel}</button>}
      </div>
    </form>
  );
}
