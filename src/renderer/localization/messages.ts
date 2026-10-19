import type { UiLanguage } from '../../contracts/profile';

export const supportedLanguages: UiLanguage[] = ['uk', 'bg', 'en'];

export const languageNames: Record<UiLanguage, string> = {
  uk: 'Українська',
  bg: 'Български',
  en: 'English',
};

export const messages = {
  uk: {
    title: 'Математика разом', subtitle: 'Локальний помічник для навчання вашої родини.',
    language: 'Мова інтерфейсу', profiles: 'Профілі дітей', empty: 'Поки що профілів немає. Створіть профіль дитини.',
    name: 'Ім’я або псевдонім', age: 'Вікова група', preferred: 'Мова пояснень', preferences: 'Побажання до навчання (необов’язково)',
    create: 'Створити профіль', selected: 'Обраний профіль', createError: 'Не вдалося зберегти профіль. Перевірте введені дані.',
    selectionError: 'Профіль збережено, але не вдалося його вибрати. Виберіть його зі списку.', actionError: 'Не вдалося зберегти цю зміну.', startupError: 'Не вдалося підключитися до локальної частини програми.', saving: 'Збереження…',
    loading: 'Завантаження…', ageOptions: ['6–8 років', '9–11 років', '12–14 років', '15+ років'],
    startupTitle: 'Не вдалося запустити School Tutor', startupHint: 'Закрийте й знову відкрийте програму. У режимі розробки перевірте консоль DevTools.',
    footer: 'Профілі навчання зберігаються на цьому пристрої.',
  },
  bg: {
    title: 'Да учим математика заедно', subtitle: 'Локален помощник за обучението на вашето семейство.',
    language: 'Език на интерфейса', profiles: 'Детски профили', empty: 'Все още няма профили. Създайте детски профил.',
    name: 'Име или псевдоним', age: 'Възрастова група', preferred: 'Език на обясненията', preferences: 'Предпочитания за учене (по избор)',
    create: 'Създай профил', selected: 'Избран профил', createError: 'Профилът не беше запазен. Проверете въведените данни.',
    selectionError: 'Профилът е запазен, но не можа да бъде избран. Изберете го от списъка.', actionError: 'Промяната не беше запазена.', startupError: 'Връзката с локалната част на приложението не бе установена.', saving: 'Запазване…',
    loading: 'Зареждане…', ageOptions: ['6–8 години', '9–11 години', '12–14 години', '15+ години'],
    startupTitle: 'School Tutor не можа да стартира', startupHint: 'Затворете и отворете отново приложението. В режим на разработка проверете конзолата на DevTools.',
    footer: 'Учебните профили се съхраняват на това устройство.',
  },
  en: {
    title: 'Maths, together', subtitle: 'A local study helper for your family.',
    language: 'Interface language', profiles: 'Child profiles', empty: 'No profiles yet. Create a child profile.',
    name: 'Name or nickname', age: 'Age band', preferred: 'Explanation language', preferences: 'Learning preferences (optional)',
    create: 'Create profile', selected: 'Selected profile', createError: 'Could not save the profile. Check the details and try again.',
    selectionError: 'The profile was saved but could not be selected. Select it from the list.', actionError: 'Could not save this change.', startupError: 'Could not connect to the local part of the app.', saving: 'Saving…',
    loading: 'Loading…', ageOptions: ['Ages 6–8', 'Ages 9–11', 'Ages 12–14', 'Ages 15+'],
    startupTitle: 'School Tutor could not start', startupHint: 'Close and reopen the app. In development, check the School Tutor DevTools console.',
    footer: 'Study profiles stay on this device.',
  },
} satisfies Record<UiLanguage, {
  title: string; subtitle: string; language: string; profiles: string; empty: string;
  name: string; age: string; preferred: string; preferences: string; create: string;
  selected: string; createError: string; selectionError: string; actionError: string;
  startupError: string; saving: string; loading: string; ageOptions: string[];
  startupTitle: string; startupHint: string; footer: string;
}>;

export type AppMessages = (typeof messages)[UiLanguage];
