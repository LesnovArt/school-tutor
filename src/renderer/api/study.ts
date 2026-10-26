export type StudyApi = Window['schoolTutor']['study'];

export const studyApi: StudyApi = {
  getSpace: () => window.schoolTutor.study.getSpace(),
  selectEnrollment: (enrollmentId) => window.schoolTutor.study.selectEnrollment(enrollmentId),
  getParentSpace: (profileId) => window.schoolTutor.study.getParentSpace(profileId),
  createEnrollment: (input) => window.schoolTutor.study.createEnrollment(input),
  updateEnrollment: (input) => window.schoolTutor.study.updateEnrollment(input),
  createLesson: (input) => window.schoolTutor.study.createLesson(input),
  updateLesson: (input) => window.schoolTutor.study.updateLesson(input),
  moveLesson: (input) => window.schoolTutor.study.moveLesson(input),
  setCurrentLesson: (lessonId) => window.schoolTutor.study.setCurrentLesson(lessonId),
  deleteLesson: (lessonId) => window.schoolTutor.study.deleteLesson(lessonId),
};
