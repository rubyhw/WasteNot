import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
            .from('recyclable_items')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('recyclable_items')
            .insert([body])
            .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error } = await supabase
            .from('recyclable_items')
            .update(updates)
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error } = await supabase
            .from('recyclable_items')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
