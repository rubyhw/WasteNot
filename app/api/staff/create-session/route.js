import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { recyclerId, items } = await request.json();

    if (!recyclerId) {
      return NextResponse.json(
        { error: 'Recycler ID is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Filter items with quantity > 0
    const validItems = items.filter(item => item.quantity > 0);

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one item with quantity > 0 is required' },
        { status: 400 }
      );
    }

    // Get authenticated user (staff) ID from cookies
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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const collectionCentreId = user.id;

    // Use service role key for server-side operations
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Create recycling session
    const { data: session, error: sessionError } = await supabase
      .from('recycling_sessions')
      .insert({
        recycler_id: recyclerId,
        collection_centre_id: collectionCentreId,
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: `Failed to create session: ${sessionError.message}` },
        { status: 500 }
      );
    }

    const sessionId = session.id;

    // Insert transactions for each item with quantity > 0
    const transactions = validItems.map(item => ({
      session_id: sessionId,
      recycler_id: recyclerId,
      collection_centre_id: collectionCentreId,
      item_id: item.itemId,
      quantity: item.quantity,
    }));

    const { error: transactionsError } = await supabase
      .from('recycling_transactions')
      .insert(transactions);

    if (transactionsError) {
      // Rollback: delete the session if transactions fail
      await supabase
        .from('recycling_sessions')
        .delete()
        .eq('id', sessionId);

      return NextResponse.json(
        { error: `Failed to create transactions: ${transactionsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Recycling session created successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

