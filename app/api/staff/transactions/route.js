import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
  try {
    // Get authenticated user (staff) ID
    let user = null;
    
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

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const recyclerId = searchParams.get('recyclerId');

    // Fetch transactions with related data
    let query = supabase
      .from('recycling_transactions')
      .select(`
        id,
        session_id,
        quantity,
        item_id,
        recycler_id,
        collection_centre_id,
        created_at,
        recycler:recycler_id (
          id,
          public_id,
          full_name
        )
      `)
      .eq('collection_centre_id', collectionCentreId)
      .order('created_at', { ascending: false });

    // If recyclerId is provided, filter by that recycler
    if (recyclerId) {
      query = query.eq('recycler_id', recyclerId);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Fetch item names from recyclable_items table
    const itemIds = [...new Set(transactions.map(tx => tx.item_id))];
    const { data: items } = await supabase
      .from('recyclable_items')
      .select('id, name')
      .in('id', itemIds);

    const itemMap = {};
    if (items) {
      items.forEach(item => {
        itemMap[item.id] = item.name;
      });
    }

    // Weight-based items (stored as grams, need to convert back to kg)
    const weightBasedItems = [3, 5]; // Newspaper and Cardboard
    
    // Helper function to convert quantity based on item type
    const getDisplayQuantity = (itemId, quantity) => {
      if (weightBasedItems.includes(itemId)) {
        return quantity / 1000; // Convert grams back to kg
      }
      return quantity;
    };

    // Calculate totals per item for the collection centre
    const centreTotals = {};
    transactions.forEach(tx => {
      const itemName = itemMap[tx.item_id] || `Item ${tx.item_id}`;
      if (!centreTotals[itemName]) {
        centreTotals[itemName] = 0;
      }
      centreTotals[itemName] += getDisplayQuantity(tx.item_id, tx.quantity);
    });

    // Calculate totals per item for a specific recycler (if recyclerId provided)
    const recyclerTotals = {};
    if (recyclerId) {
      transactions.forEach(tx => {
        const itemName = itemMap[tx.item_id] || `Item ${tx.item_id}`;
        if (!recyclerTotals[itemName]) {
          recyclerTotals[itemName] = 0;
        }
        recyclerTotals[itemName] += getDisplayQuantity(tx.item_id, tx.quantity);
      });
    }

    // Convert transaction quantities for display (grams to kg for weight items)
    const displayTransactions = transactions.map(tx => ({
      ...tx,
      displayQuantity: getDisplayQuantity(tx.item_id, tx.quantity),
    }));

    return NextResponse.json({
      transactions: displayTransactions,
      centreTotals,
      recyclerTotals: recyclerId ? recyclerTotals : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

