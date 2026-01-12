import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const { recyclerId, items } = body;

    // Validate recyclerId
    if (!recyclerId || typeof recyclerId !== 'string') {
      return NextResponse.json(
        { error: 'Valid Recycler ID is required' },
        { status: 400 }
      );
    }

    // Validate items array
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      );
    }

    // Filter and validate items
    const validItems = items.filter(item => {
      return item &&
             typeof item.itemId === 'number' &&
             typeof item.quantity === 'number' &&
             item.quantity > 0 &&
             item.quantity < 1000000; // Reasonable max limit
    });

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid item with quantity > 0 is required' },
        { status: 400 }
      );
    }

    // Get authenticated user (staff) ID from Authorization header or cookies
    let user = null;
    
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabaseClient = createClient(
        supabaseUrl,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
      }
    }
    
    // Fallback to cookies if header auth failed
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
      const { data: { user: cookieUser }, error: cookieError } = await supabaseClient.auth.getUser();
      if (!cookieError && cookieUser) {
        user = cookieUser;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in again.' },
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
    console.log(`[Create Session API] Creating session for recycler ${recyclerId} at centre ${collectionCentreId}`);
    const { data: session, error: sessionError } = await supabase
      .from('recycling_sessions')
      .insert({
        recycler_id: recyclerId,
        collection_centre_id: collectionCentreId,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[Create Session API] Error creating session:', sessionError);
      return NextResponse.json(
        { error: `Failed to create session: ${sessionError.message}` },
        { status: 500 }
      );
    }

    const sessionId = session.id;
    console.log(`[Create Session API] Session created successfully with ID: ${sessionId}`);

    // Fetch item details to check measurement type
    const itemIds = validItems.map(item => item.itemId);
    const { data: itemsData } = await supabase
      .from('recyclable_items')
      .select('id, name')
      .in('id', itemIds);

    // Create a map of item_id to check if it's weight-based
    // Items 3 (Newspaper) and 5 (Cardboard) are weight-based (kg)
    const weightBasedItems = [3, 5]; // Newspaper and Cardboard
    
    // Insert transactions for each item with quantity > 0
    // Convert kg to grams (integer) for weight-based items
    const transactions = validItems.map(item => {
      let quantity = item.quantity;
      
      // If item is weight-based (kg), convert to grams (multiply by 1000)
      if (weightBasedItems.includes(item.itemId)) {
        quantity = Math.round(quantity * 1000); // Convert kg to grams
      } else {
        // For quantity-based items, ensure it's an integer
        quantity = Math.round(quantity);
      }
      
      return {
        session_id: sessionId,
        recycler_id: recyclerId,
        collection_centre_id: collectionCentreId,
        item_id: item.itemId,
        quantity: quantity,
      };
    });

    console.log(`[Create Session API] Creating ${transactions.length} transactions for session ${sessionId}`);
    const { data: insertedTransactions, error: transactionsError } = await supabase
      .from('recycling_transactions')
      .insert(transactions)
      .select();

    if (transactionsError) {
      console.error('[Create Session API] Error creating transactions:', transactionsError);
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

    console.log(`[Create Session API] Successfully created ${insertedTransactions?.length || 0} transactions`);

    // Calculate total points earned and update recycler's points_total
    let totalPoints = 0;
    transactions.forEach(tx => {
      // For weight-based items (stored in grams), 1 point per 1000g (1kg)
      // For quantity-based items, 1 point per item
      if (weightBasedItems.includes(tx.item_id)) {
        totalPoints += Math.floor(tx.quantity / 1000);
      } else {
        totalPoints += tx.quantity;
      }
    });

    // Update recycler's points_total
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('points_total')
      .eq('id', recyclerId)
      .single();

    const currentPoints = currentProfile?.points_total || 0;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points_total: currentPoints + totalPoints })
      .eq('id', recyclerId);

    if (updateError) {
      console.error('Failed to update voucher points:', updateError);
      // Don't fail the whole transaction, just log the error
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

