import { contextBridge, ipcRenderer } from 'electron';
import type { ApiResult } from '../contracts/api';
import type { CreateProfileInput, Profile, UiLanguage } from '../contracts/profile';

const api = {
  profiles: {
    list: (): Promise<ApiResult<Profile[]>> => ipcRenderer.invoke('profiles:list'),
    create: (input: CreateProfileInput): Promise<ApiResult<Profile>> => ipcRenderer.invoke('profiles:create', input),
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
