import type { Profile } from '../../contracts/profile';

export function resolveSelectedProfileId(profiles: Profile[], savedId: string | null): string {
  return savedId && profiles.some((profile) => profile.id === savedId) ? savedId : '';
}
