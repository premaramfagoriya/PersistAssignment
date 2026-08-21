import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  startTestConversation,
  startConversationWithUser
} from "./actions";
import { BulkReachToolkit } from "../BulkReachToolkit";
import { ExcitementControl } from "./ExcitementControl";
import { SyncMeter } from "../SyncMeter";
import { SummaryBackfill } from "./SummaryBackfill";
import { DiscoverSearch } from "./DiscoverSearch";
import { ScrollTopOnSaved } from "./ScrollTopOnSaved";
import { Avatar } from "../Avatar";
import { deriveIceberg } from "@/lib/iceberg";
import { AppShell } from "../AppShell";
import { ClientDate } from "../ClientDate";
import { computePairScore } from "@/lib/pair-score";
import { QuickFeedbackWidget } from "./QuickFeedbackWidget";
import { PremiumProgressCard } from "./PremiumProgressCard";
import { TwinRadar } from "./TwinRadar";
import { ConversationsList, type ConversationRow } from "./ConversationsList";
import { SocialIconRow } from "../SocialIconRow";
import { countCompletedReferrals } from "@/lib/invite-stats";
import { computeSyncScore } from "@/lib/sync-score";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  // ── Invite gate DISABLED ────────────────────────────────────────────
  // Real-user feedback: the hard 2-invite requirement felt like an
  // interrogation. The user added 2 emails + sent via a broadcast
  // channel, the gate (which only counts generated personalized invites)
  // still blocked them — same screen, same message, no path forward.
  //
  // Invites should be encouragement, not a dashboard-blocking gate.
  // Keeping the count fetch in case a softer prompt wants to surface
  // ("you've sent N invites — try the personalized flow next") later.
  const { count: myInviteCount } = await service
    .from("pending_invites")
    .select("slug", { count: "exact", head: true })
    .eq("inviter_user_id", user.id);
  void myInviteCount;

  // Parallelize the independent first wave: my twin, my profile, my
  // conversations, sample personas, all real users for discovery.
  const [
    { data: twin },
    { data: myProfile },
    { data: conversations },
    { data: testPersonas },
    { data: allRealUsers }
  ] = await Promise.all([
    supabase
      .from("twin_profiles")
      .select(
        "user_id, goals, deal_preferences, communication_style, deal_breakers, ai_export_blob, hometown, current_city"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("conversations")
      .select(
        "id, participant_a, participant_b, status, created_at, summary, counterpart_summary, excitement_score, excitement_locked, sync_score_override"
      )
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order("created_at", { ascending: false })
      // Perf cap (#271): keep dashboard responsive even for power users
      // with hundreds of historical convos. Most recent 60 is plenty for
      // the rendered list; archive view (TBD) can paginate.
      .limit(60),
    service
      .from("profiles")
      .select("id, display_name, email")
      .eq("is_test_persona", true)
      .order("display_name", { ascending: true })
      .limit(20),
    service
      .from("profiles")
      // Include created_at so we can surface NEW signups at the top of
      // the directory (Jack: "move those new people up top of the
      // already on syncedin part, and the discover part"). Fresh joiners
      // are the most valuable to engage with — they're actively building
      // their twin RIGHT NOW.
      .select("id, display_name, email, avatar_url, created_at")
      .eq("is_test_persona", false)
      .neq("id", user.id)
      // Perf cap (#271): was unbounded — scales with total signups and
      // becomes the slowest query on dashboard once user base grows.
      // 200 most-recently-active is more than the Find People UI shows
      // anyway. Ordering by last_active_at puts the most relevant users
      // first AND aligns with the discovery scoring downstream.
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(200)
  ]);

  const twinComplete = Boolean(twin?.goals);

  // Unified completed-referral count — shared helper backs /invite,
  // /personal-intelligence, and this dashboard card so all three
  // surfaces read the same number.
  const completedReferrals = await countCompletedReferrals(user.id, {
    email: user.email
  });

  const otherIds = (conversations ?? []).map((c) =>
    c.participant_a === user.id ? c.participant_b : c.participant_a
  );
  const personaIds = (testPersonas ?? []).map((p) => p.id);
  const realUserIds = (allRealUsers ?? []).map((p) => p.id);

  // Parallelize the second wave that depends on the first.
  const [
    { data: others },
    { data: personaTwins },
    { data: realTwins }
  ] = await Promise.all([
    otherIds.length
      ? service
          .from("profiles")
          .select(
            "id, display_name, email, is_test_persona, avatar_url, linkedin_url, x_url, instagram_url, facebook_url, website_url, last_active_at"
          )
          .in("id", otherIds)
      : Promise.resolve({ data: [] as any[] }),
    personaIds.length
      ? service
          .from("twin_profiles")
          .select("user_id, goals")
          .in("user_id", personaIds)
      : Promise.resolve({ data: [] as any[] }),
    realUserIds.length
      ? service
          .from("twin_profiles")
          .select(
            "user_id, goals, deal_preferences, ai_export_blob, communication_style, deal_breakers"
          )
          .in("user_id", realUserIds)
      : Promise.resolve({ data: [] as any[] })
  ]);

  const nameById = new Map(
    (others ?? []).map((p) => [p.id, p.display_name || p.email] as const)
  );
  const isTestById = new Map(
    (others ?? []).map((p) => [p.id, p.is_test_persona] as const)
  );
  const avatarById = new Map(
    (others ?? []).map((p) => [p.id, p.avatar_url ?? null] as const)
  );
  // Last-active stamp per counterpart — drives the "active 3h ago"
  // pill on each conversation card. May be null if the user hasn't
  // logged in since the column was added; the badge gracefully hides.
  const lastActiveById = new Map<string, string | null>(
    (others ?? []).map(
      (p) => [p.id, (p as any).last_active_at ?? null] as const
    )
  );
  const personaGoal = new Map(
    (personaTwins ?? []).map((t) => [t.user_id, t.goals ?? ""] as const)
  );
  const twinByUser = new Map(
    (realTwins ?? []).map((t) => [t.user_id, t] as const)
  );
  // Per-counterpart social URLs map for inline icon rendering on each
  // conversation card. Pulls from BOTH:
  //   - profiles.{linkedin_url,x_url,instagram_url,facebook_url,website_url}
  //   - URLs extracted from the counterpart's twin ai_export_blob
  // The blob path catches users who connected Sources during onboarding
  // (which adds linkedin.com/in/... and similar to the blob) but never
  // explicitly filled the social columns. Jack: "make sure we have the
  // little icons and if they've linked their social media profiles."
  // Built AFTER twinByUser so the blob lookup works.
  function pickFirstUrl(blob: string, patterns: RegExp[]): string | null {
    if (!blob) return null;
    for (const re of patterns) {
      const m = blob.match(re);
      if (m && m[0]) return m[0];
    }
    return null;
  }
  const socialsById = new Map<
    string,
    {
      linkedin_url?: string | null;
      x_url?: string | null;
      instagram_url?: string | null;
      facebook_url?: string | null;
      website_url?: string | null;
    } | null
  >();
  for (const p of (others ?? []) as any[]) {
    const otherTwin = (twinByUser.get(p.id) as any) ?? null;
    const blob =
      `${otherTwin?.ai_export_blob ?? ""}\n${otherTwin?.goals ?? ""}\n${otherTwin?.deal_preferences ?? ""}`;
    const linkedin =
      p.linkedin_url ??
      pickFirstUrl(blob, [
        /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9-]+\/?/i
      ]);
    const x =
      p.x_url ??
      pickFirstUrl(blob, [
        /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-z0-9_]+\/?/i
      ]);
    const instagram =
      p.instagram_url ??
      pickFirstUrl(blob, [
        /https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9_.]+\/?/i
      ]);
    const facebook =
      p.facebook_url ??
      pickFirstUrl(blob, [
        /https?:\/\/(?:www\.)?facebook\.com\/[a-z0-9.]+\/?/i
      ]);
    const u = {
      linkedin_url: linkedin,
      x_url: x,
      instagram_url: instagram,
      facebook_url: facebook,
      website_url: p.website_url ?? null
    };
    const hasAny =
      u.linkedin_url ||
      u.x_url ||
      u.instagram_url ||
      u.facebook_url ||
      u.website_url;
    socialsById.set(p.id, hasAny ? u : null);
  }
  // Discovery directory: real users with a finished twin you're NOT already
  // in a conversation with. Once you've connected, they drop off discovery —
  // the space below pivots to inviting more people.
  const existingConvoIds = new Set(otherIds);
  /**
   * Lightweight token-overlap score between two twin profiles. Returns
   * 0-100. Token similarity over (goals + deal_preferences + ai_export_blob
   * + communication_style) with a tiny floor so even thin-profile matches
   * get a non-zero number. Server-side and instant — no LLM call needed
   * to display these on first paint. Good enough as a "warm hint" until we
   * upgrade to a Claude-scored job that runs once per (a,b) pair.
   */
  function jaccardScore(a: string, b: string): number {
    const norm = (s: string) =>
      (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3);
    const STOP = new Set([
      "with",
      "from",
      "that",
      "this",
      "have",
      "your",
      "they",
      "them",
      "into",
      "about",
      "their",
      "where",
      "which",
      "would",
      "could",
      "should",
      "while",
      "people",
      "looking",
      "really",
      "after",
      "before",
      "every",
      "right",
      "still",
      "going",
      "company"
    ]);
    const arrA = Array.from(new Set(norm(a).filter((w) => !STOP.has(w))));
    const arrB = Array.from(new Set(norm(b).filter((w) => !STOP.has(w))));
    if (arrA.length === 0 || arrB.length === 0) return 0;
    const setB = new Set(arrB);
    let overlap = 0;
    for (const w of arrA) if (setB.has(w)) overlap += 1;
    const union = arrA.length + arrB.length - overlap;
    return Math.round((overlap / union) * 100);
  }
  const myBlob = [
    twin?.goals ?? "",
    (twin as any)?.deal_preferences ?? "",
    (twin as any)?.communication_style ?? "",
    (twin as any)?.ai_export_blob ?? ""
  ]
    .filter(Boolean)
    .join(" ");

  const directory = (allRealUsers ?? [])
    .map((p) => {
      const t = twinByUser.get(p.id) as any;
      // Headline fallback: first SUBSTANTIVE line of ai_export_blob. The
      // earlier picker accepted the first 20-200 char line — which often
      // matched "# Public footprint (https://...)", a markdown source
      // header, and showed up on contact rows as the "context". Now we
      // skip: markdown headers (#), bare URLs, key:value scaffolding
      // lines, and anything under 4 words.
      const blob = (t?.ai_export_blob || "") as string;
      const headlineFromBlob = (() => {
        if (!blob || typeof blob !== "string") return "";
        const lines = blob
          .split(/[\n\r]/)
          .map((l: string) => l.trim())
          .filter(Boolean);
        for (const l of lines) {
          if (l.length < 28 || l.length > 220) continue;
          if (l.startsWith("#")) continue; // markdown header
          if (/^https?:\/\/\S+\s*$/.test(l)) continue; // bare URL line
          if (/^[a-zA-Z_][\w\s]{0,30}:\s*https?:\/\//.test(l)) continue; // "key: https://..."
          const words = l.split(/\s+/);
          if (words.length < 4) continue;
          return l;
        }
        return "";
      })();
      // Deterministic 4-signal pair score replacing the old "every twin
      // shows 12% because the raw jaccard rounded to 2 and the floor took
      // over." See lib/pair-score.ts for the math.
      const connection_score = computePairScore(twin ?? {}, t ?? {});
      return {
        ...p,
        goals: t?.goals ?? null,
        deal_preferences: t?.deal_preferences ?? null,
        headline_fallback: headlineFromBlob,
        connection_score,
        // Surface signup recency so the sort below can put fresh joiners
        // at the top of the directory.
        created_at_ms: (p as any).created_at
          ? new Date((p as any).created_at).getTime()
          : 0
      };
    })
    // Only show twins who have ACTUALLY put data into onboarding.
    // The directory previously surfaced users who had only signed up
    // (email-as-display-name, blank twin row) which read as 0% sync
    // dead-ends. Substance gate: goals > 5 chars OR ai_export_blob > 80
    // chars OR deal_preferences > 5 chars. Same threshold the find-people
    // route already uses to pick poll respondents.
    .filter((p) => {
      if (existingConvoIds.has(p.id)) return false;
      const t = twinByUser.get(p.id);
      const hasGoals = (t?.goals ?? "").trim().length > 5;
      const hasDealPrefs = (t?.deal_preferences ?? "").trim().length > 5;
      const hasBlob =
        ((t as any)?.ai_export_blob ?? "").trim().length > 80;
      return hasGoals || hasDealPrefs || hasBlob;
    })
    // Sort: NEW signups (last 14 days) at top, ordered by created_at desc.
    // Then everyone else by connection_score desc. Jack: "move those new
    // people up top of the already on syncedin part, and the discover
    // part." Fresh joiners are the most engagement-likely AND the most
    // appreciative when reached out to — they're actively building.
    .sort((a, b) => {
      const cutoff = Date.now() - 14 * 86_400_000;
      const aFresh = a.created_at_ms >= cutoff;
      const bFresh = b.created_at_ms >= cutoff;
      if (aFresh && !bFresh) return -1;
      if (!aFresh && bFresh) return 1;
      if (aFresh && bFresh) return b.created_at_ms - a.created_at_ms;
      return b.connection_score - a.connection_score;
    });

  const realConversations = (conversations ?? [])
    .filter(
      (c) =>
        !isTestById.get(
          c.participant_a === user.id ? c.participant_b : c.participant_a
        )
    )
    // Sort by excitement, highest first; unscored conversations fall to the end.
    .sort(
      (a, b) =>
        (b.excitement_score ?? -1) - (a.excitement_score ?? -1)
    );

  // Last-message-at per conversation — drives the "most recent active"
  // sort in the dashboard ConversationsList filter.
  const realConvIds = realConversations.map((c) => c.id);
  const lastMsgByConv = new Map<string, string>();
  if (realConvIds.length > 0) {
    const { data: latestMsgs } = await service
      .from("messages")
      .select("conversation_id, sent_at")
      .in("conversation_id", realConvIds)
      .order("sent_at", { ascending: false });
    for (const m of (latestMsgs ?? []) as any[]) {
      if (!lastMsgByConv.has(m.conversation_id)) {
        lastMsgByConv.set(m.conversation_id, m.sent_at);
      }
    }
  }
  const testConversations = (conversations ?? []).filter((c) =>
    isTestById.get(
      c.participant_a === user.id ? c.participant_b : c.participant_a
    )
  );

  // For Sync %: count REAL conversations + accepted agreements.
  // Previously we only counted conversations.status === "closed", but that
  // status field is rarely set even after sealed agreements + long
  // exchanges — so a user with 3 sealed deals saw "Conversations had: 0/15"
  // while "Sealed agreements: 18/18" was maxed. The fix: count any
  // conversation where the user has actually sent ≥1 message. That's the
  // strongest possible signal of "a real conversation happened".
  const { data: myMessageConvs } = await service
    .from("messages")
    .select("conversation_id")
    .eq("sender_user_id", user.id);
  const completedConvIds = Array.from(
    new Set(
      ((myMessageConvs ?? []) as Array<{ conversation_id: string }>).map(
        (m) => m.conversation_id
      )
    )
  );
  const { count: acceptedAgreementsCount } = await service
    .from("agreement_responses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("response", "accepted");

  // Edits captured — every time the user corrected a draft. Drives the
  // "edits captured" bucket in the Sync %.
  const { count: editCount } = await service
    .from("edit_deltas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Status pills per conversation: sealed / your-turn / waiting / negotiating.
  // Pull all agreement_responses for the user's conversations once.
  const convIds = (conversations ?? []).map((c) => c.id);
  type AgrResp = { conversation_id: string; user_id: string; response: string };
  const { data: allResps } = convIds.length
    ? await service
        .from("agreement_responses")
        .select("conversation_id, user_id, response")
        .in("conversation_id", convIds)
    : { data: [] as AgrResp[] };
  const respsByConv = new Map<string, AgrResp[]>();
  for (const r of (allResps ?? []) as AgrResp[]) {
    const list = respsByConv.get(r.conversation_id) ?? [];
    list.push(r);
    respsByConv.set(r.conversation_id, list);
  }
  function statusForConv(c: {
    id: string;
    participant_a: string;
    participant_b: string;
  }):
    | { kind: "sealed"; label: string; color: string }
    | { kind: "your_turn"; label: string; color: string }
    | { kind: "waiting"; label: string; color: string }
    | { kind: "negotiating"; label: string; color: string }
    | null {
    const rs = respsByConv.get(c.id) ?? [];
    const mine = rs.find((r) => r.user_id === user!.id);
    const otherId =
      c.participant_a === user!.id ? c.participant_b : c.participant_a;
    const theirs = rs.find((r) => r.user_id === otherId);
    if (mine?.response === "accepted" && theirs?.response === "accepted") {
      return { kind: "sealed", label: "✓ deal sealed", color: "var(--green)" };
    }
    if (theirs?.response === "accepted" && !mine) {
      return {
        kind: "your_turn",
        label: "→ your turn",
        color: "var(--amber-bright)"
      };
    }
    if (mine?.response === "accepted" && !theirs) {
      const otherName = nameById.get(otherId) ?? "them";
      return {
        kind: "waiting",
        label: `⏳ waiting on ${otherName.split(/\s+/)[0]}`,
        color: "var(--text-dim)"
      };
    }
    if (rs.length > 0) {
      return {
        kind: "negotiating",
        label: "↻ negotiating",
        color: "var(--text-dim)"
      };
    }
    return null;
  }

  // Backfill any conversation missing a summary or excitement score.
  const needsBackfillIds = (conversations ?? [])
    .filter(
      (c) =>
        !isTestById.get(
          c.participant_a === user.id ? c.participant_b : c.participant_a
        ) &&
        (c.summary == null || c.excitement_score == null)
    )
    .map((c) => c.id);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://syncedin.org";

  // SyncMeter now lives INSIDE AppShell's sidebar so every signed-in
  // page renders it identically. The legacy syncInputs + cloneSyncCard
  // below are kept ONLY for the hidden legacy left-rail block (so the
  // dashboard's old layout proxy keeps building) — they don't reach
  // the user.
  const syncInputs = {
    name: myProfile?.display_name ?? null,
    goals: twin?.goals ?? null,
    ai_export_blob: twin?.ai_export_blob ?? null,
    deal_preferences: twin?.deal_preferences ?? null,
    comm_style: twin?.communication_style ?? null,
    deal_breakers: twin?.deal_breakers ?? null,
    hometown: (twin as any)?.hometown ?? null,
    current_city: (twin as any)?.current_city ?? null,
    completed_conversations: completedConvIds.length,
    accepted_agreements: acceptedAgreementsCount ?? 0,
    edit_count: editCount ?? 0
  };
  // ── Command Center header + feed (real numbers only) ──────────────────────
  const syncPct = computeSyncScore(syncInputs).total;
  const firstName =
    ((myProfile?.display_name as string) || user.email?.split("@")[0] || "there")
      .split(/\s+/)[0];
  const hr = new Date().getHours();
  const greetPart = hr < 12 ? "morning" : hr < 18 ? "afternoon" : "evening";
  const ccConversations = realConversations.length;
  const ccProposals = realConversations.filter(
    (c: any) => (c.summary ?? "").toString().trim().length > 0
  ).length;
  const commandFeed = [
    { icon: "💬", label: "Conversations", value: ccConversations, href: "/messages", tint: "#5b5bf5" },
    { icon: "🤝", label: "Proposals landed", value: ccProposals, href: "/messages", tint: "#0f9d6b" },
    { icon: "💌", label: "Referrals", value: completedReferrals, href: "/invite", tint: "#e0526a" },
    { icon: "✨", label: "Twin sync", value: `${syncPct}%`, href: "/onboarding", tint: "#8b5cf6" }
  ];
  // AI Recommendation hero — the user's highest-sync real conversation right
  // now (real data via computePairScore). Null if no real conversations yet.
  const ccTop =
    realConversations
      .map((c: any) => {
        const otherId =
          c.participant_a === user.id ? c.participant_b : c.participant_a;
        const ot = (twinByUser.get(otherId) as any) ?? null;
        return {
          id: c.id as string,
          name: (nameById.get(otherId) as string) ?? "Someone",
          avatar: (avatarById.get(otherId) as string | null) ?? null,
          socials: (socialsById.get(otherId) as any) ?? null,
          sync: computePairScore(twin ?? {}, ot ?? {}),
          summary: (c.summary as string | null) ?? null
        };
      })
      .sort((a, b) => b.sync - a.sync)[0] ?? null;
  // Today's Opportunities — top real users you're NOT yet talking to,
  // ranked by deterministic pair score. Reuses the already-built
  // `directory` (substance-gated, dedup'd against existing convos, fresh
  // joiners floated up). Fit pill: ≥55 High, ≥35 Medium, else Worth a look.
  const ccOpportunities = directory.slice(0, 3).map((p: any) => {
    const score = p.connection_score ?? 0;
    const tier =
      score >= 55
        ? { label: "High fit", color: "var(--green)" }
        : score >= 35
        ? { label: "Medium fit", color: "var(--amber-bright)" }
        : { label: "Worth a look", color: "var(--text-dim)" };
    // Structured About / Wants / Offers from their twin (Jack: "display
    // better info on people" — the old single headline line pulled junk).
    const t = (twinByUser.get(p.id) as any) ?? {};
    const ice = deriveIceberg({
      portfolio_about: null,
      goals: t.goals ?? p.goals ?? null,
      deal_preferences: t.deal_preferences ?? null,
      ai_export_blob: t.ai_export_blob ?? null
    });
    return {
      id: p.id as string,
      name: (p.display_name as string) || (p.email as string) || "Someone",
      avatar: (p.avatar_url as string | null) ?? null,
      score,
      tier,
      about: ice.about,
      wants: ice.wants,
      offers: ice.offers
    };
  });
  // Kept as a dead reference for the hidden legacy aside below.
  const cloneSyncCard = (
    <aside
      className="flex flex-col items-center gap-3"
      style={{
        padding: 10,
        borderRadius: 14,
        background: "var(--panel-solid)",
        border: "1px solid var(--border)"
      }}
    >
      <SyncMeter
        inputs={syncInputs}
        size={120}
        avatarUrl={(myProfile as any)?.avatar_url ?? null}
        userId={user.id}
      />
      <Link
        href="/onboarding"
        className="retro-btn retro-btn-primary text-center"
        style={{
          width: "100%",
          fontSize: 12,
          padding: "8px 10px"
        }}
      >
        + add context
      </Link>
    </aside>
  );

  return (
    <AppShell>
      {/* Fire-and-forget backfill for missing summaries/scores */}
      <SummaryBackfill conversationIds={needsBackfillIds} />
      {/* Scrolls to top when arriving with ?saved=1 (post-onboarding). */}
      <ScrollTopOnSaved />

      <div className="max-w-7xl mx-auto py-8">
        {/* COMMAND CENTER top bar */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)]">
            Good {greetPart}, {firstName}.
          </h1>
          <p className="text-[var(--text-dim)] mt-1 text-[15px]">
            Your twin is scanning, prioritizing, and opening doors.
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {commandFeed.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="group relative overflow-hidden rounded-2xl bg-[var(--panel-solid)] border border-[var(--border-bright)] p-5 transition-all hover:border-[var(--amber)] hover:shadow-lg hover:shadow-indigo-500/10"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[var(--panel-2)] border border-[var(--border-bright)] group-hover:bg-[var(--panel-solid)] transition-colors">
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-black text-[var(--text)] tracking-tight">
                      {c.value}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)] mt-1">
                      {c.label}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 2-COLUMN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* MAIN COLUMN (Left - Span 2) */}
          <div className="xl:col-span-2 space-y-10">
            
            {/* AI Recommendation */}
            {ccTop && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--amber-bright)]">Top Priority Recommendation</h2>
                </div>
                <Link
                  href={`/conversations/${ccTop.id}`}
                  className="group flex flex-col sm:flex-row gap-6 items-center p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-[var(--panel-solid)] border border-indigo-500/30 hover:border-indigo-400 transition-all shadow-xl shadow-indigo-500/5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xl sm:text-2xl font-bold tracking-tight mb-2 group-hover:text-indigo-400 transition-colors flex items-center gap-3">
                      {ccTop.name}
                      <SocialIconRow urls={ccTop.socials} size={18} />
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {ccTop.summary || "Your twin flagged this as your highest-leverage conversation. Open it and lock the next step."}
                    </div>
                    <div className="mt-6 flex items-center gap-4 text-sm font-semibold">
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                        <span className="text-emerald-500 text-lg leading-none">&bull;</span> {ccTop.sync}% Fit
                      </span>
                      <span className="text-indigo-400 group-hover:translate-x-1 transition-transform">
                        Open Conversation &rarr;
                      </span>
                    </div>
                  </div>
                  <Avatar id={ccTop.id} name={ccTop.name} avatarUrl={ccTop.avatar} size={96} />
                </Link>
              </section>
            )}

            {/* Active Conversations */}
            {realConversations.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight">Active Conversations</h2>
                  <p className="text-sm text-[var(--text-dim)]">Ongoing deals and relationships.</p>
                </div>
                {(() => {
                  const rows: ConversationRow[] = realConversations.map((c) => {
                    const otherId =
                      c.participant_a === user.id
                        ? c.participant_b
                        : c.participant_a;
                    const otherTwin = (twinByUser.get(otherId) as any) ?? null;
                    const sync_score = computePairScore(twin ?? {}, otherTwin ?? {});
                    return {
                      id: c.id,
                      other_id: otherId,
                      other_name: nameById.get(otherId) ?? "Unknown",
                      other_avatar: avatarById.get(otherId) ?? null,
                      other_socials: socialsById.get(otherId) ?? null,
                      other_last_active_at: lastActiveById.get(otherId) ?? null,
                      status: statusForConv(c),
                      counterpart_summary: c.counterpart_summary ?? null,
                      summary: c.summary ?? null,
                      created_at: c.created_at,
                      excitement_score: c.excitement_score ?? null,
                      excitement_locked: c.excitement_locked ?? null,
                      sync_score,
                      sync_score_override: (c as any).sync_score_override ?? null,
                      last_message_at: lastMsgByConv.get(c.id) ?? null
                    };
                  });
                  return <ConversationsList rows={rows} />;
                })()}
              </section>
            )}

            {/* Today's Opportunities */}
            {ccOpportunities.length > 0 && (
              <section>
                <div className="mb-4">
                  <h2 className="text-xl font-bold tracking-tight">Today's Opportunities</h2>
                  <p className="text-sm text-[var(--text-dim)]">Curated matches from the network.</p>
                </div>
                
                <div className="space-y-4">
                  {/* Top Match gets Twin Radar */}
                  <div className="rounded-2xl border border-[var(--border-bright)] overflow-hidden bg-[var(--panel-solid)] shadow-lg shadow-black/20">
                    <TwinRadar match={ccOpportunities[0]} />
                  </div>

                  {/* Standard remaining opportunities */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ccOpportunities.slice(1).map((o) => (
                      <div key={o.id} className="rounded-2xl bg-[var(--panel-solid)] border border-[var(--border-bright)] p-5 hover:border-[var(--amber)] transition-colors flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar id={o.id} name={o.name} avatarUrl={o.avatar} size={48} />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold truncate text-[var(--text)] text-[15px] tracking-tight">{o.name}</div>
                            <div className="text-xs font-semibold mt-0.5" style={{ color: o.tier.color }}>
                              {o.score}% &middot; {o.tier.label}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 min-h-[4rem]">
                          {([
                            { label: "About", value: o.about },
                            { label: "Wants", value: o.wants },
                            { label: "Offers", value: o.offers }
                          ] as { label: string; value: string | null }[])
                            .filter((r) => r.value)
                            .map((r) => (
                              <div key={r.label} className="text-[13px]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mr-2">{r.label}:</span>
                                <span className="text-[var(--text)] line-clamp-2 leading-relaxed opacity-90">
                                  {r.value}
                                </span>
                              </div>
                            ))}
                          {!o.about && !o.wants && !o.offers && (
                            <span className="text-sm text-[var(--text-dim)] italic">Twin still forming.</span>
                          )}
                        </div>
                        
                        <form action={startConversationWithUser} className="mt-auto pt-2">
                          <input type="hidden" name="userId" value={o.id} />
                          <button type="submit" className="w-full bg-[var(--panel-2)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border-bright)] font-semibold py-2 rounded-xl text-sm transition-all shadow-sm">
                            Connect &rarr;
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Discover Search */}
            <section>
              <div className="mb-4">
                <h2 className="text-xl font-bold tracking-tight">Explore Network</h2>
                <p className="text-sm text-[var(--text-dim)]">Find people manually.</p>
              </div>
              <DiscoverSearch directory={directory} />
            </section>

          </div>

          {/* SIDEBAR COLUMN (Right - Span 1) */}
          <div className="xl:col-span-1 space-y-6">
            
            {!twinComplete && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-lg shadow-amber-500/5 backdrop-blur-md">
                <div className="flex gap-3">
                  <span className="text-amber-500 mt-0.5 leading-none text-xl">&bull;</span>
                  <div>
                    <h3 className="font-bold text-amber-500 tracking-tight">Incomplete Twin</h3>
                    <p className="text-[13px] text-amber-500/80 mt-1 mb-4 leading-relaxed">
                      Your twin lacks context and cannot effectively negotiate for you.
                    </p>
                    <Link href="/onboarding" className="inline-block bg-amber-500 text-black font-bold text-sm px-4 py-2 rounded-xl hover:bg-amber-400 transition-colors">
                      Complete Setup
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[var(--border-bright)] bg-[var(--panel-solid)] overflow-hidden shadow-xl shadow-black/20">
              <PremiumProgressCard completedReferrals={completedReferrals} />
            </div>

            <div className="rounded-2xl border border-[var(--border-bright)] bg-[var(--panel-solid)] p-6 shadow-xl shadow-black/20">
              <h3 className="font-bold tracking-tight mb-1 text-lg">Invite Network</h3>
              <p className="text-[13px] text-[var(--text-dim)] mb-5">Bring your most valuable contacts into the ecosystem.</p>
              <BulkReachToolkit appUrl={appUrl} variant="card" />
            </div>

            {twinComplete && (testPersonas?.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-[var(--border-bright)] bg-[var(--panel-solid)] p-6 shadow-xl shadow-black/20">
                <h3 className="font-bold tracking-tight mb-1 text-lg">Test Sandbox</h3>
                <p className="text-[13px] text-[var(--text-dim)] mb-5">
                  Practice negotiating with AI personas before deploying your twin to real people.
                </p>
                <div className="space-y-2">
                  {(testPersonas ?? []).map((p) => (
                    <form action={startTestConversation} key={p.id}>
                      <input type="hidden" name="personaId" value={p.id} />
                      <button type="submit" className="w-full text-left bg-[var(--panel-2)] hover:bg-[var(--border)] border border-[var(--border-bright)] p-3.5 rounded-xl transition-all shadow-sm">
                        <div className="font-semibold text-[14px]">{p.display_name ?? p.email}</div>
                        <div className="text-[12px] text-[var(--text-dim)] mt-1 line-clamp-2 leading-relaxed">
                          {personaGoal.get(p.id) || "AI persona"}
                        </div>
                      </button>
                    </form>
                  ))}
                </div>
                {testConversations.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-[var(--border-bright)] space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-3">Resume Test</h4>
                    {testConversations.map((c) => {
                      const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
                      return (
                        <Link key={c.id} href={`/conversations/${c.id}`} className="block text-[13px] text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                          &rarr; {nameById.get(otherId) ?? "Unknown"}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <QuickFeedbackWidget surface="dashboard" />
          </div>

        </div>
      </div>
    </AppShell>
  );
}
