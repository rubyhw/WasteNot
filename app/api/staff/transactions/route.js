import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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
    const period = searchParams.get('period'); // e.g. 'month' or 'year'

    // Store filter parameters for use in pagination loop
    let periodFilter = null;
    if (period === 'month' || period === 'year') {
      const now = new Date();
      if (period === 'month') {
        periodFilter = {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        };
      } else {
        periodFilter = {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear() + 1, 0, 1),
        };
      }
    }

    // Fetch all transactions (Supabase default limit is 1000, but we want all)
    // Use pagination to ensure we get all records
    let allTransactions = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      // Create a fresh query for each page to avoid query builder issues
      let pageQuery = supabase
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
          ),
          session:recycling_sessions!session_id (
            id,
            created_at
          )
        `)
        .eq('collection_centre_id', collectionCentreId)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters if needed
      if (period === 'month' || period === 'year') {
        const now = new Date();
        let start, end;
        if (period === 'month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else {
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear() + 1, 0, 1);
        }
        pageQuery = pageQuery
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString());
      }

      if (recyclerId) {
        pageQuery = pageQuery.eq('recycler_id', recyclerId);
      }

      const { data: pageData, error: pageError } = await pageQuery;

      if (pageError) {
        console.error('[Transactions API] Page error:', pageError);
        return NextResponse.json(
          { error: pageError.message },
          { status: 500 }
        );
      }

      if (pageData && pageData.length > 0) {
        console.log(`[Transactions API] Page ${page}: Fetched ${pageData.length} transactions (recyclerId: ${recyclerId || 'none'}, collectionCentreId: ${collectionCentreId})`);
        if (pageData.length > 0 && page === 0) {
          console.log(`[Transactions API] First page - Latest transaction:`, {
            id: pageData[0].id,
            session_id: pageData[0].session_id,
            recycler_id: pageData[0].recycler_id,
            collection_centre_id: pageData[0].collection_centre_id,
            created_at: pageData[0].created_at
          });
        }
        allTransactions = [...allTransactions, ...pageData];
        page++;
        hasMore = pageData.length === pageSize;
      } else {
        console.log(`[Transactions API] Page ${page}: No more transactions (recyclerId: ${recyclerId || 'none'}, collectionCentreId: ${collectionCentreId})`);
        hasMore = false;
      }
    }

    const transactions = allTransactions;

    // Debug: Log transaction count and latest transaction
    console.log(`[Transactions API] Fetched ${transactions.length} transactions for collection centre ${collectionCentreId} (recyclerId filter: ${recyclerId || 'none'})`);
    if (transactions.length > 0) {
      console.log(`[Transactions API] Latest transaction created_at: ${transactions[0].created_at}`);
      console.log(`[Transactions API] Latest transaction session_id: ${transactions[0].session_id}`);
      console.log(`[Transactions API] Latest transaction recycler_id: ${transactions[0].recycler_id}`);
      console.log(`[Transactions API] Latest transaction recycler:`, transactions[0].recycler);
      console.log(`[Transactions API] Latest transaction collection_centre_id: ${transactions[0].collection_centre_id}`);
      console.log(`[Transactions API] Latest transaction session:`, transactions[0].session);
    } else {
      console.log(`[Transactions API] No transactions found for collection centre ${collectionCentreId} (recyclerId filter: ${recyclerId || 'none'})`);
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

