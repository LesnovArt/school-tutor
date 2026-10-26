import type { UiLanguage } from '../../contracts/profile';
import { languageNames, messages, supportedLanguages } from '../localization/messages';

export function useLocalization(language: UiLanguage) {
  return {
    text: messages[language],
    languageNames,
    supportedLanguages,
  };
}
