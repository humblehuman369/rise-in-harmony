/**
 * Admin — User management dashboard (admin role only)
 * Stats for active/cancelled users, filterable user list, and the ability
 * to grant (comp) or revoke premium membership without payment.
 * Bioluminescent Depth theme
 */
import { useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Gift,
  ShieldOff,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Shield,
  Mail,
} from "lucide-react";
import Layout from "@/components/Layout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const PAGE_SIZE = 25;

type Filter = "all" | "active" | "cancelled" | "free";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "cancelled", label: "Cancelled" },
  { id: "free", label: "Free" },
];

const GRANT_OPTIONS: Array<{ label: string; days?: number }> = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
  { label: "Lifetime" },
];

function tierBadge(tier: string, hasCancelled: boolean) {
  if (tier === "lifetime") return { label: "Lifetime", color: "#8B5CF6" };
  if (tier === "premium") return { label: "Premium", color: "#00D4AA" };
  if (hasCancelled) return { label: "Cancelled", color: "#EF4444" };
  return { label: "Free", color: "#6B7A99" };
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [grantMenuFor, setGrantMenuFor] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const isAdmin = user?.role === "admin";

  const statsQuery = trpc.admin.userStats.useQuery(undefined, { enabled: isAdmin });
  const usersQuery = trpc.admin.listUsers.useQuery(
    { filter, search: search || undefined, page, pageSize: PAGE_SIZE },
    { enabled: isAdmin }
  );

  const refresh = () => {
    utils.admin.userStats.invalidate();
    utils.admin.listUsers.invalidate();
  };

  const grantMutation = trpc.admin.grantMembership.useMutation({
    onSuccess: (data, vars) => {
      const what = vars.days ? `${vars.days} days of premium` : "lifetime membership";
      if (data.revenueCatSynced) {
        toast.success(`Granted ${what} — synced to RevenueCat`);
      } else if (!data.revenueCatConfigured) {
        toast.success(`Granted ${what} (database only — set REVENUECAT_SECRET_KEY to sync grants into RevenueCat)`);
      } else {
        toast.warning(`Granted ${what} in the database, but the RevenueCat sync failed — check server logs`);
      }
      refresh();
    },
    onError: e => toast.error(e.message),
  });

  const revokeMutation = trpc.admin.revokeMembership.useMutation({
    onSuccess: data => {
      if (data.revenueCatSynced) {
        toast.success("Membership revoked — promotional grant removed in RevenueCat too");
      } else if (!data.revenueCatConfigured) {
        toast.success("Membership revoked (database only — set REVENUECAT_SECRET_KEY to sync with RevenueCat)");
      } else {
        toast.warning("Revoked in the database, but the RevenueCat sync failed — check server logs");
      }
      refresh();
    },
    onError: e => toast.error(e.message),
  });

  const setRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: (_data, vars) => {
      toast.success(
        vars.role === "admin" ? "User promoted to admin" : "Admin privileges removed"
      );
      refresh();
    },
    onError: e => toast.error(e.message),
  });

  const reEngagementMutation = trpc.admin.runReEngagementBatch.useMutation({
    onSuccess: data => {
      toast.success(
        `Re-engagement batch: ${data.sent} sent · ${data.skipped} skipped · ${data.candidates} candidates`
      );
    },
    onError: e => toast.error(e.message),
  });

  // ── Access guard ────────────────────────────────────────────────────────────
  if (!authLoading && !isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0B14' }}>
          <div className="glow-card p-10 text-center max-w-sm">
            <ShieldAlert size={36} className="mx-auto mb-4" style={{ color: '#EF4444' }} />
            <div className="text-lg font-semibold mb-2" style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}>
              Admins only
            </div>
            <p className="text-sm" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              This area requires an administrator account.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = statsQuery.data;
  const userRows = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statCards = [
    { label: "Total Users", value: stats?.total, icon: Users, color: "#3B82F6" },
    { label: "Active Members", value: stats?.active, icon: UserCheck, color: "#00D4AA" },
    { label: "Cancelled", value: stats?.cancelled, icon: UserX, color: "#EF4444" },
    { label: "Free Users", value: stats?.free, icon: Users, color: "#6B7A99" },
  ];

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#0A0B14' }}>
        <div className="px-6 pt-8 pb-10 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
                Administration
              </div>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2rem', fontWeight: 600, color: '#E8EDF5' }}>
                User Management
              </h1>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Run the re-engagement email batch now? (inactive ≥7 days, cooldown respected)")) {
                  reEngagementMutation.mutate({ limit: 50 });
                }
              }}
              disabled={reEngagementMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold self-start sm:self-auto"
              style={{
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.35)",
                color: "#A78BFA",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <Mail size={14} />
              {reEngagementMutation.isPending ? "Sending…" : "Run re-engagement"}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map(s => (
              <div key={s.label} className="glow-card px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon size={15} style={{ color: s.color }} />
                  <span className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>{s.label}</span>
                </div>
                <div className="text-2xl font-bold font-mono-brand" style={{ color: s.color }}>
                  {s.value ?? "…"}
                </div>
              </div>
            ))}
          </div>

          {/* Filters + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="flex gap-2">
              {FILTERS.map(f => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setFilter(f.id); setPage(0); }}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: active ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(0,212,170,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      color: active ? '#00D4AA' : '#6B7A99',
                      fontFamily: 'DM Sans, sans-serif',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            <form
              className="flex items-center gap-2 flex-1 sm:max-w-xs sm:ml-auto"
              onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(0); }}
            >
              <div className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Search size={14} style={{ color: '#6B7A99' }} />
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search name or email…"
                  className="bg-transparent outline-none text-sm flex-1"
                  style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}
                />
              </div>
              <button type="submit" className="btn-teal px-4 py-1.5 text-xs font-semibold">Search</button>
            </form>
          </div>

          {/* User table */}
          <div className="glow-card overflow-x-auto">
            <table className="w-full text-left" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {["User", "Status", "Expires", "Joined", "Last seen", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7A99' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: '#6B7A99' }}>Loading users…</td></tr>
                ) : userRows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: '#6B7A99' }}>No users match this filter.</td></tr>
                ) : (
                  userRows.map(u => {
                    const badge = tierBadge(u.subscriptionTier, u.hasCancelled);
                    const isPaid = u.subscriptionTier === "premium" || u.subscriptionTier === "lifetime";
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium" style={{ color: '#E8EDF5' }}>
                            {u.name || "—"}
                            {u.role === "admin" && (
                              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-xs" style={{ color: '#6B7A99' }}>{u.email || "no email"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: `${badge.color}18`, border: `1px solid ${badge.color}40`, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#8FA3BF' }}>
                          {u.subscriptionTier === "lifetime" ? "Never" : formatDate(u.subscriptionExpiresAt)}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#8FA3BF' }}>{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#8FA3BF' }}>{formatDate(u.lastSignedIn)}</td>
                        <td className="px-4 py-3">
                          <div className="relative flex items-center gap-2 flex-wrap">
                            {!isPaid ? (
                              <>
                                <button
                                  onClick={() => setGrantMenuFor(grantMenuFor === u.id ? null : u.id)}
                                  disabled={grantMutation.isPending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                  style={{ background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)', color: '#00D4AA' }}
                                >
                                  <Gift size={12} />
                                  Grant
                                </button>
                                {grantMenuFor === u.id && (
                                  <div className="absolute z-20 top-9 left-0 rounded-xl p-1.5 min-w-[130px]"
                                    style={{ background: '#181C36', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                    {GRANT_OPTIONS.map(opt => (
                                      <button
                                        key={opt.label}
                                        onClick={() => {
                                          setGrantMenuFor(null);
                                          grantMutation.mutate({ userId: u.id, days: opt.days });
                                        }}
                                        className="block w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                                        style={{ color: '#E8EDF5', fontFamily: 'DM Sans, sans-serif' }}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`Revoke ${u.name || u.email || `user #${u.id}`}'s membership?`)) {
                                    revokeMutation.mutate({ userId: u.id });
                                  }
                                }}
                                disabled={revokeMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
                              >
                                <ShieldOff size={12} />
                                Revoke
                              </button>
                            )}
                            {u.role === "admin" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Remove admin role from ${u.name || u.email || u.id}?`)) {
                                    setRoleMutation.mutate({ userId: u.id, role: "user" });
                                  }
                                }}
                                disabled={setRoleMutation.isPending || u.id === user?.id}
                                title={u.id === user?.id ? "You cannot demote yourself" : "Remove admin"}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}
                              >
                                <Shield size={12} />
                                Demote
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Promote ${u.name || u.email || u.id} to admin?`)) {
                                    setRoleMutation.mutate({ userId: u.id, role: "admin" });
                                  }
                                }}
                                disabled={setRoleMutation.isPending}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                                style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA" }}
                              >
                                <Shield size={12} />
                                Make admin
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs" style={{ color: '#6B7A99', fontFamily: 'DM Sans, sans-serif' }}>
              {total} user{total === 1 ? "" : "s"} · page {page + 1} of {pageCount}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8FA3BF' }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="p-2 rounded-lg disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8FA3BF' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
