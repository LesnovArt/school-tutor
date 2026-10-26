import type { Profile, UiLanguage } from '../../contracts/profile';

type Props = {
  profiles: Profile[];
  selectedId: string;
  disabled: boolean;
  languageNames: Record<UiLanguage, string>;
  onSelect: (profileId: string) => void;
};

export function ProfileList({ profiles, selectedId, disabled, languageNames, onSelect }: Props): React.JSX.Element {
  return (
    <div className="profile-list" role="list">
      {profiles.map((profile) => (
        <button
          key={profile.id}
          type="button"
          disabled={disabled}
          className={`profile-option ${selectedId === profile.id ? 'active' : ''}`}
          onClick={() => onSelect(profile.id)}
          aria-pressed={selectedId === profile.id}
        >
          <span className="avatar" aria-hidden="true">{profile.displayName.slice(0, 1).toLocaleUpperCase()}</span>
          <span className="profile-copy"><strong>{profile.displayName}</strong><small>{languageNames[profile.preferredLanguage]} · {profile.ageBand}</small></span>
          {selectedId === profile.id && <span className="check" aria-label="Selected">✓</span>}
        </button>
      ))}
    </div>
  );
}
