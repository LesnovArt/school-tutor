import type { Profile, UiLanguage } from '../../contracts/profile';
import type { StudySpace } from '../../contracts/study';
import type { AppMessages } from '../localization/messages';
import { schoolLabel } from './school-label';

type Props = {
  text: AppMessages;
  profile: Profile;
  space: StudySpace | null;
  languageNames: Record<UiLanguage, string>;
  onSelectEnrollment: (enrollmentId: string) => void;
};

export function StudySpaceView({ text, profile, space, languageNames, onSelectEnrollment }: Props): React.JSX.Element {
  const selected = space?.enrollments.find((enrollment) => enrollment.id === space.selectedEnrollmentId);
  const lessons = space?.lessons.filter((lesson) => lesson.enrollmentId === selected?.id) ?? [];
  return (
    <section className="card">
      <div className="section-heading">
        <span className="step">02</span>
        <div>
          <h2>{text.schoolSpace}</h2>
          {selected && <p>{text.explanationRole}: {languageNames[profile.preferredLanguage]} · {text.homeworkRole}: {languageNames[selected.homeworkLanguage]}</p>}
        </div>
      </div>
      {space && space.enrollments.length === 0 && <p className="muted">{text.noSchools}</p>}
      {space && space.enrollments.length > 0 && <div className="tabs" role="group" aria-label={text.schoolSpace}>
        {space.enrollments.map((enrollment) => (
          <button key={enrollment.id} type="button" className={`tab ${enrollment.id === selected?.id ? 'active' : ''}`}
            aria-pressed={enrollment.id === selected?.id} onClick={() => onSelectEnrollment(enrollment.id)}>
            {schoolLabel(text, enrollment)}
          </button>
        ))}
      </div>}
      {selected && lessons.length === 0 && <p className="muted">{text.noLessons}</p>}
      {lessons.length > 0 && <ol className="lesson-list">
        {lessons.map((lesson) => (
          <li key={lesson.id} className={lesson.isCurrent ? 'lesson current' : 'lesson'}>
            <div className="lesson-title"><strong>{lesson.title}</strong>{lesson.isCurrent && <span className="badge">{text.currentLesson}</span>}</div>
            {lesson.topicNotes && <p>{lesson.topicNotes}</p>}
            {lesson.relatedLesson && <small>{text.relatedLesson}: {text.schoolNames[lesson.relatedLesson.schoolSystem]} · {lesson.relatedLesson.title}</small>}
          </li>
        ))}
      </ol>}
    </section>
  );
}
