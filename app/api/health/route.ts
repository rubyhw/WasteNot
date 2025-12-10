// app/api/health/route.ts
import { NextResponse } from "next/server";
import { getEnv } from "../../../src/lib/env";

export async function GET() {
  const configured =
    Boolean(getEnv("NEXT_PUBLIC_SUPABASE_URL")) &&
    Boolean(getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

  return NextResponse.json({
    ok: true,
    supabaseConfigured: configured,
  });
}
