/**
 * Settings — Account, Subscription, Audio Preferences, Notifications, Theme, Data & Privacy
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import {
  User,
  CreditCard,
  Bell,
  Volume2,
  Moon,
  Shield,
  ChevronRight,
  Download,
  Trash2,
  Crown,
  Check,
  Loader2,
  Sun,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tierLabel(tier: string) {
  if (tier === "lifetime") return "Founder Lifetime";
  if (tier === "premium") return "Premium";
  return "Free";
}

function tierColor(tier: string) {
  if (tier === "lifetime") return "text-amber-400";
  if (tier === "premium") return "text-[#00D4AA]";
  return "text-[#8FA3BF]";
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
  isLight = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  isLight?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-6 space-y-5"
      style={{
        background: isLight ? '#FFFFFF' : "rgba(255,255,255,0.03)",
        border: isLight ? '1px solid rgba(0,0,0,0.07)' : "1px solid rgba(255,255,255,0.07)",
        boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.05)' : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(0,212,170,0.12)" }}
        >
          <Icon size={17} style={{ color: "#00D4AA" }} />
        </div>
        <h2
          className="text-base font-semibold"
          style={{ color: isLight ? '#1A1D2E' : "#E8EDF5", fontFamily: "DM Sans, sans-serif" }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  description,
  children,
  isLight = false,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  isLight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: isLight ? '#1A1D2E' : "#E8EDF5" }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "#8FA3BF" }}>
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const { theme: appTheme } = useTheme();
  const isLight = appTheme === 'light';
  const { isAuthenticated, logout } = useAuth();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // ── Account ──
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const updateProfile = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Name updated");
      setEditingName(false);
      utils.settings.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Subscription ──
  const createPortal = trpc.billing.createPortalSession.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank"),
    onError: (e) => toast.error(e.message),
  });

  // ── Preferences ──
  const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
  const updatePrefs = trpc.settings.updatePreferences.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  function setPref(key: string, value: unknown) {
    updatePrefs.mutate({ [key]: value } as Parameters<typeof updatePrefs.mutate>[0]);
  }

  // ── Export ──
  const exportData = trpc.settings.exportData.useQuery(undefined, { enabled: false });

  async function handleExport() {
    const result = await exportData.refetch();
    if (!result.data) return;
    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rise-in-harmony-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  }

  // ── Delete account ──
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const deleteAccount = trpc.settings.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted");
      logout();
    },
    onError: (e) => toast.error(e.message),
  });

  // ─── Loading / unauthenticated ─────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p style={{ color: "#8FA3BF" }}>Sign in to access your settings.</p>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin" style={{ color: "#00D4AA" }} />
      </div>
    );
  }

  const fadeIn = (prefs.defaultFadeInMinutes as number) ?? 5;
  const volume = (prefs.defaultVolume as number) ?? 0.7;
  const reminders = (prefs.alarmRemindersEnabled as boolean) ?? true;
  const theme = (prefs.theme as string) ?? "dark";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1
          className="text-2xl font-semibold"
          style={{ color: isLight ? '#1A1D2E' : "#E8EDF5", fontFamily: "Cormorant Garamond, serif" }}
        >
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "#8FA3BF" }}>
          Manage your account, preferences, and privacy.
        </p>
      </div>

      {/* ── Account ── */}
      <Section icon={User} title="Account" isLight={isLight}>
        <Row label="Display Name" isLight={isLight}>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                className="h-8 w-40 text-sm"
                style={{ background: isLight ? 'rgba(0,0,0,0.04)' : "rgba(255,255,255,0.06)", border: isLight ? '1px solid rgba(0,0,0,0.1)' : "1px solid rgba(255,255,255,0.12)", color: isLight ? '#1A1D2E' : "#E8EDF5" }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateProfile.mutate({ name: nameValue });
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <Button
                size="sm"
                className="h-8 px-3 text-xs"
                style={{ background: "#00D4AA", color: "#0A0B14" }}
                onClick={() => updateProfile.mutate({ name: nameValue })}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                style={{ color: "#8FA3BF" }}
                onClick={() => setEditingName(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
              style={{ color: isLight ? '#1A1D2E' : "#E8EDF5" }}
              onClick={() => {
                setNameValue(profile.name ?? "");
                setEditingName(true);
              }}
            >
              {profile.name ?? "—"}
              <ChevronRight size={14} style={{ color: "#8FA3BF" }} />
            </button>
          )}
        </Row>

        <Row label="Email" description="Managed by your sign-in provider" isLight={isLight}>
          <span className="text-sm" style={{ color: "#8FA3BF" }}>
            {profile.email ?? "—"}
          </span>
        </Row>

        <Row label="Member Since" isLight={isLight}>
          <span className="text-sm" style={{ color: "#8FA3BF" }}>
            {new Date(profile.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </Row>
      </Section>

      {/* ── Subscription ── */}
      <Section icon={CreditCard} title="Subscription" isLight={isLight}>
        <Row label="Current Plan" isLight={isLight}>
          <div className="flex items-center gap-2">
            {profile.subscriptionTier === "lifetime" && (
              <Crown size={14} className="text-amber-400" />
            )}
            <span className={`text-sm font-semibold ${tierColor(profile.subscriptionTier)}`}>
              {tierLabel(profile.subscriptionTier)}
            </span>
          </div>
        </Row>

        {profile.subscriptionExpiresAt && profile.subscriptionTier === "premium" && (
          <Row label="Renews" isLight={isLight}>
            <span className="text-sm" style={{ color: "#8FA3BF" }}>
              {new Date(profile.subscriptionExpiresAt).toLocaleDateString()}
            </span>
          </Row>
        )}

        {profile.isFounder && (
          <Row label="Founder Status" isLight={isLight}>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B" }}>
              Lifetime Founder
            </span>
          </Row>
        )}

        <Row
          label="Manage Billing"
          description="Update payment method, cancel, or view invoices"
          isLight={isLight}
        >
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs"
            style={{ borderColor: isLight ? 'rgba(0,0,0,0.15)' : "rgba(255,255,255,0.12)", color: isLight ? '#1A1D2E' : "#E8EDF5" }}
            onClick={() => createPortal.mutate()}
            disabled={createPortal.isPending}
          >
            {createPortal.isPending ? (
              <Loader2 size={12} className="animate-spin mr-1" />
            ) : null}
            Stripe Portal
            <ChevronRight size={12} className="ml-1" />
          </Button>
        </Row>
      </Section>

      {/* ── Notifications ── */}
      <Section icon={Bell} title="Notifications" isLight={isLight}>
        <Row
          label="Alarm Reminders"
          description="Get a reminder 5 minutes before your healing alarm"
          isLight={isLight}
        >
          <Switch
            checked={reminders}
            onCheckedChange={(v) => setPref("alarmRemindersEnabled", v)}
          />
        </Row>
      </Section>

      {/* ── Audio Preferences ── */}
      <Section icon={Volume2} title="Audio Preferences" isLight={isLight}>
        <Row label="Default Fade-In" description="How gradually the alarm sound rises" isLight={isLight}>
          <div className="flex items-center gap-2">
            {[1, 3, 5].map((min) => (
              <button
                key={min}
                onClick={() => setPref("defaultFadeInMinutes", min)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: fadeIn === min ? "#00D4AA" : isLight ? 'rgba(0,0,0,0.05)' : "rgba(255,255,255,0.06)",
                  color: fadeIn === min ? "#0A0B14" : "#8FA3BF",
                  border: `1px solid ${fadeIn === min ? "#00D4AA" : isLight ? 'rgba(0,0,0,0.1)' : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {min}m
              </button>
            ))}
          </div>
        </Row>

        <Row label="Default Volume" description={`${Math.round(volume * 100)}%`} isLight={isLight}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setPref("defaultVolume", parseFloat(e.target.value))}
            className="w-32 accent-[#00D4AA]"
          />
        </Row>
      </Section>

      {/* ── Theme ── */}
      <Section icon={Moon} title="Theme" isLight={isLight}>
        <Row label="Appearance" isLight={isLight}>
          <div className="flex items-center gap-2">
            {(
              [
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "light", icon: Sun, label: "Light" },
                { value: "system", icon: Monitor, label: "System" },
              ] as const
            ).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setPref("theme", value)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: theme === value ? "#00D4AA" : isLight ? 'rgba(0,0,0,0.05)' : "rgba(255,255,255,0.06)",
                  color: theme === value ? "#0A0B14" : "#8FA3BF",
                  border: `1px solid ${theme === value ? "#00D4AA" : isLight ? 'rgba(0,0,0,0.1)' : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* ── Data & Privacy ── */}
      <Section icon={Shield} title="Data & Privacy" isLight={isLight}>
        <Row
          label="Export My Data"
          description="Download all your account data as JSON"
          isLight={isLight}
        >
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs"
            style={{ borderColor: isLight ? 'rgba(0,0,0,0.15)' : "rgba(255,255,255,0.12)", color: isLight ? '#1A1D2E' : "#E8EDF5" }}
            onClick={handleExport}
            disabled={exportData.isFetching}
          >
            {exportData.isFetching ? (
              <Loader2 size={12} className="animate-spin mr-1" />
            ) : (
              <Download size={12} className="mr-1" />
            )}
            Export
          </Button>
        </Row>

        <Row
          label="Delete Account"
          description="Permanently remove your account and all data"
          isLight={isLight}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                style={{ borderColor: "rgba(239,68,68,0.4)", color: "#EF4444" }}
              >
                <Trash2 size={12} className="mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent
              style={{ background: isLight ? '#FFFFFF' : "#0E1A2B", border: isLight ? '1px solid rgba(0,0,0,0.1)' : "1px solid rgba(255,255,255,0.1)" }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle style={{ color: isLight ? '#1A1D2E' : "#E8EDF5" }}>
                  Delete your account?
                </AlertDialogTitle>
                <AlertDialogDescription style={{ color: isLight ? '#4A5568' : "#8FA3BF" }}>
                  This will permanently delete your account, all alarms, sessions, and
                  saved sounds. This action cannot be undone.
                  <br />
                  <br />
                  Type{" "}
                  <span className="font-mono text-red-400">DELETE MY ACCOUNT</span> to
                  confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="mt-2"
                style={{
                  background: isLight ? 'rgba(0,0,0,0.04)' : "rgba(255,255,255,0.06)",
                  border: isLight ? '1px solid rgba(0,0,0,0.1)' : "1px solid rgba(255,255,255,0.12)",
                  color: isLight ? '#1A1D2E' : "#E8EDF5",
                }}
              />
              <AlertDialogFooter>
                <AlertDialogCancel
                  style={{ background: "transparent", color: "#8FA3BF", border: isLight ? '1px solid rgba(0,0,0,0.12)' : "1px solid rgba(255,255,255,0.12)" }}
                  onClick={() => setDeleteConfirmText("")}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={
                    deleteConfirmText !== "DELETE MY ACCOUNT" || deleteAccount.isPending
                  }
                  onClick={() => deleteAccount.mutate({ confirm: "DELETE MY ACCOUNT" })}
                  style={{ background: "#EF4444", color: "#fff" }}
                >
                  {deleteAccount.isPending ? (
                    <Loader2 size={14} className="animate-spin mr-1" />
                  ) : null}
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Row>
      </Section>
    </div>
  );
}
