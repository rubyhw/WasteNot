import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // Use Service Role Key to bypass RLS for secure point updates
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { userId, voucherId, cost } = await request.json();

    // 1. Fetch current profile to check balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points_total')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (profile.points_total < cost) {
      return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });
    }

    // 2. Perform Transaction (Deduct Points & Record Redemption)
    // Note: We use sequential operations here. 
    
    // A. Deduct Points
    const newBalance = profile.points_total - cost;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points_total: newBalance })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // B. Create Redemption Record
    const { error: insertError } = await supabase
      .from('voucher_redemptions')
      .insert({
        user_id: userId,
        voucher_id: voucherId,
        points_spent: cost,
        status: 'Active'
      });

    if (insertError) {
      // In a strict environment, you would rollback points here.
      console.error("Redemption insert failed", insertError);
      return NextResponse.json({ error: 'Redemption record failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance });

  } catch (error) {
    console.error("Redeem API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}