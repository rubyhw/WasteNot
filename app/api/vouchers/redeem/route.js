import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // Use Service Role Key to bypass RLS for secure point updates
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = await request.json();
    const { userId, voucherId, cost } = body;

    // Validate input
    if (!userId || !voucherId || !cost) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof cost !== 'number' || cost <= 0) {
      return NextResponse.json({ error: 'Invalid cost value' }, { status: 400 });
    }

    // 1. Verify voucher exists and is active
    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .select('id, points_cost, is_active')
      .eq('id', voucherId)
      .single();

    if (voucherError || !voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    if (!voucher.is_active) {
      return NextResponse.json({ error: 'Voucher is no longer active' }, { status: 400 });
    }

    if (voucher.points_cost !== cost) {
      return NextResponse.json({ error: 'Cost mismatch' }, { status: 400 });
    }

    // 2. Fetch current profile to check balance
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

    // 3. Perform Transaction with proper error handling and rollback
    const newBalance = profile.points_total - cost;
    
    // A. Deduct Points
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points_total: newBalance })
      .eq('id', userId)
      .eq('points_total', profile.points_total); // Optimistic locking

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
      // Rollback: restore the points
      await supabase
        .from('profiles')
        .update({ points_total: profile.points_total })
        .eq('id', userId);
      
      return NextResponse.json({ error: 'Redemption record failed, points restored' }, { status: 500 });
    }

    return NextResponse.json({ success: true, newBalance });

  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}