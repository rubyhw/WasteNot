import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../src/lib/supabase/admin";

export async function GET(req: Request) {
  // Temporary dev mode: frontend can pass x-user-id header
  // Later you replace this with real auth session.
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json(
      { user: null, warning: "Missing x-user-id header (dev mode)." },
      { status: 200 }
    );
  }

  const sb = supabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { user: null, warning: "Supabase not configured on this environment." },
      { status: 200 }
    );
  }

  const { data, error } = await sb
    .from("profiles")
    .select("id, full_name, role, points_total")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ user: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    user: data,
  });
}
