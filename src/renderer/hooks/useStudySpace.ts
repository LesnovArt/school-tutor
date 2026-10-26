import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { StudySpace } from '../../contracts/study';
import { studyApi } from '../api/study';
import type { AppErrorKey } from './useAppStartup';

/** A space loaded for a previously selected child must never render for the current one. */
export function visibleSpace(space: StudySpace | null, selectedId: string): StudySpace | null {
  return space && space.profileId === selectedId ? space : null;
}

/** The active child's own school spaces. Main resolves the child; the renderer never sends a profile ID. */
export function useStudySpace(options: {
  ready: boolean;
  selectedId: string;
  active: boolean;
  setErrorKey: Dispatch<SetStateAction<AppErrorKey | null>>;
}) {
  const { ready, selectedId, active, setErrorKey } = options;
  const [space, setSpace] = useState<StudySpace | null>(null);
  const selecting = useRef(false);

  useEffect(() => {
    if (!ready || !selectedId || !active) return;
    let cancelled = false;
    studyApi.getSpace().then((result) => {
      if (cancelled) return;
      if (result.ok) setSpace(result.value);
      else setErrorKey('actionError');
    }).catch(() => {
      if (!cancelled) setErrorKey('actionError');
    });
    return () => { cancelled = true; };
  }, [ready, selectedId, active]);

  async function selectEnrollment(enrollmentId: string): Promise<void> {
    if (selecting.current) return;
    selecting.current = true;
    try {
      const result = await studyApi.selectEnrollment(enrollmentId);
      if (result.ok) {
        setSpace(result.value);
        setErrorKey(null);
      } else {
        setErrorKey('selectionError');
      }
    } catch {
      setErrorKey('selectionError');
    } finally {
      selecting.current = false;
    }
  }

  return { space: visibleSpace(space, selectedId), selectEnrollment };
}
