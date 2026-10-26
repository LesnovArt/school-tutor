import { useState, type SubmitEvent } from 'react';
import type { UiLanguage } from '../../contracts/profile';
import type { AppMessages } from '../localization/messages';

export type LessonValues = {
  title: string; schoolLanguage: UiLanguage; topicNotes: string; prerequisiteNotes: string; relatedLessonId: string | null;
};
export type RelatedOption = { id: string; label: string };

type Props = {
  text: AppMessages;
  initial: LessonValues;
  relatedOptions: RelatedOption[] | null;
  submitLabel: string;
  disabled: boolean;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  onSubmit: (values: LessonValues) => Promise<boolean>;
  onCancel?: () => void;
};

export function LessonEditor(props: Props): React.JSX.Element {
  const { text, initial } = props;
  const [title, setTitle] = useState(initial.title);
  const [schoolLanguage, setSchoolLanguage] = useState(initial.schoolLanguage);
  const [topicNotes, setTopicNotes] = useState(initial.topicNotes);
  const [prerequisiteNotes, setPrerequisiteNotes] = useState(initial.prerequisiteNotes);
  const [relatedLessonId, setRelatedLessonId] = useState(initial.relatedLessonId);

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const saved = await props.onSubmit({ title, schoolLanguage, topicNotes, prerequisiteNotes, relatedLessonId });
    if (!saved) return;
    if (props.onCancel) props.onCancel();
    else { setTitle(''); setTopicNotes(''); setPrerequisiteNotes(''); }
  }

  return (
    <form className="inline-form" onSubmit={(event) => void submit(event)}>
      <div className="two-col">
        <label>{text.lessonTitle}<input disabled={props.disabled} required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>{text.lessonLanguage}<select disabled={props.disabled} value={schoolLanguage} onChange={(event) => setSchoolLanguage(event.target.value as UiLanguage)}>
          {props.languages.map((language) => <option key={language} value={language}>{props.languageNames[language]}</option>)}
        </select></label>
      </div>
      <label>{text.topicNotes}<textarea disabled={props.disabled} rows={2} maxLength={1000} value={topicNotes} onChange={(event) => setTopicNotes(event.target.value)} /></label>
      <label>{text.prerequisiteNotes}<textarea disabled={props.disabled} rows={2} maxLength={500} value={prerequisiteNotes} onChange={(event) => setPrerequisiteNotes(event.target.value)} /></label>
      {props.relatedOptions && <label>{text.relatedChoice}<select disabled={props.disabled} value={relatedLessonId ?? ''}
        onChange={(event) => setRelatedLessonId(event.target.value || null)}>
        <option value="">{text.noLink}</option>
        {props.relatedOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>}
      <div className="actions">
        <button className="primary" type="submit" disabled={props.disabled}>{props.submitLabel}</button>
        {props.onCancel && <button className="ghost" type="button" onClick={props.onCancel}>{text.cancel}</button>}
      </div>
    </form>
  );
}
