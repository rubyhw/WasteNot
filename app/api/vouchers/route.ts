// app/api/vouchers/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabase/admin";

export async function GET() {
  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { vouchers: [], warning: "Supabase not configured." },
      { status: 200 }
    );
  }

  const { data, error } = await sb
    .from("vouchers")
    .select("id, name, description, points_cost, is_active, created_at")
    .eq("is_active", true)
    .order("points_cost", { ascending: true });

  if (error) {
    return NextResponse.json(
      { vouchers: [], error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ vouchers: data ?? [] });
}
