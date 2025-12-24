import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '7d'; // 7d, 30d, all

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Calculate start date
        let startDate = new Date();
        if (range === '7d') startDate.setDate(startDate.getDate() - 7);
        else if (range === '30d') startDate.setDate(startDate.getDate() - 30);
        else startDate = new Date(0); // All time

        // 1. Fetch Transactions
        const { data: transactions, error: txError } = await supabase
            .from('recycling_transactions')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: true });

        if (txError) throw txError;

        // 2. Fetch Metadata (Items and Profiles for names)
        const { data: items } = await supabase.from('recyclable_items').select('id, name');
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').eq('role', 'centre_staff');

        const itemMap = items?.reduce((acc, item) => ({ ...acc, [item.id]: item.name }), {}) || {};
        const centreMap = profiles?.reduce((acc, p) => ({ ...acc, [p.id]: p.full_name }), {}) || {};

        // Helper: Convert grams to kg for paper/cardboard (IDs 3 and 5 typically)
        // Assuming logic from staff API: if converting needed, do here. 
        // For simplicity, we sum 'quantity' as raw units/grams or normalize based on item logic if strictly defined.
        // The user request emphasizes "Volume", so we sum quantity.

        // 3. Aggregation

        // A. By Date (Main Graph)
        const dateMap = {};
        transactions.forEach(tx => {
            const date = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dateMap[date]) dateMap[date] = { name: date, volume: 0, transactions: 0 };
            dateMap[date].volume += tx.quantity;
            dateMap[date].transactions += 1;
        });
        const trendData = Object.values(dateMap);

        // B. By Material (Pie Chart)
        const materialMap = {};
        transactions.forEach(tx => {
            const name = itemMap[tx.item_id] || `Item ${tx.item_id}`;
            if (!materialMap[name]) materialMap[name] = 0;
            materialMap[name] += tx.quantity;
        });
        const materialData = Object.entries(materialMap).map(([name, value]) => ({ name, value }));

        // C. By Centre (Bar Chart)
        const centreStats = {};
        transactions.forEach(tx => {
            const name = centreMap[tx.collection_centre_id] || 'Unknown Centre';
            if (!centreStats[name]) centreStats[name] = 0;
            centreStats[name] += tx.quantity;
        });
        const centreData = Object.entries(centreStats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        // D. Raw Data for Export (Flattened)
        const exportData = transactions.map(tx => ({
            id: tx.id,
            date: tx.created_at,
            material: itemMap[tx.item_id],
            centre: centreMap[tx.collection_centre_id],
            quantity: tx.quantity
        }));

        return NextResponse.json({
            trendData,
            materialData,
            centreData,
            exportData
        });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
