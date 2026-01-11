import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { memberCode } = body;

    // Validate input
    if (!memberCode || typeof memberCode !== 'string') {
      return NextResponse.json(
        { error: 'Valid member code is required' },
        { status: 400 }
      );
    }

    // Sanitize input - trim and convert to uppercase
    const sanitizedCode = memberCode.trim().toUpperCase();
    
    if (sanitizedCode.length === 0 || sanitizedCode.length > 20) {
      return NextResponse.json(
        { error: 'Invalid member code format' },
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
      .eq('public_id', sanitizedCode)
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

