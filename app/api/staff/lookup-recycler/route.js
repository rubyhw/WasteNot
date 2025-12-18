import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { memberCode } = await request.json();

    if (!memberCode) {
      return NextResponse.json(
        { error: 'Member code is required' },
        { status: 400 }
      );
    }

    // Use service role key for server-side operations
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // First, check if profile exists (without role filter)
    const { data: anyProfile, error: anyProfileError } = await supabase
      .from('profiles')
      .select('id, public_id, full_name, role')
      .eq('public_id', memberCode.trim())
      .maybeSingle();

    if (anyProfileError) {
      return NextResponse.json(
        { error: anyProfileError.message },
        { status: 500 }
      );
    }

    // If profile doesn't exist
    if (!anyProfile) {
      return NextResponse.json(
        { error: 'Member code not found' },
        { status: 404 }
      );
    }

    // If profile exists but role is not 'recycler'
    if (anyProfile.role !== 'recycler') {
      return NextResponse.json(
        { 
          error: `This member code belongs to a user with role '${anyProfile.role || 'unknown'}', not a recycler.`,
          role: anyProfile.role
        },
        { status: 400 }
      );
    }

    // Profile exists and is a recycler
    return NextResponse.json({ profile: anyProfile });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

