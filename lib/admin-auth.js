import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Check if the current user is an admin
 * @param {Request} request - The incoming request
 * @returns {Promise<{isAdmin: boolean, user: any, error: string}>}
 */
export async function checkAdminAuth(request) {
  try {
    // Check if required environment variables are available
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Admin auth: Missing Supabase configuration.');
      return { isAdmin: false, user: null, error: 'Server configuration incomplete' };
    }

    const cookieStore = cookies();
    const supabase = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
          }
        },
      },
    });

    // Verify the session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return { isAdmin: false, user: null, error: 'Unauthorized: No valid session' };
    }

    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { isAdmin: false, user, error: 'Profile not found' };
    }

    if (profile.role !== 'admin') {
      return { isAdmin: false, user, error: 'User is not an admin' };
    }

    return { isAdmin: true, user, error: null };
  } catch (error) {
    console.error('Admin auth check error:', error);
    return { isAdmin: false, user: null, error: 'Authentication check failed' };
  }
}