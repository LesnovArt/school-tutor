export type SettingsApi = Window['schoolTutor']['settings'];

export const settingsApi: SettingsApi = {
  getLanguage: () => window.schoolTutor.settings.getLanguage(),
  setLanguage: (language) => window.schoolTutor.settings.setLanguage(language),
  getActiveProfile: () => window.schoolTutor.settings.getActiveProfile(),
  setActiveProfile: (profileId) => window.schoolTutor.settings.setActiveProfile(profileId),
};
