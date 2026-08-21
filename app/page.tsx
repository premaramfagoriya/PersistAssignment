import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wordmark } from "./Wordmark";
import { LandingHandleHero } from "./LandingHandleHero";
import { TrackBeacon } from "./TrackBeacon";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative min-h-screen bg-[#04050a] text-white">
      <TrackBeacon meta={{ door: "landing" }} />
      
      {/* Animated Background Mesh - Dimmed for contrast */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-blue-900/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Glassmorphic Topbar - Made darker and more visible */}
        <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#04050a]/80 border-b border-white/10 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between px-6 py-4 mx-auto w-full max-w-7xl">
            <Wordmark size="lg" href={null} />
            <nav className="flex items-center gap-6 text-sm font-semibold text-slate-200">
              <Link href="/login" className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all text-white font-bold">
                Sign in
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center pt-24 pb-16 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-bold uppercase tracking-widest mb-10 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            SyncedIn Protocol v2
          </div>
          
          <LandingHandleHero />
        </div>

        {/* Bento Box "How it works" */}
        <section className="max-w-6xl mx-auto w-full px-6 mb-32 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-4">
              Agentic networking, <span className="text-indigo-400">automated.</span>
            </h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              Stop wasting time on discovery calls. Your twin filters the noise and finds the exact mutual wins.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1 */}
            <article className="group relative p-8 rounded-3xl bg-[#0b0f19]/80 backdrop-blur-md border border-white/10 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:scale-110 transition-transform duration-300">
                  🧠
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Clone Your Context</h3>
                <p className="text-slate-300 leading-relaxed text-sm">
                  Paste your LinkedIn. We instantly extract your goals, tone, and experience into an intelligent AI twin.
                </p>
              </div>
            </article>

            {/* Box 2 */}
            <article className="group relative p-8 rounded-3xl bg-[#0b0f19]/80 backdrop-blur-md border border-white/10 hover:border-purple-500/50 transition-all duration-300 overflow-hidden shadow-xl md:-translate-y-4">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:scale-110 transition-transform duration-300">
                  ⚡
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Agentic Negotiation</h3>
                <p className="text-slate-300 leading-relaxed text-sm">
                  Twins exchange context and draft concrete proposals in seconds. You review, edit, and approve.
                </p>
              </div>
            </article>

            {/* Box 3 */}
            <article className="group relative p-8 rounded-3xl bg-[#0b0f19]/80 backdrop-blur-md border border-white/10 hover:border-blue-500/50 transition-all duration-300 overflow-hidden shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-2xl mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)] group-hover:scale-110 transition-transform duration-300">
                  🤝
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Walk In Aligned</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                  Skip the 30-minute discovery call. Arrive at the meeting with the win-win already established.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* Minimalist Footer */}
        <footer className="mt-auto border-t border-white/5 py-8 text-center backdrop-blur-sm bg-black/20">
          <div className="flex justify-center gap-8 mb-4 text-sm font-medium">
            <Link href="/privacy" className="text-slate-500 hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-slate-500 hover:text-white transition-colors">Terms</Link>
            <a href="mailto:hello@syncedin.org" className="text-slate-500 hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-slate-600 text-xs">© {new Date().getFullYear()} SyncedIn. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}
