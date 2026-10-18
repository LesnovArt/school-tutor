import type { CreateProfileInput, Profile, UiLanguage, ApiResult } from '../contracts/profile';

declare global {
  interface Window {
    schoolTutor: {
      profiles: {
        list(): Promise<ApiResult<Profile[]>>;
        create(input: CreateProfileInput): Promise<ApiResult<Profile>>;
      };
      settings: {
        getLanguage(): Promise<ApiResult<UiLanguage>>;
        setLanguage(language: UiLanguage): Promise<ApiResult<UiLanguage>>;
        getActiveProfile(): Promise<ApiResult<string | null>>;
        setActiveProfile(profileId: string): Promise<ApiResult<string>>;
      };
      reportRendererStartupFailure(): void;
      reportRendererReady(): void;
    };
  }
}

export {};
