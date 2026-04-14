/**
 * @param {import('@supabase/supabase-js').User | null} user
 */
export function getUserDisplayName(user) {
  if (!user) return '';
  const meta = user.user_metadata ?? {};
  if (typeof meta.full_name === 'string' && meta.full_name.trim()) return meta.full_name.trim();
  if (typeof meta.name === 'string' && meta.name.trim()) return meta.name.trim();
  const local = user.email?.split('@')[0];
  return local ? local.replace(/[._]/g, ' ') : '';
}

/**
 * @param {import('@supabase/supabase-js').User | null} user
 */
export function getUserFirstName(user) {
  const display = getUserDisplayName(user);
  if (!display) return 'there';
  return display.split(/\s+/)[0] ?? 'there';
}
