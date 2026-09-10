import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppesbfqdvaimfbfqlhnd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwZXNiZnFkdmFpbWZiZnFsaG5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzQwNjcsImV4cCI6MjA5MjYxMDA2N30.diG1hoo7bR6CYI9Nl479s512gFpyD7STXUSjatRcD4U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Every auth call (sign in/out, token refresh, session bootstrap) runs under a
    // Web Lock shared by all tabs of this origin. The default 5s timeout lets a
    // slow request in one place cause another caller to "steal" the lock, which
    // rejects the original call with "Lock ... was released because another
    // request stole it" even though its work completes. 15s absorbs slow networks.
    lockAcquireTimeout: 15000,
  },
});

/** True when `err` is supabase-js's non-fatal "auth lock stolen / timed out" error. */
export const isAuthLockError = (err) =>
  Boolean(err?.isAcquireTimeout) || /another request stole it/i.test(err?.message ?? '');

/**
 * Runs a sign-in call and treats a stolen auth lock as non-fatal: the sign-in
 * still completes in the background, so recover by reading the session that was
 * established instead of surfacing an internal lock message to the user.
 */
export async function signInResilient(signIn) {
  try {
    return await signIn();
  } catch (err) {
    if (!isAuthLockError(err)) throw err;
    console.warn('Supabase auth lock was stolen during sign-in; checking session instead.', err.message);
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) return { data: { user: session.user, session }, error: null };
    return {
      data: { user: null, session: null },
      error: new Error('Sign-in took too long to complete. Please try again.'),
    };
  }
}

/** Signs out without letting a stolen-lock error mask the caller's own message. */
export async function signOutQuietly(options) {
  try {
    await supabase.auth.signOut(options);
  } catch (err) {
    if (!isAuthLockError(err)) throw err;
    console.warn('Supabase auth lock was stolen during sign-out; sign-out continues in background.');
  }
}
