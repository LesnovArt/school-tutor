import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Profile, UiLanguage } from '../contracts/profile';
import {
  isSchoolTutorBridgeAvailable,
  reportRendererReady,
  reportRendererStartupFailure,
} from './startup-diagnostics';
import './style.css';

const startupDiagnosticsUntil = Date.now() + 15_000;
window.addEventListener('error', () => {
  if (Date.now() < startupDiagnosticsUntil) reportRendererStartupFailure();
});
window.addEventListener('unhandledrejection', () => {
  if (Date.now() < startupDiagnosticsUntil) reportRendererStartupFailure();
});

const messages = {
  uk: {
    title: 'Математика разом', subtitle: 'Локальний помічник для навчання вашої родини.',
    language: 'Мова інтерфейсу', profiles: 'Профілі дітей', empty: 'Поки що профілів немає. Створіть профіль дитини.',
    name: 'Ім’я або псевдонім', age: 'Вікова група', preferred: 'Мова пояснень', preferences: 'Побажання до навчання (необов’язково)',
    create: 'Створити профіль', selected: 'Обраний профіль', createError: 'Не вдалося зберегти профіль. Перевірте введені дані.',
    selectionError: 'Профіль збережено, але не вдалося його вибрати. Виберіть його зі списку.', actionError: 'Не вдалося зберегти цю зміну.', startupError: 'Не вдалося підключитися до локальної частини програми.', saving: 'Збереження…',
    loading: 'Завантаження…', ageOptions: ['6–8 років', '9–11 років', '12–14 років', '15+ років'],
  },
  bg: {
    title: 'Да учим математика заедно', subtitle: 'Локален помощник за обучението на вашето семейство.',
    language: 'Език на интерфейса', profiles: 'Детски профили', empty: 'Все още няма профили. Създайте детски профил.',
    name: 'Име или псевдоним', age: 'Възрастова група', preferred: 'Език на обясненията', preferences: 'Предпочитания за учене (по избор)',
    create: 'Създай профил', selected: 'Избран профил', createError: 'Профилът не беше запазен. Проверете въведените данни.',
    selectionError: 'Профилът е запазен, но не можа да бъде избран. Изберете го от списъка.', actionError: 'Промяната не беше запазена.', startupError: 'Връзката с локалната част на приложението не бе установена.', saving: 'Запазване…',
    loading: 'Зареждане…', ageOptions: ['6–8 години', '9–11 години', '12–14 години', '15+ години'],
  },
  en: {
    title: 'Maths, together', subtitle: 'A local study helper for your family.',
    language: 'Interface language', profiles: 'Child profiles', empty: 'No profiles yet. Create a child profile.',
    name: 'Name or nickname', age: 'Age band', preferred: 'Explanation language', preferences: 'Learning preferences (optional)',
    create: 'Create profile', selected: 'Selected profile', createError: 'Could not save the profile. Check the details and try again.',
    selectionError: 'The profile was saved but could not be selected. Select it from the list.', actionError: 'Could not save this change.', startupError: 'Could not connect to the local part of the app.', saving: 'Saving…',
    loading: 'Loading…', ageOptions: ['Ages 6–8', 'Ages 9–11', 'Ages 12–14', 'Ages 15+'],
  },
} as const;

const languageNames: Record<UiLanguage, string> = { uk: 'Українська', bg: 'Български', en: 'English' };
const ageValues = ['6-8', '9-11', '12-14', '15+'] as const;

function App(): React.JSX.Element {
  const [language, setLanguage] = useState<UiLanguage>('uk');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [ageBand, setAgeBand] = useState<(typeof ageValues)[number]>('6-8');
  const [preferredLanguage, setPreferredLanguage] = useState<UiLanguage>('uk');
  const [preferences, setPreferences] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = messages[language];

  useEffect(() => {
    let cancelled = false;
    if (!isSchoolTutorBridgeAvailable()) {
      reportRendererStartupFailure();
      setError(messages.uk.startupError);
      setReady(true);
      return () => { cancelled = true; };
    }
    void Promise.all([window.schoolTutor.profiles.list(), window.schoolTutor.settings.getLanguage(), window.schoolTutor.settings.getActiveProfile()]).then(([profileResult, languageResult, activeResult]) => {
      if (cancelled) return;
      if (!profileResult.ok || !languageResult.ok || !activeResult.ok) {
        reportRendererStartupFailure();
        setError(messages.uk.startupError);
        setReady(true);
        return;
      }
      setProfiles(profileResult.value);
      const active = activeResult.value;
      setSelectedId(profileResult.value.some((profile) => profile.id === active) ? active! : profileResult.value[0]?.id ?? '');
      setLanguage(languageResult.value);
      setInitialized(true);
      setReady(true);
  }).catch(() => {
    if (cancelled) return;
    reportRendererStartupFailure();
    setError(messages.uk.startupError);
    setReady(true);
  });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ready && initialized) reportRendererReady();
  }, [ready, initialized]);

  async function changeLanguage(next: UiLanguage): Promise<void> {
    try {
      const result = await window.schoolTutor.settings.setLanguage(next);
      if (result.ok) { setLanguage(result.value); setError(''); }
      else setError(t.actionError);
    } catch {
      setError(t.actionError);
    }
  }

  async function selectProfile(profileId: string): Promise<void> {
    try {
      const result = await window.schoolTutor.settings.setActiveProfile(profileId);
      if (result.ok) { setSelectedId(result.value); setError(''); }
      else setError(t.selectionError);
    } catch {
      setError(t.selectionError);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving) return;
    setError('');
    setSaving(true);
    let profileCreated = false;
    try {
      const result = await window.schoolTutor.profiles.create({
        displayName: name,
        ageBand,
        preferredLanguage,
        learningPreferences: preferences,
      });
      if (!result.ok) {
        setError(t.createError);
        return;
      }
      profileCreated = true;
      setProfiles((current) => [...current, result.value]);
      setName('');
      setPreferences('');
      const selectedResult = await window.schoolTutor.settings.setActiveProfile(result.value.id);
      if (!selectedResult.ok) {
        setError(t.selectionError);
        return;
      }
      setSelectedId(selectedResult.value);
    } catch {
      setError(profileCreated ? t.selectionError : t.createError);
    } finally {
      setSaving(false);
    }
  }

  const selected = profiles.find((profile) => profile.id === selectedId);
  if (!ready) return <main className="page"><p>{t.loading}</p></main>;
  if (!initialized) return <main className="page"><section className="card" role="alert"><h1>School Tutor could not start</h1><p>{error}</p><p>Close and reopen the app. In development, check the School Tutor DevTools console.</p></section></main>;

  return (
    <main className="page">
      <header className="topbar">
        <div><p className="eyebrow">SCHOOL TUTOR</p><h1>{t.title}</h1><p className="subtitle">{t.subtitle}</p></div>
        <label className="language-control">{t.language}
          <select value={language} onChange={(event) => void changeLanguage(event.target.value as UiLanguage)}>
            {(['uk', 'bg', 'en'] as const).map((code) => <option key={code} value={code}>{languageNames[code]}</option>)}
          </select>
        </label>
      </header>
      <section className="card">
        <div className="section-heading"><span className="step">01</span><div><h2>{t.profiles}</h2><p>{profiles.length ? `${profiles.length} / 2` : t.empty}</p></div></div>
        {profiles.length > 0 && <div className="profile-list" role="list">
          {profiles.map((profile) => <button key={profile.id} className={`profile-option ${selectedId === profile.id ? 'active' : ''}`} onClick={() => void selectProfile(profile.id)}>
            <span className="avatar" aria-hidden="true">{profile.displayName.slice(0, 1).toLocaleUpperCase()}</span>
            <span className="profile-copy"><strong>{profile.displayName}</strong><small>{languageNames[profile.preferredLanguage]} · {profile.ageBand}</small></span>
            {selectedId === profile.id && <span className="check" aria-label="Selected">✓</span>}
          </button>)}
        </div>}
        {selected && <div className="selected-note"><span className="dot" /> {t.selected}: <strong>{selected.displayName}</strong></div>}
      </section>
      {profiles.length < 2 && <section className="card form-card">
        <div className="section-heading"><span className="step">02</span><div><h2>{t.create}</h2></div></div>
        <form onSubmit={(event) => void submit(event)}>
          <label>{t.name}<input autoComplete="off" maxLength={40} required value={name} onChange={(event) => setName(event.target.value)} /></label>
          <div className="two-col">
            <label>{t.age}<select value={ageBand} onChange={(event) => setAgeBand(event.target.value as (typeof ageValues)[number])}>
              {ageValues.map((value, i) => <option value={value} key={value}>{t.ageOptions[i]}</option>)}
            </select></label>
            <label>{t.preferred}<select value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as UiLanguage)}>
              {(['uk', 'bg', 'en'] as const).map((code) => <option value={code} key={code}>{languageNames[code]}</option>)}
            </select></label>
          </div>
          <label>{t.preferences}<textarea maxLength={240} rows={2} value={preferences} onChange={(event) => setPreferences(event.target.value)} /></label>
          <button className="primary" type="submit" disabled={saving}>{saving ? t.saving : t.create}<span aria-hidden="true">→</span></button>
        </form>
      </section>}
      {error && <p role="alert" className="error">{error}</p>}
      <footer>Study profiles stay on this device.</footer>
    </main>
  );
}

class StartupErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(): void {
    reportRendererStartupFailure();
  }

  render(): React.ReactNode {
    if (this.state.failed) return <main className="page"><section className="card" role="alert"><h1>School Tutor could not start</h1><p>Close and reopen the app. In development, check the School Tutor DevTools console.</p></section></main>;
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Renderer root element is missing');
createRoot(root).render(<React.StrictMode><StartupErrorBoundary><App /></StartupErrorBoundary></React.StrictMode>);
