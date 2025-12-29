import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabase/admin";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: "Missing x-user-id" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { data, error } = await sb
    .from("points_ledger")
    .select("id, change, source, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ history: data });
}
