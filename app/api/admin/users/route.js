import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const roleFilter = searchParams.get('role'); // Optional role filter

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch all profiles (to get names, public_ids, roles)
        let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
        if (roleFilter) {
            query = query.eq('role', roleFilter);
        }
        const { data: profiles, error: profileError } = await query;
        if (profileError) throw profileError;

        // 2. Fetch all auth users (to get emails)
        // Note: listUsers defaults to 50 users per page. For production, you'd need pagination loop.
        // Assuming < 1000 users for now.
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
            perPage: 1000
        });
        if (authError) throw authError;

        // 3. Merge Data
        const enrichedUsers = profiles.map(profile => {
            const authUser = users.find(u => u.id === profile.id);
            return {
                ...profile,
                email: authUser?.email || profile.email || "", // Prefer Auth email, fallback to profile
                last_sign_in_at: authUser?.last_sign_in_at
            };
        });

        return NextResponse.json(enrichedUsers);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password, fullName, role } = body;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (createError) throw createError;
        if (user) {
            // Also sync email to public profile
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                full_name: fullName,
                email: email, // Added sync
                role: role
            });
            if (profileError) console.error("Profile sync error:", profileError);
        }

        return NextResponse.json({ success: true, user });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, email, fullName, role } = body;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Update Auth User (Email/Password)
        const updates = { email };
        const { error: updateError } = await supabase.auth.admin.updateUserById(id, updates);
        if (updateError) throw updateError;

        // 2. Update Profile (Name/Role AND Email sync)
        const { error: profileError } = await supabase.from('profiles').update({
            full_name: fullName,
            email: email, // Added sync
            role: role,
        }).eq('id', id);

        if (profileError) throw profileError;

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

        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
