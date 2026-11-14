// Badges configuration for Nonsense Chat

export const CREATOR_UIDS = new Set<string>([
  'JBe6nbSfgWOOEa9puh62dY5BuaY2',
  '6a4a9c7a000c330c9018',
]);

export function isCreatorUser(uid?: string): boolean {
  return !!uid && CREATOR_UIDS.has(uid);
}

export const FEMALE_UIDS = new Set<string>([
  'ieg1YXWEzYNtxpFc7okSkhW041s1',
]);

export function isFemaleUser(
  user?: { uid?: string; gender?: string; isFemale?: boolean } | null,
  uid?: string
): boolean {
  const targetUid = uid || user?.uid;
  if (targetUid && FEMALE_UIDS.has(targetUid)) return true;
  if (user && (user.gender === 'female' || user.isFemale)) return true;
  return false;
}
