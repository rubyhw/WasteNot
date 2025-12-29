import { createClient } from '@supabase/supabase-js';
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
      console.warn('Admin auth: Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
      return { isAdmin: false, user: null, error: 'Server configuration incomplete' };
    }

    // Get the session token from cookies
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('sb-access-token')?.value;

    if (!sessionToken) {
      return { isAdmin: false, user: null, error: 'No session token found' };
    }

    // Create Supabase client with service role for admin checks
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    // Verify the session
    const { data: { user }, error: sessionError } = await supabase.auth.getUser(sessionToken);

    if (sessionError || !user) {
      return { isAdmin: false, user: null, error: 'Invalid session' };
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