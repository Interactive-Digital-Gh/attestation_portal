import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Exported so dev previews/tests can provide a mock session.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId, retries = 1) => {
    const fallbackProfile = () => {
      setProfile({ id: userId, role: 'user' });
    };

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
        );

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        // No profile row yet — create one with default 'user' role
        if (error?.code === 'PGRST116') {
          const { error: insertErr } = await supabase.from('profiles').insert({ id: userId, role: 'user' });
          if (insertErr) {
            console.warn('Profile insert failed (RLS or permissions issue?):', insertErr.message);
          }
          setProfile({ id: userId, role: 'user' });
          return;
        }

        if (error) {
          console.error('Error fetching profile:', error);
          // If it's a permissions/RLS error, don't retry — it won't help
          if (error.code === '42501' || error.message?.includes('permission denied')) {
            console.warn('Profile table may have RLS enabled without a SELECT policy.');
            fallbackProfile();
            return;
          }
          throw error; // Trigger retry
        }

        setProfile({
          ...data,
          role: data?.role || 'user',
        });

        // Update last_login timestamp (fire-and-forget)
        supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId)
          .then(() => {});

        return; // Success — exit the retry loop
      } catch (err) {
        console.error(`Profile fetch attempt ${attempt + 1} failed:`, err.message || err);
        if (attempt < retries) {
          // Wait before retrying (exponential backoff: 1s, 2s)
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        } else {
          console.error('All profile fetch attempts exhausted. Using fallback profile.');
          fallbackProfile();
        }
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    // onAuthStateChange fires INITIAL_SESSION on subscribe, so it covers the
    // initial bootstrap as well as later sign-in / sign-out events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // A token refresh does not change the profile; avoid a needless refetch.
      if (event === 'TOKEN_REFRESHED') return;

      // IMPORTANT: never await Supabase calls inside this callback. It runs while
      // the client holds its auth lock, and any query would block on that lock
      // until it timed out. Defer to the next tick so the lock is released first.
      const userId = session.user.id;
      setTimeout(() => {
        if (cancelled) return;
        fetchProfile(userId).finally(() => {
          if (!cancelled) setLoading(false);
        });
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
