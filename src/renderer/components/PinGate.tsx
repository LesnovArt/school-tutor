import { useState, type SubmitEvent } from 'react';
import type { PinNotice } from '../hooks/useParentAccess';
import type { AppMessages } from '../localization/messages';

type Props = {
  text: AppMessages;
  mode: 'setup' | 'unlock';
  pending: boolean;
  notice: PinNotice;
  onSubmit: (pin: string) => Promise<void>;
};

export function PinGate({ text, mode, pending, notice, onSubmit }: Props): React.JSX.Element {
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mismatch = mode === 'setup' && confirmation !== '' && confirmation !== pin;

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending || mismatch) return;
    await onSubmit(pin);
    setPin('');
    setConfirmation('');
  }

  const message = notice?.kind === 'throttled'
    ? text.pinThrottled.replace('{seconds}', String(notice.seconds))
    : notice?.kind === 'incorrect' ? text.pinIncorrect : mismatch ? text.pinMismatch : '';

  return (
    <section className="card form-card">
      <div className="section-heading"><div>
        <h2>{mode === 'setup' ? text.pinSetupTitle : text.pinUnlockTitle}</h2>
        {mode === 'setup' && <p>{text.pinSetupHint}</p>}
      </div></div>
      <form onSubmit={(event) => void submit(event)}>
        <label>{text.pinLabel}
          <input type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,8}" minLength={4} maxLength={8} required
            disabled={pending} value={pin} onChange={(event) => setPin(event.target.value)} />
        </label>
        {mode === 'setup' && <label>{text.pinConfirm}
          <input type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,8}" minLength={4} maxLength={8} required
            disabled={pending} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        </label>}
        {message && <p role="alert" className="error">{message}</p>}
        <button className="primary" type="submit" disabled={pending || mismatch}>
          {mode === 'setup' ? text.pinSave : text.pinUnlock}<span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}
