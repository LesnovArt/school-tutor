import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ApiResult } from '../../contracts/api';
import type { Profile } from '../../contracts/profile';
import type { StudySpace } from '../../contracts/study';
import { studyApi } from '../api/study';
import type { AppErrorKey } from './useAppStartup';

/** Parent-managed school spaces for one chosen child. Every call is authorized again by the main process. */
export function useParentConsole(options: {
  profiles: Profile[];
  active: boolean;
  onLocked: () => void;
  setErrorKey: Dispatch<SetStateAction<AppErrorKey | null>>;
}) {
  const { profiles, active, onLocked, setErrorKey } = options;
  const [chosenProfileId, setChosenProfileId] = useState('');
  const [chosenSchoolId, setChosenSchoolId] = useState('');
  const [loaded, setLoaded] = useState<StudySpace | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const profileId = profiles.some((profile) => profile.id === chosenProfileId) ? chosenProfileId : (profiles[0]?.id ?? '');
  const space = loaded && loaded.profileId === profileId ? loaded : null;
  const schoolId = space?.enrollments.some((enrollment) => enrollment.id === chosenSchoolId)
    ? chosenSchoolId
    : (space?.selectedEnrollmentId ?? '');

  function reportFailure(result: Extract<ApiResult<unknown>, { ok: false }>): void {
    if (result.error.code === 'UnauthorizedAction') {
      onLocked();
      setErrorKey('lockedError');
    } else {
      setErrorKey(result.error.code === 'InvalidInput' ? 'invalidError' : 'actionError');
    }
  }

  useEffect(() => {
    if (!active || !profileId) return;
    let cancelled = false;
    studyApi.getParentSpace(profileId).then((result) => {
      if (cancelled) return;
      if (result.ok) setLoaded(result.value);
      else reportFailure(result);
    }).catch(() => {
      if (!cancelled) setErrorKey('actionError');
    });
    return () => { cancelled = true; };
  }, [active, profileId]);

  async function run(call: () => Promise<ApiResult<StudySpace>>): Promise<boolean> {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setErrorKey(null);
    try {
      const result = await call();
      if (result.ok) {
        setLoaded(result.value);
        return true;
      }
      reportFailure(result);
      return false;
    } catch {
      setErrorKey('actionError');
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return {
    profileId, schoolId, space, pending,
    chooseProfile: setChosenProfileId,
    chooseSchool: setChosenSchoolId,
    createEnrollment: (input: Parameters<typeof studyApi.createEnrollment>[0]) => run(() => studyApi.createEnrollment(input)),
    updateEnrollment: (input: Parameters<typeof studyApi.updateEnrollment>[0]) => run(() => studyApi.updateEnrollment(input)),
    createLesson: (input: Parameters<typeof studyApi.createLesson>[0]) => run(() => studyApi.createLesson(input)),
    updateLesson: (input: Parameters<typeof studyApi.updateLesson>[0]) => run(() => studyApi.updateLesson(input)),
    moveLesson: (input: Parameters<typeof studyApi.moveLesson>[0]) => run(() => studyApi.moveLesson(input)),
    setCurrentLesson: (lessonId: string) => run(() => studyApi.setCurrentLesson(lessonId)),
    deleteLesson: (lessonId: string) => run(() => studyApi.deleteLesson(lessonId)),
  };
}

export type ParentConsoleState = ReturnType<typeof useParentConsole>;
