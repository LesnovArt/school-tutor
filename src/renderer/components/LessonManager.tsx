import { useState } from 'react';
import type { UiLanguage } from '../../contracts/profile';
import type { ParentConsoleState } from '../hooks/useParentConsole';
import type { AppMessages } from '../localization/messages';
import { LessonEditor } from './LessonEditor';
import { schoolLabel } from './school-label';

type Props = {
  text: AppMessages;
  state: ParentConsoleState;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
};

export function LessonManager({ text, state, languages, languageNames }: Props): React.JSX.Element {
  const [editingId, setEditingId] = useState('');
  const space = state.space;
  const school = space?.enrollments.find((enrollment) => enrollment.id === state.schoolId);
  if (!space || !school) {
    return <section className="card"><div className="section-heading"><div><h2>{text.lessons}</h2></div></div><p className="muted">{text.needSchool}</p></section>;
  }
  const lessons = space.lessons.filter((lesson) => lesson.enrollmentId === school.id);
  // Links connect the other school system only; other years of the same system are not valid targets.
  const relatedOptions = space.lessons.flatMap((lesson) => {
    const owner = space.enrollments.find((enrollment) => enrollment.id === lesson.enrollmentId);
    if (!owner || owner.schoolSystem === school.schoolSystem) return [];
    return [{ id: lesson.id, label: `${text.schoolNames[owner.schoolSystem]} · ${text.grade} ${owner.grade} · ${lesson.title}` }];
  });

  return (
    <section className="card">
      <div className="section-heading"><div><h2>{text.lessons}</h2></div></div>
      <label className="field">{text.school}
        <select value={school.id} disabled={state.pending} onChange={(event) => { setEditingId(''); state.chooseSchool(event.target.value); }}>
          {space.enrollments.map((enrollment) => <option key={enrollment.id} value={enrollment.id}>{schoolLabel(text, enrollment)}</option>)}
        </select>
      </label>
      {lessons.length === 0 && <p className="muted">{text.noLessons}</p>}
      <ol className="manage-list">
        {lessons.map((lesson, index) => (
          <li key={lesson.id} className={lesson.isCurrent ? 'current' : ''}>
            {editingId === lesson.id
              ? <LessonEditor text={text} initial={{ ...lesson, relatedLessonId: lesson.relatedLesson?.id ?? null }} relatedOptions={relatedOptions}
                submitLabel={text.save} disabled={state.pending} languages={languages} languageNames={languageNames}
                onCancel={() => setEditingId('')} onSubmit={(values) => state.updateLesson({ lessonId: lesson.id, ...values })} />
              : <div className="row">
                <span><strong>{lesson.title}</strong>{lesson.isCurrent && <span className="badge">{text.currentLesson}</span>}
                  {lesson.relatedLesson && <small> {text.relatedLesson}: {text.schoolNames[lesson.relatedLesson.schoolSystem]} · {lesson.relatedLesson.title}</small>}</span>
                <span className="row-actions">
                  <button type="button" className="ghost" disabled={state.pending || index === 0} aria-label={text.moveUp}
                    onClick={() => void state.moveLesson({ lessonId: lesson.id, direction: 'up' })}>↑</button>
                  <button type="button" className="ghost" disabled={state.pending || index === lessons.length - 1} aria-label={text.moveDown}
                    onClick={() => void state.moveLesson({ lessonId: lesson.id, direction: 'down' })}>↓</button>
                  <button type="button" className="ghost" disabled={state.pending || lesson.isCurrent}
                    onClick={() => void state.setCurrentLesson(lesson.id)}>{text.makeCurrent}</button>
                  <button type="button" className="ghost" disabled={state.pending} onClick={() => setEditingId(lesson.id)}>{text.edit}</button>
                  <button type="button" className="ghost danger" disabled={state.pending}
                    onClick={() => { if (window.confirm(text.confirmRemove)) void state.deleteLesson(lesson.id); }}>{text.remove}</button>
                </span>
              </div>}
          </li>
        ))}
      </ol>
      <h3>{text.addLesson}</h3>
      <LessonEditor key={`${school.id}-${lessons.length}`} text={text} relatedOptions={null} submitLabel={text.addLesson} disabled={state.pending}
        languages={languages} languageNames={languageNames}
        initial={{ title: '', schoolLanguage: school.homeworkLanguage, topicNotes: '', prerequisiteNotes: '', relatedLessonId: null }}
        onSubmit={(values) => state.createLesson({ enrollmentId: school.id, title: values.title, schoolLanguage: values.schoolLanguage, topicNotes: values.topicNotes, prerequisiteNotes: values.prerequisiteNotes })} />
    </section>
  );
}
