import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";

export async function GET() {
  const sb = supabaseAdmin();

  // Safety check so frontend never crashes
  if (!sb) {
    return NextResponse.json(
      { vouchers: [], warning: "Supabase not configured" },
      { status: 200 }
    );
  }

  const { data, error } = await sb
    .from("vouchers")
    .select("id, name, description, points_cost, is_active, created_at")
    .eq("is_active", true)
    .order("points_cost", { ascending: true });

  if (error) {
    console.error("Voucher fetch error:", error);
    return NextResponse.json(
      { vouchers: [], error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ vouchers: data ?? [] });
}
