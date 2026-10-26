import type { ParentStatus } from '../../contracts/parent';
import type { Profile, UiLanguage } from '../../contracts/profile';
import type { AppMessages } from '../localization/messages';
import type { ParentConsoleState } from '../hooks/useParentConsole';
import type { PinNotice } from '../hooks/useParentAccess';
import { AppHeader } from '../components/AppHeader';
import { ParentConsole, type ProfileFormState } from '../components/ParentConsole';
import { PinGate } from '../components/PinGate';

type Props = {
  text: AppMessages;
  status: ParentStatus | null;
  notice: PinNotice;
  accessPending: boolean;
  profiles: Profile[];
  canCreateProfile: boolean;
  profileMutationPending: boolean;
  form: ProfileFormState;
  state: ParentConsoleState;
  language: UiLanguage;
  languages: UiLanguage[];
  languageNames: Record<UiLanguage, string>;
  error: string;
  onLanguageChange: (language: UiLanguage) => void;
  onSetupPin: (pin: string) => Promise<void>;
  onUnlock: (pin: string) => Promise<void>;
  onLock: () => void;
  onExplanationLanguage: (profileId: string, language: UiLanguage) => void;
  onClose: () => void;
};

export function ParentPage(props: Props): React.JSX.Element {
  const { text, status } = props;
  return (
    <main className="page">
      <AppHeader
        title={text.parentSettings}
        subtitle={text.subtitle}
        languageLabel={text.language}
        language={props.language}
        languages={props.languages}
        languageNames={props.languageNames}
        onLanguageChange={props.onLanguageChange}
      >
        <button type="button" className="ghost" onClick={props.onClose}>{text.backToChildren}</button>
        {status?.unlocked && <button type="button" className="ghost" disabled={props.accessPending} onClick={props.onLock}>{text.lockParent}</button>}
      </AppHeader>
      {!status && <p className="muted">{text.loading}</p>}
      {status && !status.pinSet && <PinGate text={text} mode="setup" pending={props.accessPending} notice={null} onSubmit={props.onSetupPin} />}
      {status?.pinSet && !status.unlocked && <PinGate text={text} mode="unlock" pending={props.accessPending} notice={props.notice} onSubmit={props.onUnlock} />}
      {status?.unlocked && <ParentConsole
        text={text}
        profiles={props.profiles}
        canCreateProfile={props.canCreateProfile}
        profileMutationPending={props.profileMutationPending}
        form={props.form}
        state={props.state}
        languages={props.languages}
        languageNames={props.languageNames}
        onExplanationLanguage={props.onExplanationLanguage}
      />}
      {props.error && <p role="alert" className="error">{props.error}</p>}
      <footer>{text.footer}</footer>
    </main>
  );
}
