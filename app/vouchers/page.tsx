"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Voucher = {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  is_active?: boolean;
  created_at?: string;
};

type LedgerRow = {
  id: string;
  change: number;
  source: string | null;
  created_at: string;
};

const TEST_USER_ID = "72afad82-a1c6-4c50-a361-24d18a37cf50"; // dev only

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Points + history (V1)
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<LedgerRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const totalActive = useMemo(() => vouchers.length, [vouchers]);

  async function loadVouchers() {
    setErr(null);
    setMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/vouchers", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error || "Failed to load vouchers.");
      setVouchers(json?.vouchers ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load vouchers.");
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadBalance() {
    try {
      const res = await fetch("/api/points", {
        cache: "no-store",
        headers: { "x-user-id": TEST_USER_ID },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load balance.");

      // Expecting { balance: number }
      setBalance(typeof json?.balance === "number" ? json.balance : null);
    } catch {
      // Keep UI stable even if balance fails
      setBalance(null);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/points/history", {
        cache: "no-store",
        headers: { "x-user-id": TEST_USER_ID },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load history.");

      // Expecting { history: LedgerRow[] }
      setHistory(json?.history ?? []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadVouchers();
    loadBalance();
    loadHistory();
  }, []);

  async function redeem(voucherId: string) {
    setErr(null);
    setMsg(null);
    setRedeemingId(voucherId);

    try {
      const res = await fetch("/api/vouchers/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": TEST_USER_ID, // dev only
        },
        body: JSON.stringify({ voucherId }),
      });

      const json = await res.json();

      if (!res.ok) {
        const text =
          json?.error ||
          (res.status === 400 ? "Cannot redeem voucher." : "Server error.");

        setErr(
          typeof json?.currentPoints === "number"
            ? `${text} Current points: ${json.currentPoints}`
            : text
        );
        return;
      }

      setMsg("Voucher redeemed successfully.");
      if (typeof json?.newBalance === "number") setBalance(json.newBalance);

      // Refresh everything after redeem
      await Promise.all([loadVouchers(), loadBalance(), loadHistory()]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Redeem failed.");
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* HERO */}
        <section style={styles.heroCard}>
          <div style={styles.heroLeft}>
            <div style={styles.pill}>WasteNot • Vouchers & Points</div>
            <h1 style={styles.h1}>
              Redeem rewards with your <span style={styles.green}>points</span>
            </h1>
            <p style={styles.lead}>
              View available vouchers, redeem using your points, and track your
              balance. This page connects to your backend API (Next.js) which
              connects to Supabase.
            </p>

            <div style={styles.heroActions}>
              <button
                style={styles.primaryBtn}
                onClick={loadVouchers}
                disabled={loading}
              >
                {loading ? "Loading…" : "Refresh vouchers"}
              </button>

              <a href="/api/vouchers" style={styles.secondaryBtn}>
                View vouchers JSON
              </a>
            </div>

            <div style={styles.kpiRow}>
              <div style={styles.kpi}>
                <div style={styles.kpiValue}>{totalActive}</div>
                <div style={styles.kpiLabel}>Active vouchers</div>
              </div>
              <div style={styles.kpi}>
                <div style={styles.kpiValue}>
                  {balance === null ? "—" : balance}
                </div>
                <div style={styles.kpiLabel}>Current points balance</div>
              </div>
              <div style={styles.kpi}>
                <div style={styles.kpiValue}>Dev</div>
                <div style={styles.kpiLabel}>Mode (x-user-id)</div>
              </div>
            </div>

            <div style={styles.devMeta}>
              <span style={styles.metaLabel}>Test user</span>
              <code style={styles.code}>{TEST_USER_ID}</code>
            </div>
          </div>

          <div style={styles.heroRight}>
            <div style={styles.bannerWrap}>
              <Image
                src="/vouchers-banner.png"
                alt="Vouchers banner"
                fill
                priority
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        </section>

        {/* ALERTS */}
        {msg && <div style={{ ...styles.alert, ...styles.ok }}>{msg}</div>}
        {err && <div style={{ ...styles.alert, ...styles.bad }}>{err}</div>}

        {/* VOUCHERS TABLE CARD */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.h2}>Available vouchers</h2>
              <p style={styles.smallText}>
                Tip: If you open <code>/api/vouchers/redeem</code> in a browser
                you will see 405 because the browser sends GET. Redeem must be
                POST.
              </p>
            </div>

            <button
              style={styles.secondaryBtnButton}
              onClick={loadVouchers}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div style={styles.skeletonWrap}>
              <div style={styles.skeletonLine} />
              <div style={styles.skeletonLine} />
              <div style={styles.skeletonLine} />
            </div>
          ) : vouchers.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyTitle}>No active vouchers found</div>
              <div style={styles.emptyText}>
                If you added vouchers in Supabase, open{" "}
                <a href="/api/vouchers" style={styles.link}>
                  /api/vouchers
                </a>{" "}
                to confirm what the API returns.
              </div>
            </div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Voucher</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.thRight}>Cost</th>
                    <th style={styles.thRight}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map((v) => (
                    <tr key={v.id} style={styles.tr}>
                      <td style={styles.tdStrong}>
                        <div style={styles.vName}>{v.name}</div>
                        <div style={styles.vId}>ID: {v.id}</div>
                      </td>
                      <td style={styles.td}>{v.description ?? "—"}</td>
                      <td style={{ ...styles.td, ...styles.tdRight }}>
                        {v.points_cost} pts
                      </td>
                      <td style={{ ...styles.td, ...styles.tdRight }}>
                        <button
                          style={{
                            ...styles.primaryBtnSmall,
                            opacity: redeemingId === v.id ? 0.8 : 1,
                          }}
                          onClick={() => redeem(v.id)}
                          disabled={redeemingId === v.id}
                        >
                          {redeemingId === v.id ? "Redeeming…" : "Redeem"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* POINTS + HISTORY (V1) */}
        <section style={styles.sectionCard}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.h2}>Points & History</h2>
              <p style={styles.smallText}>
                This reads from <code>/api/points</code> (balance) and{" "}
                <code>/api/points/history</code> (ledger entries).
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href="/api/points" style={styles.secondaryBtn}>
                Balance JSON
              </a>
              <a href="/api/points/history" style={styles.secondaryBtn}>
                History JSON
              </a>
              <button
                style={styles.secondaryBtnButton}
                onClick={() => Promise.all([loadBalance(), loadHistory()])}
                disabled={historyLoading}
              >
                {historyLoading ? "Refreshing…" : "Refresh points"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={styles.kpiRow}>
              <div style={styles.kpi}>
                <div style={styles.kpiValue}>
                  {balance === null ? "—" : `${balance}`}
                </div>
                <div style={styles.kpiLabel}>Current points balance</div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiValue}>{history.length}</div>
                <div style={styles.kpiLabel}>Ledger records</div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiValue}>Dev</div>
                <div style={styles.kpiLabel}>User from x-user-id header</div>
              </div>
            </div>

            {historyLoading ? (
              <div style={styles.skeletonWrap}>
                <div style={styles.skeletonLine} />
                <div style={styles.skeletonLine} />
                <div style={styles.skeletonLine} />
              </div>
            ) : history.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyTitle}>No history yet</div>
                <div style={styles.emptyText}>
                  Add entries in <code>points_ledger</code> (earn points or redeem
                  a voucher) and refresh.
                </div>
              </div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.thRight}>Change</th>
                      <th style={styles.th}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} style={styles.tr}>
                        <td style={styles.td}>
                          {new Date(h.created_at).toLocaleString()}
                        </td>
                        <td style={{ ...styles.td, ...styles.tdRight }}>
                          {h.change > 0 ? `+${h.change}` : h.change}
                        </td>
                        <td style={styles.td}>{h.source ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* FOOT NOTE */}
        <footer style={styles.footerNote}>
          <span>
            Backend: <code>/app/api/vouchers</code>,{" "}
            <code>/app/api/vouchers/redeem</code>, <code>/app/api/points</code>{" "}
            and <code>/app/api/points/history</code>
          </span>
        </footer>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // page background similar to your homepage vibe
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 600px at 50% -200px, rgba(34,197,94,0.18), transparent), #f2f7f2",
    color: "#0f172a",
    padding: "36px 16px",
  },
  container: {
    maxWidth: 1080,
    margin: "0 auto",
  },

  heroCard: {
    display: "grid",
    gridTemplateColumns: "1.25fr 0.75fr",
    gap: 20,
    padding: 22,
    borderRadius: 18,
    background: "#ffffff",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 12px 30px rgba(2, 6, 23, 0.08)",
  },
  heroLeft: { minWidth: 0 },
  heroRight: { display: "flex", alignItems: "stretch" },

  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.12)",
    color: "#166534",
    border: "1px solid rgba(34,197,94,0.25)",
    width: "fit-content",
  },
  h1: { margin: "12px 0 8px", fontSize: 40, lineHeight: 1.1 },
  green: { color: "#16a34a" },
  lead: { margin: 0, opacity: 0.85, maxWidth: 720 },

  heroActions: {
    display: "flex",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },

  bannerWrap: {
    position: "relative",
    width: "100%",
    minHeight: 220,
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    background: "#e5efe8",
  },

  kpiRow: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  kpi: {
    borderRadius: 14,
    background: "#0b2a1b",
    color: "#eafff2",
    padding: "14px 14px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  kpiValue: { fontSize: 24, fontWeight: 800, lineHeight: 1 },
  kpiLabel: { fontSize: 12, opacity: 0.85, marginTop: 6 },

  devMeta: {
    marginTop: 14,
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaLabel: { fontSize: 12, opacity: 0.7 },
  code: {
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "6px 10px",
    borderRadius: 10,
  },

  alert: {
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid transparent",
    background: "#fff",
  },
  ok: { borderColor: "rgba(34,197,94,0.35)", color: "#166534" },
  bad: { borderColor: "rgba(220, 38, 38, 0.35)", color: "#991b1b" },

  sectionCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    background: "#ffffff",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 12px 30px rgba(2, 6, 23, 0.06)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  h2: { margin: 0, fontSize: 22 },
  smallText: { margin: "6px 0 0", fontSize: 13, opacity: 0.75, maxWidth: 760 },

  tableWrap: {
    marginTop: 14,
    borderRadius: 14,
    overflowX: "auto",
    border: "1px solid rgba(15, 23, 42, 0.08)",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 820 },
  th: {
    textAlign: "left",
    fontSize: 12,
    letterSpacing: 0.2,
    padding: "12px 12px",
    background: "#f6faf6",
    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
    color: "#0f172a",
  },
  thRight: {
    textAlign: "right",
    fontSize: 12,
    letterSpacing: 0.2,
    padding: "12px 12px",
    background: "#f6faf6",
    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
    color: "#0f172a",
  },
  tr: { background: "#fff" },
  td: {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
    verticalAlign: "top",
  },
  tdRight: { textAlign: "right" },
  tdStrong: {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
    fontWeight: 700,
  },
  vName: { fontSize: 14, fontWeight: 800 },
  vId: { marginTop: 6, fontSize: 11, opacity: 0.7, fontWeight: 500 },

  emptyState: {
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    background: "#f6faf6",
    border: "1px dashed rgba(15, 23, 42, 0.18)",
  },
  emptyTitle: { fontWeight: 800, fontSize: 14 },
  emptyText: { marginTop: 6, fontSize: 13, opacity: 0.8 },

  skeletonWrap: {
    marginTop: 14,
    display: "grid",
    gap: 10,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(15,23,42,0.06), rgba(15,23,42,0.10), rgba(15,23,42,0.06))",
  },

  link: { color: "#16a34a", fontWeight: 700, textDecoration: "underline" },

  primaryBtn: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
  },
  primaryBtnSmall: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(15, 23, 42, 0.14)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    textDecoration: "none",
  },
  secondaryBtnButton: {
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(15, 23, 42, 0.14)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
  },

  footerNote: {
    marginTop: 14,
    fontSize: 12,
    opacity: 0.7,
    display: "flex",
    justifyContent: "center",
  },
};
