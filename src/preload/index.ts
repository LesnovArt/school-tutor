import { contextBridge, ipcRenderer } from 'electron';
import type { ApiResult } from '../contracts/api';
import type { ParentStatus, UnlockResult } from '../contracts/parent';
import type { CreateProfileInput, Profile, UiLanguage, UpdateExplanationLanguageInput } from '../contracts/profile';
import type {
  CreateEnrollmentInput, CreateLessonInput, MoveLessonInput, StudySpace, UpdateEnrollmentInput, UpdateLessonInput,
} from '../contracts/study';

const api = {
  profiles: {
    list: (): Promise<ApiResult<Profile[]>> => ipcRenderer.invoke('profiles:list'),
    create: (input: CreateProfileInput): Promise<ApiResult<Profile>> => ipcRenderer.invoke('profiles:create', input),
    setExplanationLanguage: (input: UpdateExplanationLanguageInput): Promise<ApiResult<Profile>> =>
      ipcRenderer.invoke('profiles:set-explanation-language', input),
  },
  parent: {
    getStatus: (): Promise<ApiResult<ParentStatus>> => ipcRenderer.invoke('parent:status'),
    setupPin: (pin: string): Promise<ApiResult<ParentStatus>> => ipcRenderer.invoke('parent:setup-pin', { pin }),
    unlock: (pin: string): Promise<ApiResult<UnlockResult>> => ipcRenderer.invoke('parent:unlock', { pin }),
    lock: (): Promise<ApiResult<ParentStatus>> => ipcRenderer.invoke('parent:lock'),
  },
  study: {
    getSpace: (): Promise<ApiResult<StudySpace | null>> => ipcRenderer.invoke('study:get-space'),
    selectEnrollment: (enrollmentId: string): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:select-enrollment', { enrollmentId }),
    getParentSpace: (profileId: string): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:get-parent-space', { profileId }),
    createEnrollment: (input: CreateEnrollmentInput): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:create-enrollment', input),
    updateEnrollment: (input: UpdateEnrollmentInput): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:update-enrollment', input),
    createLesson: (input: CreateLessonInput): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:create-lesson', input),
    updateLesson: (input: UpdateLessonInput): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:update-lesson', input),
    moveLesson: (input: MoveLessonInput): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:move-lesson', input),
    setCurrentLesson: (lessonId: string): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:set-current-lesson', { lessonId }),
    deleteLesson: (lessonId: string): Promise<ApiResult<StudySpace>> => ipcRenderer.invoke('study:delete-lesson', { lessonId }),
  },
  settings: {
    getLanguage: (): Promise<ApiResult<UiLanguage>> => ipcRenderer.invoke('settings:get-language'),
    setLanguage: (language: UiLanguage): Promise<ApiResult<UiLanguage>> => ipcRenderer.invoke('settings:set-language', language),
    getActiveProfile: (): Promise<ApiResult<string | null>> => ipcRenderer.invoke('settings:get-active-profile'),
    setActiveProfile: (profileId: string): Promise<ApiResult<string>> => ipcRenderer.invoke('settings:set-active-profile', profileId),
  },
  reportRendererStartupFailure: (): void => ipcRenderer.send('diagnostics:renderer-startup-failure'),
  reportRendererReady: (): void => ipcRenderer.send('diagnostics:renderer-ready'),
};

export type SchoolTutorApi = typeof api;

contextBridge.exposeInMainWorld('schoolTutor', api);
