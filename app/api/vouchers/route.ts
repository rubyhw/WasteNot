import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  // 1. Initialize the Admin client directly using Service Role Key
  // This bypasses RLS and works in Server Environments
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase Environment Variables");
    return NextResponse.json(
      { vouchers: [], error: "Server configuration missing" },
      { status: 500 }
    );
  }

  const sb = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 2. Fetch the data
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

    // 3. Return the data
    return NextResponse.json({ vouchers: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { vouchers: [], error: "Internal Server Error" },
      { status: 500 }
    );
  }
}