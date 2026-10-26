import type { UiLanguage } from '../../contracts/profile';

export const supportedLanguages: UiLanguage[] = ['uk', 'bg', 'en'];

export const languageNames: Record<UiLanguage, string> = {
  uk: 'Українська',
  bg: 'Български',
  en: 'English',
};

const en = {
  title: 'Maths, together', subtitle: 'A local study helper for your family.',
  language: 'Interface language', profiles: 'Child profiles', empty: 'No profiles yet. Create a child profile.',
  name: 'Name or nickname', age: 'Age band', preferred: 'Explanation language', preferences: 'Learning preferences (optional)',
  create: 'Create profile', selected: 'Selected profile', createError: 'Could not save the profile. Check the details and try again.',
  selectionError: 'The profile was saved but could not be selected. Select it from the list.', actionError: 'Could not save this change.', startupError: 'Could not connect to the local part of the app.', saving: 'Saving…',
  loading: 'Loading…', ageOptions: ['Ages 6–8', 'Ages 9–11', 'Ages 12–14', 'Ages 15+'],
  startupTitle: 'School Tutor could not start', startupHint: 'Close and reopen the app. In development, check the School Tutor DevTools console.',
  footer: 'Study profiles stay on this device.',
  lockedError: 'Parent settings are locked. Enter the PIN to continue.', invalidError: 'Check the details and try again.',
  parentSettings: 'Parent settings', backToChildren: 'Back to children', lockParent: 'Lock',
  emptyChildren: 'No child profiles yet. A parent can add them in Parent settings.',
  pinSetupTitle: 'Set a parent PIN', pinSetupHint: 'Choose 4 to 8 digits. The PIN keeps parent controls away from children inside the app; it does not protect files on this computer, and it cannot be recovered if forgotten.',
  pinUnlockTitle: 'Enter the parent PIN', pinLabel: 'PIN', pinConfirm: 'Repeat the PIN', pinMismatch: 'The two PINs do not match.',
  pinSave: 'Save PIN', pinUnlock: 'Unlock', pinIncorrect: 'Incorrect PIN.', pinThrottled: 'Too many attempts. Try again in {seconds} seconds.',
  schoolSpace: 'School space', noSchools: 'A parent has not added a school yet.', noLessons: 'No lessons yet.',
  currentLesson: 'Current', relatedLesson: 'Related', explanationRole: 'Explanations', homeworkRole: 'Homework',
  schoolNames: { ua: 'Ukrainian school', bg: 'Bulgarian school' }, grade: 'Grade', year: 'Academic year',
  manageChild: 'Child', schools: 'Schools', addSchool: 'Add school', schoolSystem: 'School system', homeworkLanguage: 'Homework language',
  lessons: 'Maths lessons', school: 'School', addLesson: 'Add lesson', lessonTitle: 'Lesson title', lessonLanguage: 'Lesson language',
  topicNotes: 'Topic', prerequisiteNotes: 'Prerequisites (optional)', relatedChoice: 'Related lesson in the other school', noLink: 'No link',
  save: 'Save', edit: 'Edit', cancel: 'Cancel', remove: 'Delete', makeCurrent: 'Make current', moveUp: 'Move up', moveDown: 'Move down',
  confirmRemove: 'Delete this lesson?', needSchool: 'Add a school first.', needProfile: 'Create a child profile first.',
};

type Widen<T> = T extends string ? string : T extends readonly string[] ? string[] : { [K in keyof T]: Widen<T[K]> };
export type AppMessages = Widen<typeof en>;

export const messages: Record<UiLanguage, AppMessages> = {
  uk: {
    title: 'Математика разом', subtitle: 'Локальний помічник для навчання вашої родини.',
    language: 'Мова інтерфейсу', profiles: 'Профілі дітей', empty: 'Поки що профілів немає. Створіть профіль дитини.',
    name: 'Ім’я або псевдонім', age: 'Вікова група', preferred: 'Мова пояснень', preferences: 'Побажання до навчання (необов’язково)',
    create: 'Створити профіль', selected: 'Обраний профіль', createError: 'Не вдалося зберегти профіль. Перевірте введені дані.',
    selectionError: 'Профіль збережено, але не вдалося його вибрати. Виберіть його зі списку.', actionError: 'Не вдалося зберегти цю зміну.', startupError: 'Не вдалося підключитися до локальної частини програми.', saving: 'Збереження…',
    loading: 'Завантаження…', ageOptions: ['6–8 років', '9–11 років', '12–14 років', '15+ років'],
    startupTitle: 'Не вдалося запустити School Tutor', startupHint: 'Закрийте й знову відкрийте програму. У режимі розробки перевірте консоль DevTools.',
    footer: 'Профілі навчання зберігаються на цьому пристрої.',
    lockedError: 'Налаштування для батьків заблоковано. Введіть PIN-код, щоб продовжити.', invalidError: 'Перевірте введені дані та спробуйте ще раз.',
    parentSettings: 'Налаштування для батьків', backToChildren: 'До дітей', lockParent: 'Заблокувати',
    emptyChildren: 'Профілів дітей ще немає. Батьки можуть додати їх у налаштуваннях для батьків.',
    pinSetupTitle: 'Створіть PIN-код для батьків', pinSetupHint: 'Оберіть від 4 до 8 цифр. PIN-код не пускає дітей до батьківських налаштувань у програмі, але не захищає файли на цьому комп’ютері, і його не можна відновити, якщо забути.',
    pinUnlockTitle: 'Введіть PIN-код для батьків', pinLabel: 'PIN-код', pinConfirm: 'Повторіть PIN-код', pinMismatch: 'PIN-коди не збігаються.',
    pinSave: 'Зберегти PIN-код', pinUnlock: 'Розблокувати', pinIncorrect: 'Неправильний PIN-код.', pinThrottled: 'Забагато спроб. Спробуйте ще раз за {seconds} с.',
    schoolSpace: 'Шкільний простір', noSchools: 'Батьки ще не додали школу.', noLessons: 'Уроків поки немає.',
    currentLesson: 'Поточний', relatedLesson: 'Пов’язаний', explanationRole: 'Пояснення', homeworkRole: 'Домашнє завдання',
    schoolNames: { ua: 'Українська школа', bg: 'Болгарська школа' }, grade: 'Клас', year: 'Навчальний рік',
    manageChild: 'Дитина', schools: 'Школи', addSchool: 'Додати школу', schoolSystem: 'Шкільна система', homeworkLanguage: 'Мова домашніх завдань',
    lessons: 'Уроки математики', school: 'Школа', addLesson: 'Додати урок', lessonTitle: 'Назва уроку', lessonLanguage: 'Мова уроку',
    topicNotes: 'Тема', prerequisiteNotes: 'Що потрібно знати раніше (необов’язково)', relatedChoice: 'Пов’язаний урок в іншій школі', noLink: 'Без зв’язку',
    save: 'Зберегти', edit: 'Змінити', cancel: 'Скасувати', remove: 'Видалити', makeCurrent: 'Зробити поточним', moveUp: 'Вище', moveDown: 'Нижче',
    confirmRemove: 'Видалити цей урок?', needSchool: 'Спершу додайте школу.', needProfile: 'Спершу створіть профіль дитини.',
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
    lockedError: 'Родителските настройки са заключени. Въведете ПИН кода, за да продължите.', invalidError: 'Проверете въведените данни и опитайте отново.',
    parentSettings: 'Настройки за родители', backToChildren: 'Към децата', lockParent: 'Заключи',
    emptyChildren: 'Все още няма детски профили. Родителите могат да ги добавят в настройките за родители.',
    pinSetupTitle: 'Задайте ПИН код за родители', pinSetupHint: 'Изберете от 4 до 8 цифри. ПИН кодът пази родителските настройки от децата в приложението, но не защитава файловете на този компютър и не може да се възстанови, ако бъде забравен.',
    pinUnlockTitle: 'Въведете ПИН кода за родители', pinLabel: 'ПИН код', pinConfirm: 'Повторете ПИН кода', pinMismatch: 'ПИН кодовете не съвпадат.',
    pinSave: 'Запази ПИН кода', pinUnlock: 'Отключи', pinIncorrect: 'Неправилен ПИН код.', pinThrottled: 'Твърде много опити. Опитайте отново след {seconds} с.',
    schoolSpace: 'Училищно пространство', noSchools: 'Родителите още не са добавили училище.', noLessons: 'Все още няма уроци.',
    currentLesson: 'Текущ', relatedLesson: 'Свързан', explanationRole: 'Обяснения', homeworkRole: 'Домашна работа',
    schoolNames: { ua: 'Украинско училище', bg: 'Българско училище' }, grade: 'Клас', year: 'Учебна година',
    manageChild: 'Дете', schools: 'Училища', addSchool: 'Добави училище', schoolSystem: 'Училищна система', homeworkLanguage: 'Език на домашните',
    lessons: 'Уроци по математика', school: 'Училище', addLesson: 'Добави урок', lessonTitle: 'Заглавие на урока', lessonLanguage: 'Език на урока',
    topicNotes: 'Тема', prerequisiteNotes: 'Необходими предварителни знания (по избор)', relatedChoice: 'Свързан урок в другото училище', noLink: 'Без връзка',
    save: 'Запази', edit: 'Промени', cancel: 'Отказ', remove: 'Изтрий', makeCurrent: 'Направи текущ', moveUp: 'Нагоре', moveDown: 'Надолу',
    confirmRemove: 'Да се изтрие ли този урок?', needSchool: 'Първо добавете училище.', needProfile: 'Първо създайте детски профил.',
  },
  en,
};
