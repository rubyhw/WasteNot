// app/api/vouchers/redeem/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../src/lib/supabase/admin";

type RedeemBody = {
  voucherId?: string;
};

export async function POST(req: Request) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Missing x-user-id header (dev mode)." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    if (!sb) {
      return NextResponse.json(
        { error: "Supabase not configured." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as RedeemBody | null;
    if (!body?.voucherId) {
      return NextResponse.json(
        { error: "Missing voucherId in body." },
        { status: 400 }
      );
    }

    // 1) Fetch voucher
    const { data: voucher, error: voucherError } = await sb
      .from("vouchers")
      .select("id, points_cost, is_active")
      .eq("id", body.voucherId)
      .single();

    if (voucherError) {
      console.error("Voucher fetch error:", voucherError);
      return NextResponse.json(
        { error: "Voucher fetch failed", detail: voucherError.message },
        { status: 500 }
      );
    }

    if (!voucher || !voucher.is_active) {
      return NextResponse.json(
        { error: "Voucher not found or inactive." },
        { status: 400 }
      );
    }

    // 2) Calculate current points
    const { data: ledger, error: ledgerError } = await sb
      .from("points_ledger")
      .select("change")
      .eq("user_id", userId);

    if (ledgerError) {
      console.error("Ledger fetch error:", ledgerError);
      return NextResponse.json(
        { error: "Ledger fetch failed", detail: ledgerError.message },
        { status: 500 }
      );
    }

    const currentPoints =
      (ledger ?? []).reduce((sum, e) => sum + (e.change ?? 0), 0);

    if (currentPoints < voucher.points_cost) {
      return NextResponse.json(
        { error: "Not enough points.", currentPoints },
        { status: 400 }
      );
    }

    // 3) Insert redemption
    const { data: redemption, error: redeemError } = await sb
      .from("voucher_redemptions")
      .insert({
        user_id: userId,
        voucher_id: voucher.id,
        points_spent: voucher.points_cost,
        status: "redeemed",
      })
      .select("*")
      .single();

    if (redeemError) {
      console.error("Redemption insert error:", redeemError);
      return NextResponse.json(
        { error: "Redemption insert failed", detail: redeemError.message },
        { status: 500 }
      );
    }

    // 4) Insert ledger record (NO 'reason' FIELD NOW)
    const { error: ledgerInsertError } = await sb.from("points_ledger").insert({
      user_id: userId,
      change: -voucher.points_cost,
      source: "voucher_redeem",
    });

    if (ledgerInsertError) {
      console.error("Ledger insert error:", ledgerInsertError);
      return NextResponse.json(
        { error: "Ledger insert failed", detail: ledgerInsertError.message },
        { status: 500 }
      );
    }

    const newBalance = currentPoints - voucher.points_cost;

    return NextResponse.json({ redemption, newBalance });
  } catch (err: unknown) {
    console.error("Unhandled redeem error:", err);
    return NextResponse.json(
      {
        error: "Unhandled server error in redeem route",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
