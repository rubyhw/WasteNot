"use client";

import React, { useEffect, useState } from "react";

const TEST_USER_ID = "72afad82-a1c6-4c50-a361-24d18a37cf50"; // your test user id

type Voucher = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
};

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  // Load vouchers on first render
  useEffect(() => {
    async function loadVouchers() {
      try {
        setLoading(true);
        const res = await fetch("/api/vouchers");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load vouchers");
        }
        setVouchers(json.vouchers || []);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Failed to load vouchers."
        );
      } finally {
        setLoading(false);
      }
    }

    loadVouchers();
  }, []);

  async function handleRedeem(voucher: Voucher) {
    setError(null);
    setMessage(null);
    setRedeemingId(voucher.id);

    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": TEST_USER_ID, // backend reads this
        },
        body: JSON.stringify({ voucherId: voucher.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        // backend returns { error: "...", currentPoints? }
        const msg =
          json.error ||
          (res.status === 400
            ? "Cannot redeem voucher."
            : "Server error while redeeming.");
        setError(
          json.currentPoints !== undefined
            ? `${msg} Current points: ${json.currentPoints}.`
            : msg
        );
        return;
      }

      // success: { redemption, newBalance }
      setMessage("Voucher redeemed successfully!");
      if (typeof json.newBalance === "number") {
        setBalance(json.newBalance);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unexpected error redeeming voucher."
      );
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <main style={{ maxWidth: 600, margin: "2rem auto", padding: "1rem" }}>
      <h1>Vouchers & Points</h1>

      <p>
        Test user ID: <code>{TEST_USER_ID}</code>
      </p>

      {balance !== null && (
        <p>
          <strong>Current balance (after last redeem):</strong> {balance} points
        </p>
      )}

      {message && (
        <p style={{ color: "green", marginTop: "1rem" }}>
          <strong>{message}</strong>
        </p>
      )}

      {error && (
        <p style={{ color: "red", marginTop: "1rem" }}>
          <strong>{error}</strong>
        </p>
      )}

      <section style={{ marginTop: "2rem" }}>
        <h2>Available vouchers</h2>

        {loading && <p>Loading vouchers…</p>}

        {!loading && vouchers.length === 0 && <p>No active vouchers found.</p>}

        <ul style={{ listStyle: "none", padding: 0 }}>
          {vouchers.map((v) => (
            <li
              key={v.id}
              style={{
                border: "1px solid #444",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                marginBottom: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{v.name}</div>
                {v.description && (
                  <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
                    {v.description}
                  </div>
                )}
                <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                  Cost: <strong>{v.points_cost}</strong> points
                </div>
              </div>
              <button
                onClick={() => handleRedeem(v)}
                disabled={redeemingId === v.id}
                style={{
                  padding: "0.4rem 0.9rem",
                  cursor: redeemingId === v.id ? "wait" : "pointer",
                }}
              >
                {redeemingId === v.id ? "Redeeming…" : "Redeem"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
