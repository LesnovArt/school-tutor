import { useState } from 'react';
import type { UiLanguage } from '../../contracts/profile';
import type { ParentConsoleState } from '../hooks/useParentConsole';
import type { AppMessages } from '../localization/messages';
import { defaultAcademicYear, EnrollmentForm } from './EnrollmentForm';
import { schoolLabel } from './school-label';

type Props = {
  text: AppMessages;
  state: ParentConsoleState;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
};

export function EnrollmentManager({ text, state, languages, languageNames }: Props): React.JSX.Element {
  const [editingId, setEditingId] = useState('');
  const enrollments = state.space?.enrollments ?? [];
  return (
    <section className="card">
      <div className="section-heading"><div><h2>{text.schools}</h2></div></div>
      <ul className="manage-list">
        {enrollments.map((enrollment) => (
          <li key={enrollment.id}>
            {editingId === enrollment.id
              ? <EnrollmentForm text={text} initial={enrollment} lockSchoolSystem submitLabel={text.save} disabled={state.pending}
                languages={languages} languageNames={languageNames} onCancel={() => setEditingId('')}
                onSubmit={(values) => state.updateEnrollment({ enrollmentId: enrollment.id, ...values })} />
              : <div className="row">
                <span>{schoolLabel(text, enrollment)} · {languageNames[enrollment.homeworkLanguage]}</span>
                <button type="button" className="ghost" disabled={state.pending} onClick={() => setEditingId(enrollment.id)}>{text.edit}</button>
              </div>}
          </li>
        ))}
      </ul>
      <h3>{text.addSchool}</h3>
      <EnrollmentForm text={text} lockSchoolSystem={false} submitLabel={text.addSchool} disabled={state.pending || !state.space}
        languages={languages} languageNames={languageNames}
        initial={{ schoolSystem: 'ua', academicYear: defaultAcademicYear(), grade: 1, homeworkLanguage: 'uk' }}
        onSubmit={(values) => state.createEnrollment({ profileId: state.profileId, ...values })} />
    </section>
  );
}
