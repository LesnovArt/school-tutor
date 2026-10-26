import type { Enrollment } from '../../contracts/study';
import type { AppMessages } from '../localization/messages';

export function schoolLabel(text: AppMessages, enrollment: Pick<Enrollment, 'schoolSystem' | 'grade' | 'academicYear'>): string {
  return `${text.schoolNames[enrollment.schoolSystem]} · ${text.grade} ${enrollment.grade} · ${enrollment.academicYear}`;
}
