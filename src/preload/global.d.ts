import type { SchoolTutorApi } from './index';

declare global {
  interface Window {
    schoolTutor: SchoolTutorApi;
  }
}

export {};
