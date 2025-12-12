import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabase/admin";

export async function GET(req: Request) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json(
      { totalPoints: 0, entries: [], warning: "Missing x-user-id header (dev mode)." },
      { status: 200 }
    );
  }

  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { totalPoints: 0, entries: [], warning: "Supabase not configured." },
      { status: 200 }
    );
  }

  // Sum all point changes
  const { data, error } = await sb
    .from("points_ledger")
    .select("change, reason, source, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { totalPoints: 0, entries: [], error: error.message },
      { status: 500 }
    );
  }

  const entries = data ?? [];
  const totalPoints = entries.reduce((sum, e) => sum + (e.change ?? 0), 0);

  return NextResponse.json({ totalPoints, entries });
}
