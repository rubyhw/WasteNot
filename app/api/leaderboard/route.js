import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// This line forces the route to be dynamic so it fetches fresh data every time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Check for environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase Environment Variables");
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Initialize Supabase Client directly (Bypassing the missing file)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch top 10 recycler users by points_total (exclude centre_staff and admin)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, points_total, public_id')
      .eq('role', 'recycler')
      .order('points_total', { ascending: false })
      .limit(10);

    if (error) {
      console.error("Supabase Error:", error);
      throw error;
    }

    return NextResponse.json({ leaderboard: data || [] });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}