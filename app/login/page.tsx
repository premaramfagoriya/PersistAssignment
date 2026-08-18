import Link from "next/link";
import {
  login,
  signInWithPassword,
  signUpWithPassword
} from "./actions";
import { Wordmark } from "../Wordmark";
import { OAuthButtons } from "./OAuthButtons";
import { createServiceClient } from "@/lib/supabase/server";
import { RealFacesStrip, type FaceRow } from "../[slug]/RealFacesStrip";

// Google "G" logo — official multi-color inline SVG.
function GoogleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="20"
      height="20"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

// Apple logo — single-color inline SVG.
function AppleLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      style={{ flexShrink: 0 }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </svg>
  );
}

export default async function LoginPage(props: {
  searchParams: Promise<{
    sent?: string;
    error?: string;
    detail?: string;
    invite?: string;
    conference?: string;
    exists?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const sent = searchParams.sent === "1";
  const exists = searchParams.exists === "1";
  const detail = searchParams.detail
    ? decodeURIComponent(searchParams.detail)
    : null;

  // Pull up to 8 existing SyncedIn members with real photos so prospects
  // see who's actually inside before signing up. Jack: "we can add value
  // on that signup page where we show all the other faces they're able
  // to connect with as well." Best-effort — silently degrade to no
  // strip if the query fails.
  let faces: FaceRow[] = [];
  try {
    const service = createServiceClient();
    const { data: rows } = await service
      .from("profiles")
      .select(
        "id, display_name, avatar_url, handle, portfolio_about, email"
      )
      .not("avatar_url", "is", null)
      .not("display_name", "is", null)
      .neq("is_test_persona", true)
      .limit(40);
    const candidates = ((rows ?? []) as any[]).filter(
      (r) => (r.avatar_url || "").length > 8
    );
    // Shuffle deterministically so the strip varies but isn't jittery
    // per-request (no Date.now() — that would break SSR cache layers).
    const seeded = [...candidates].sort((a, b) =>
      (a.id as string).localeCompare(b.id as string)
    );
    faces = seeded.slice(0, 8).map((r) => ({
      id: r.id,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      handle: r.handle,
      headline:
        (r.portfolio_about as string | null)?.split("\n")[0]?.slice(0, 110) ??
        null
    }));
  } catch {
    /* no faces strip — degrade gracefully */
  }

  return (
    <main className="min-h-screen w-full flex bg-[var(--bg)]">
      {/* LEFT SIDE: Hero / Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-[#04050a] overflow-hidden border-r border-[var(--border)]">
        {/* Background gradient effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-[80%] h-[80%] bg-[radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.15),transparent_50%)]" />
        
        <div className="relative z-10">
          <Wordmark size="lg" />
          <div className="mt-24">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Scale your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">relationships</span>.
              <br />
              Automate your reach.
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-md">
              Deploy your AI twin to engage, negotiate, and qualify opportunities while you sleep.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          {faces.length > 0 && (
            <div className="opacity-70 grayscale transition hover:grayscale-0 hover:opacity-100 duration-500">
               <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Join these founders</p>
               <RealFacesStrip faces={faces} />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 xl:px-32 relative py-12">
        <Link href="/" className="absolute top-8 left-6 sm:left-12 text-sm text-[var(--text-dim)] hover:text-[var(--amber-bright)] transition-colors flex items-center gap-1">
          &larr; Back to site
        </Link>
        
        <div className="w-full max-w-md mx-auto">
          {/* Mobile wordmark */}
          <div className="lg:hidden mb-8 flex justify-center">
             <Wordmark size="lg" />
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-[var(--text)] tracking-tight">Welcome back</h2>
            <p className="mt-2 text-[var(--text-dim)]">Sign in to your Command Center.</p>
          </div>

          {/* Login Card */}
          <div className="bg-[var(--panel-solid)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/5">
             <OAuthButtons invite={searchParams.invite} conference={searchParams.conference} />

             <div className="my-6 flex items-center gap-3">
               <div className="flex-1 h-px bg-[var(--border)]" />
               <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">or email</span>
               <div className="flex-1 h-px bg-[var(--border)]" />
             </div>

             <form className="space-y-3">
                <input type="hidden" name="invite" value={searchParams.invite ?? ""} />
                <input type="hidden" name="conference" value={searchParams.conference ?? ""} />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@domain.com"
                  className="w-full bg-[var(--bg)] border border-[var(--border-bright)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-[var(--text-dim)]"
                />
                <button formAction={login} className="w-full bg-[var(--panel-2)] hover:bg-[var(--border)] text-[var(--text)] font-semibold border border-[var(--border)] rounded-xl py-3 text-sm transition-all flex items-center justify-center gap-2">
                  Email me a magic link
                </button>
             </form>

             {sent && (
               <p className="mt-4 text-sm text-green-400 font-medium text-center">
                 ✓ Check your inbox — the link works in any browser.
               </p>
             )}

             {exists && (
               <div className="mt-4 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
                 <p className="text-sm text-indigo-400 font-semibold">Account exists</p>
                 <p className="mt-1 text-xs text-[var(--text-dim)]">
                   We just emailed a sign-in link to that address. Or sign in with your password below.
                 </p>
               </div>
             )}

             <div className="my-6 flex items-center gap-3">
               <div className="flex-1 h-px bg-[var(--border)]" />
               <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">password</span>
               <div className="flex-1 h-px bg-[var(--border)]" />
             </div>

             <form className="space-y-3">
               <input type="hidden" name="invite" value={searchParams.invite ?? ""} />
               <input type="hidden" name="conference" value={searchParams.conference ?? ""} />
               <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@domain.com"
                  className="w-full bg-[var(--bg)] border border-[var(--border-bright)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-[var(--text-dim)]"
                />
               <input
                 name="password"
                 type="password"
                 autoComplete="current-password"
                 placeholder="password (8+ characters)"
                 className="w-full bg-[var(--bg)] border border-[var(--border-bright)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-[var(--text-dim)]"
               />
               <div className="flex gap-3 pt-2">
                 <button formAction={signInWithPassword} className="flex-1 retro-btn-primary rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-500/20">
                   Sign in
                 </button>
                 <button formAction={signUpWithPassword} className="flex-1 bg-[var(--panel-2)] hover:bg-[var(--border)] text-[var(--text)] font-semibold border border-[var(--border)] rounded-xl py-3 text-sm transition-all">
                   Create account
                 </button>
               </div>
             </form>

             {searchParams.error && (
               <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                 <p className="text-sm text-red-400 font-semibold">! Something went wrong</p>
                 {detail && <p className="mt-1 text-xs text-[var(--text-dim)]">{detail}</p>}
               </div>
             )}
          </div>

          {/* Legal / Footer */}
          <div className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[var(--text-dim)]">
             <Link href="/privacy" className="hover:text-[var(--text)] transition-colors">Privacy</Link>
             <span>&middot;</span>
             <Link href="/terms" className="hover:text-[var(--text)] transition-colors">Terms</Link>
             <span>&middot;</span>
             <Link href="/support" className="hover:text-[var(--text)] transition-colors">Support</Link>
             <span>&middot;</span>
             <a href="mailto:hi@syncedin.org" className="hover:text-[var(--text)] transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </main>
  );
}
