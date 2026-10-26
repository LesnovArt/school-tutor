import { useState, type SubmitEvent } from 'react';
import type { CreateProfileInput, UiLanguage } from '../../contracts/profile';
import type { CreateProfileOutcome, ProfileMutation } from './useProfileActions';

export type AgeBand = CreateProfileInput['ageBand'];

const ageValues = ['6-8', '9-11', '12-14', '15+'] as const satisfies readonly AgeBand[];

export function useProfileForm(
  createProfile: (input: CreateProfileInput) => Promise<CreateProfileOutcome>,
  pending: ProfileMutation,
) {
  const [name, setName] = useState('');
  const [ageBand, setAgeBand] = useState<AgeBand>('6-8');
  const [preferredLanguage, setPreferredLanguage] = useState<UiLanguage>('uk');
  const [preferences, setPreferences] = useState('');

  async function submit(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending !== 'idle') return;
    const outcome = await createProfile({ displayName: name, ageBand, preferredLanguage, learningPreferences: preferences });
    if (outcome === 'created' || outcome === 'created-and-selected') {
      setName('');
      setPreferences('');
    }
  }

  return {
    name, setName, ageBand, setAgeBand, preferredLanguage, setPreferredLanguage,
    preferences, setPreferences, saving: pending === 'creating', pending, submit, ageValues,
  };
}
