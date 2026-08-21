"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo, type BrandKey } from "./BrandLogo";

/**
 * Elite/modern landing hero. Single conversion surface:
 *   - Social-proof row + 3 face avatars (warm trust)
 *   - Bold sans headline
 *   - Tight subhead
 *   - Platform pill row (Instagram / TikTok / X / LinkedIn / YouTube)
 *   - One @handle input — accepts EITHER bare handle OR full profile URL
 *   - Oversized blue CTA
 *   - Micro-trust copy
 *
 * Submit flow: paste handle → POST to /api/bulk-create-invites
 * (single-contact, unauthed-safe path) to ensure we route the user
 * to /login with a `next=/[slug]` so the demo-conversation lands
 * the moment they sign in. If unauthed, we just route to
 * /login?next=/onboarding so they start a twin first.
 *
 * Per Jack: "we need to look more modern and elite."
 *
 * Placeholder cycling: greys text rotates between "yourhandle" and
 * "linkedin.com/in/yourhandle" form every ~2.6s so the user instantly
 * sees that either is accepted. Jack: "FOR LINKEDIN AND ALL IT SHOULD
 * BE HANDLE OR FULL LINK THE GREY TEXT CAN SWITCH BACK AND FORTH."
 */
type Platform = {
  key: BrandKey;
  label: string;
  prefix: string;
  // Two-form placeholder: handle-only and full-URL. We rotate between
  // them on a timer so users see at a glance that either is accepted.
  placeholderHandle: string;
  placeholderUrl: string;
};

const PLATFORMS: Platform[] = [
  {
    key: "instagram",
    label: "Instagram",
    prefix: "instagram.com/",
    placeholderHandle: "yourhandle",
    placeholderUrl: "instagram.com/yourhandle"
  },
  {
    key: "x",
    label: "X",
    prefix: "x.com/",
    placeholderHandle: "yourhandle",
    placeholderUrl: "x.com/yourhandle"
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    prefix: "linkedin.com/in/",
    placeholderHandle: "your-handle",
    placeholderUrl: "linkedin.com/in/your-handle"
  },
  {
    key: "facebook",
    label: "Facebook",
    prefix: "facebook.com/",
    placeholderHandle: "yourhandle",
    placeholderUrl: "facebook.com/yourhandle"
  }
];

/**
 * Pull the bare handle out of either form of input. Accepts:
 *   - "yourhandle"             → "yourhandle"
 *   - "@yourhandle"            → "yourhandle"
 *   - "linkedin.com/in/foo"    → "foo" (also auto-detects platform)
 *   - "https://x.com/foo?bar"  → "foo" (strips query)
 *   - "https://www.instagram.com/foo/" → "foo"
 *
 * Returns { handle, detectedPlatform? }. Detected platform overrides
 * the user's pill choice if we can tell from the URL — that's a better
 * UX than yelling about a mismatch.
 */
function parseInput(
  raw: string
): { handle: string; detectedPlatform?: BrandKey } {
  let s = raw.trim().replace(/^@+/, "");
  if (!s) return { handle: "" };
  // Strip scheme + www.
  s = s.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  // Detect platform from domain.
  let detected: BrandKey | undefined;
  if (/^linkedin\.com\/in\//i.test(s)) {
    detected = "linkedin";
    s = s.replace(/^linkedin\.com\/in\//i, "");
  } else if (/^(twitter|x)\.com\//i.test(s)) {
    detected = "x";
    s = s.replace(/^(twitter|x)\.com\//i, "");
  } else if (/^instagram\.com\//i.test(s)) {
    detected = "instagram";
    s = s.replace(/^instagram\.com\//i, "");
  } else if (/^facebook\.com\//i.test(s)) {
    detected = "facebook";
    s = s.replace(/^facebook\.com\//i, "");
  }
  // Drop trailing slash + querystring + hash.
  s = s.split(/[?#]/)[0].replace(/\/+$/, "");
  return { handle: s, detectedPlatform: detected };
}

export function LandingHandleHero({
  realFaces = []
}: {
  /** Real platform users with uploaded avatars. Server-fetched in
   *  app/page.tsx and passed in so the social-proof avatar strip
   *  shows actual people, not DiceBear placeholders. Jack: "use real
   *  photos also on the homepage rather than these weird ones next
   *  to the 40+ founders syncing thing." Empty array falls back to
   *  the previous DiceBear avatars below. */
  realFaces?: Array<{
    id: string;
    name: string;
    avatar_url: string;
    handle: string | null;
  }>;
} = {}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>(PLATFORMS[2]); // LinkedIn default
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Toggle between two placeholder forms on a timer so the user sees
  // that BOTH "yourhandle" and "linkedin.com/in/yourhandle" work. Index
  // 0 = handle-only, 1 = full URL.
  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % 2), 2600);
    return () => clearInterval(t);
  }, []);
  const placeholder =
    phIdx === 0 ? platform.placeholderHandle : platform.placeholderUrl;

  async function go() {
    const parsed = parseInput(handle);
    const h = parsed.handle;
    if (!h || busy) return;
    // If the user pasted a full URL we can detect the platform from —
    // switch the active pill so the routing matches what they typed.
    const effectivePlatform =
      (parsed.detectedPlatform &&
        PLATFORMS.find((p) => p.key === parsed.detectedPlatform)) ||
      platform;
    setBusy(true);
    setErr("");
    try {
      // Build the synthetic profile URL from the chosen platform.
      const profileUrl = `https://${effectivePlatform.prefix}${h}`;
      // Stash the intended URL so the post-login onboarding flow can
      // prefill scrape context from it immediately.
      try {
        sessionStorage.setItem(
          "syncedin.signupIntent",
          JSON.stringify({
            profile_url: profileUrl,
            platform: effectivePlatform.key
          })
        );
      } catch {
        /* private mode */
      }
      // Route to login with a redirect back to onboarding so the new
      // user immediately gets their twin scaffolded from this URL.
      router.push(
        `/login?next=${encodeURIComponent("/onboarding?welcome=1")}`
      );
    } catch (e: any) {
      setErr(e?.message || "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lh-hero">
      <style>{`
        .lh-hero {
          max-width: 860px;
          margin: 0 auto;
          padding: 24px 24px 72px;
          color: var(--text);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .lh-proof {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
          padding: 8px 16px 8px 8px;
          border-radius: 999px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 24px -6px rgba(0,0,0,0.5);
        }
        .lh-avatars { display: inline-flex; }
        .lh-avatars img {
          width: 32px; height: 32px; border-radius: 999px;
          border: 2px solid #04050a;
          object-fit: cover;
          margin-left: -12px;
        }
        .lh-avatars img:first-child { margin-left: 0; }
        .lh-proof-text {
          font-size: 13px; font-weight: 600; color: #cbd5e1;
          letter-spacing: -0.01em;
        }
        .lh-proof-text strong { color: #fff; font-weight: 800; }

        .lh-h1 {
          font-size: clamp(44px, 7vw, 72px);
          font-weight: 900;
          letter-spacing: -0.04em;
          line-height: 1.05;
          margin: 0;
          color: #fff;
        }
        .lh-sub {
          margin-top: 24px;
          font-size: 20px;
          line-height: 1.5;
          color: #94a3b8;
          max-width: 680px;
        }

        .lh-input-container {
          width: 100%;
          max-width: 580px;
          margin-top: 48px;
          padding: 8px;
          border-radius: 24px;
          background: rgba(10, 15, 30, 0.75);
          border: 1px solid rgba(255,255,255,0.15);
          backdrop-filter: blur(20px);
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        .lh-platforms {
          display: flex; flex-wrap: wrap; gap: 8px;
          padding: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .lh-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          background: transparent;
          border: 1px solid transparent;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .lh-pill:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .lh-pill.active {
          background: rgba(255,255,255,0.1);
          color: #fff;
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }

        .lh-input-wrap {
          position: relative;
          padding: 12px;
        }
        .lh-input-prefix {
          position: absolute;
          left: 30px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 18px;
          pointer-events: none;
          font-weight: 600;
        }
        .lh-input {
          width: 100%;
          padding: 16px 20px 16px 42px;
          font-size: 18px;
          font-weight: 500;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.2);
          color: #fff;
          transition: all 0.2s ease;
        }
        .lh-input:focus {
          outline: none;
          border-color: rgba(99,102,241,0.5);
          background: rgba(0,0,0,0.4);
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
        .lh-input::placeholder { color: #475569; }

        .lh-cta {
          margin-top: 24px;
          width: 100%;
          max-width: 580px;
          padding: 20px 24px;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #fff;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px -10px rgba(79, 70, 229, 0.6), inset 0 1px 0 rgba(255,255,255,0.3);
          position: relative;
          overflow: hidden;
        }
        .lh-cta::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s ease;
        }
        .lh-cta:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.8), inset 0 1px 0 rgba(255,255,255,0.4);
        }
        .lh-cta:hover::before { left: 100%; }
        .lh-cta:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .lh-cta .arrow { transition: transform 0.2s ease; font-size: 20px; }
        .lh-cta:hover .arrow { transform: translateX(4px); }

        .lh-microcopy {
          margin-top: 20px;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }

        .lh-error {
          margin-top: 12px;
          font-size: 14px;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
      `}</style>

      {/* Reintroduced highly-polished social proof */}
      <div className="lh-proof">
        <div className="lh-avatars">
          {realFaces.slice(0, 3).map((f) => (
            <img key={f.id} src={f.avatar_url} alt="" />
          ))}
          {realFaces.length === 0 && (
            <>
              <img src="https://api.dicebear.com/9.x/notionists/svg?seed=Felix&backgroundColor=b6e3f4" alt="" />
              <img src="https://api.dicebear.com/9.x/notionists/svg?seed=Anita&backgroundColor=c0aede" alt="" />
              <img src="https://api.dicebear.com/9.x/notionists/svg?seed=Max&backgroundColor=ffd5dc" alt="" />
            </>
          )}
        </div>
        <div className="lh-proof-text">
          Join <strong>40+ founders</strong> syncing deals.
        </div>
      </div>

      <h1 className="lh-h1">
        Your twin already knows <br />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          the deal you should make.
        </span>
      </h1>
      <p className="lh-sub">
        Paste your handle. We build a digital twin of you in 30 seconds —
        then it talks to other people&apos;s twins to find the highest
        win-win between you, before you spend a minute on a call.
      </p>

      {/* Glassmorphic Input Container */}
      <div className="lh-input-container">
        <div className="lh-platforms" role="tablist">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={platform.key === p.key}
              onClick={() => setPlatform(p)}
              className={`lh-pill ${platform.key === p.key ? "active" : ""}`}
            >
              <BrandLogo brand={p.key} size={14} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <div className="lh-input-wrap">
          <span className="lh-input-prefix">@</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void go();
              }
            }}
            placeholder={placeholder}
            className="lh-input"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={go}
        disabled={!handle.trim() || busy}
        className="lh-cta"
      >
        <span>{busy ? "Building twin..." : "Build my twin"}</span>
        <span className="arrow" aria-hidden="true">→</span>
      </button>

      <p className="lh-microcopy">
        Free. No commitment. Your twin learns your voice.
      </p>

      {err && <p className="lh-error">{err}</p>}
    </section>
  );
}
