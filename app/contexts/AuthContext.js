'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const generatePublicId = useCallback(async (profileData) => {
    try {
      // Call the create-profile API to generate public_id
      const response = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: profileData.id,
          fullName: profileData.full_name || '',
          email: '', // Not needed for update
          role: profileData.role || 'recycler'
        }),
      });

      const result = await response.json();
      if (response.ok && result.profile) {
        setProfile(result.profile);
      } else {
        console.error('Failed to generate public_id:', result.error);
        setProfile(profileData); // Set profile anyway
      }
    } catch (err) {
      console.error('Error generating public_id:', err);
      setProfile(profileData);
    }
  }, []);

  const createProfileIfMissing = useCallback(async (userId) => {
    try {
      // Get user metadata
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      const fullName = user.user_metadata?.full_name || '';
      const email = user.email || '';

      // Create profile via API
      const response = await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          fullName,
          email,
          role: 'recycler' // Default role
        }),
      });

      const result = await response.json();
      if (response.ok && result.profile) {
        setProfile(result.profile);
      } else {
        console.error('Failed to create profile:', result.error);
        setProfile(null);
      }
    } catch (err) {
      console.error('Error creating profile:', err);
      setProfile(null);
    }
  }, []);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') { // No rows returned
          await createProfileIfMissing(userId);
        } else {
          setProfile(null);
        }
      } else {
        // Check if public_id is missing and generate it via API
        if (!data.public_id) {
          await generatePublicId(data);
        } else {
          setProfile(data);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [generatePublicId, createProfileIfMissing]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/login');
  };

  const value = {
    user,
    profile,
    loading,
    signOut,
    isCentreStaff: profile?.role === 'centre_staff',
    role: profile?.role || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
