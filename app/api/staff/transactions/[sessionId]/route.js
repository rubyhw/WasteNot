import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getAuthUser(request) {
  let user = null;

  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabaseClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user: authUser }, error: authError } =
      await supabaseClient.auth.getUser(token);
    if (!authError && authUser) {
      user = authUser;
    }
  }

  // Fallback to cookies
  if (!user) {
    const cookieStore = await cookies();
    const supabaseClient = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const { data: { user: cookieUser }, error: cookieError } =
      await supabaseClient.auth.getUser();
    if (!cookieError && cookieUser) {
      user = cookieUser;
    }
  }

  return user;
}

// Update a session's transactions (edit)
export async function PATCH(request, { params }) {
  const { sessionId } = params;

  try {
    const body = await request.json();
    const items = body.items || [];

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Ensure session belongs to this collection centre
    const { data: session, error: sessionError } = await supabase
      .from('recycling_sessions')
      .select('id, recycler_id, collection_centre_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.collection_centre_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Filter valid items
    const validItems = (items || []).filter(
      (item) => item.quantity && item.quantity > 0
    );

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one item with quantity > 0 is required' },
        { status: 400 }
      );
    }

    // Weight-based items (kg) -> convert to grams
    const weightBasedItems = [3, 5]; // Newspaper, Cardboard

    const transactions = validItems.map((item) => {
      let quantity = item.quantity;
      if (weightBasedItems.includes(item.itemId)) {
        quantity = Math.round(quantity * 1000);
      } else {
        quantity = Math.round(quantity);
      }

      return {
        session_id: sessionId,
        recycler_id: session.recycler_id,
        collection_centre_id: session.collection_centre_id,
        item_id: item.itemId,
        quantity,
      };
    });

    // Delete existing transactions for this session
    const { data: oldTransactions } = await supabase
      .from('recycling_transactions')
      .select('item_id, quantity')
      .eq('session_id', sessionId);

    console.log(`[Edit Transaction API] Deleting ${oldTransactions?.length || 0} old transactions for session ${sessionId}`);
    const { error: deleteError } = await supabase
      .from('recycling_transactions')
      .delete()
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('[Edit Transaction API] Error deleting old transactions:', deleteError);
      return NextResponse.json(
        { error: `Failed to update session: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // Insert new transactions
    console.log(`[Edit Transaction API] Inserting ${transactions.length} new transactions for session ${sessionId}`);
    const { data: insertedTransactions, error: insertError } = await supabase
      .from('recycling_transactions')
      .insert(transactions)
      .select();

    if (insertError) {
      console.error('[Edit Transaction API] Error inserting new transactions:', insertError);
      return NextResponse.json(
        { error: `Failed to update transactions: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log(`[Edit Transaction API] Successfully updated session ${sessionId}: Deleted ${oldTransactions?.length || 0} transactions, inserted ${insertedTransactions?.length || 0} transactions`);

    // Recalculate points difference and update recycler's points_total
    // (weightBasedItems already defined above)
    
    // Calculate old points
    let oldPoints = 0;
    (oldTransactions || []).forEach(tx => {
      if (weightBasedItems.includes(tx.item_id)) {
        oldPoints += Math.floor(tx.quantity / 1000);
      } else {
        oldPoints += tx.quantity;
      }
    });

    // Calculate new points
    let newPoints = 0;
    transactions.forEach(tx => {
      if (weightBasedItems.includes(tx.item_id)) {
        newPoints += Math.floor(tx.quantity / 1000);
      } else {
        newPoints += tx.quantity;
      }
    });

    const pointsDifference = newPoints - oldPoints;

    // Update recycler's points_total if there's a difference
    if (pointsDifference !== 0) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('points_total')
        .eq('id', session.recycler_id)
        .single();

      const currentPoints = currentProfile?.points_total || 0;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points_total: Math.max(0, currentPoints + pointsDifference) })
        .eq('id', session.recycler_id);

      if (updateError) {
        console.error('Failed to update voucher points:', updateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a session and its transactions
export async function DELETE(request, { params }) {
  const { sessionId } = params;

  try {
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Ensure session belongs to this collection centre
    const { data: session, error: sessionError } = await supabase
      .from('recycling_sessions')
      .select('id, collection_centre_id, recycler_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.collection_centre_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get transactions to calculate points to deduct
    const { data: oldTransactions } = await supabase
      .from('recycling_transactions')
      .select('item_id, quantity')
      .eq('session_id', sessionId);

    // Calculate points to deduct
    const weightBasedItems = [3, 5];
    let pointsToDeduct = 0;
    (oldTransactions || []).forEach(tx => {
      if (weightBasedItems.includes(tx.item_id)) {
        pointsToDeduct += Math.floor(tx.quantity / 1000);
      } else {
        pointsToDeduct += tx.quantity;
      }
    });

    // Delete transactions first
    console.log(`[Delete Transaction API] Deleting ${oldTransactions?.length || 0} transactions for session ${sessionId}`);
    const { error: txError } = await supabase
      .from('recycling_transactions')
      .delete()
      .eq('session_id', sessionId);

    if (txError) {
      console.error('[Delete Transaction API] Error deleting transactions:', txError);
      return NextResponse.json(
        { error: `Failed to delete transactions: ${txError.message}` },
        { status: 500 }
      );
    }

    // Delete the session
    console.log(`[Delete Transaction API] Deleting session ${sessionId}`);
    const { error: sessionDeleteError } = await supabase
      .from('recycling_sessions')
      .delete()
      .eq('id', sessionId);

    if (sessionDeleteError) {
      console.error('[Delete Transaction API] Error deleting session:', sessionDeleteError);
      return NextResponse.json(
        { error: `Failed to delete session: ${sessionDeleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`[Delete Transaction API] Successfully deleted session ${sessionId} and ${oldTransactions?.length || 0} transactions`);

    // Update recycler's points_total
    if (pointsToDeduct > 0) {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('points_total')
        .eq('id', session.recycler_id)
        .single();

      const currentPoints = currentProfile?.points_total || 0;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points_total: Math.max(0, currentPoints - pointsToDeduct) })
        .eq('id', session.recycler_id);

      if (updateError) {
        console.error('Failed to update voucher points:', updateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}








