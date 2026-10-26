import { contextBridge, ipcRenderer } from 'electron';
import type { ApiResult } from '../contracts/api';
import type { ParentStatus, UnlockResult } from '../contracts/parent';
import type { CreateProfileInput, Profile, UiLanguage, UpdateExplanationLanguageInput } from '../contracts/profile';

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
