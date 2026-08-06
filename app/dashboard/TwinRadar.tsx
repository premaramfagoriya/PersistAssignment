"use client";

import { useState } from "react";
import { Avatar } from "../Avatar";
import { startConversationWithUser } from "./actions";

export function TwinRadar({
  match
}: {
  match: {
    id: string;
    name: string;
    avatar: string | null;
    score: number;
    tier: { label: string; color: string };
    about: string | null;
    wants: string | null;
    offers: string | null;
  };
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyzeSynergy() {
    if (analyzing || reasoning) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/twin/match-reasoning", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId: match.id })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to analyze synergy.");
      }
      const data = await res.json();
      setReasoning(data.reasoning);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div
      className="retro-panel"
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "linear-gradient(135deg, rgba(35,88,255,0.05), rgba(107,45,201,0.05))",
        borderColor: "var(--amber-bright)"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <Avatar id={match.id} name={match.name} avatarUrl={match.avatar} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--amber-bright)",
            marginBottom: 4
          }}>
            Twin Radar Match
          </div>
          <div style={{ fontSize: 20, fontWeight: 850, letterSpacing: "-0.01em" }}>
            {match.name}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: match.tier.color, marginTop: 2 }}>
            {match.score}% · {match.tier.label}
          </div>
        </div>
      </div>

      {!reasoning && !analyzing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
            {match.wants || match.about || "Twin profile is forming."}
          </div>
          <button
            onClick={analyzeSynergy}
            className="retro-btn"
            style={{ padding: "10px 16px", alignSelf: "flex-start", marginTop: 8 }}
          >
            ✨ Ask my twin why we should connect
          </button>
        </div>
      )}

      {analyzing && (
        <div style={{ fontSize: 14, color: "var(--text-dim)", fontStyle: "italic", padding: "12px 0" }}>
          Your twin is analyzing {match.name}'s deal preferences...
        </div>
      )}

      {reasoning && (
        <div style={{
          background: "var(--panel-solid)",
          padding: 16,
          borderRadius: 12,
          border: "1px solid var(--border)",
          fontSize: 14,
          lineHeight: 1.5,
          color: "var(--text)"
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 6 }}>
            Twin's Reasoning
          </div>
          {reasoning}
        </div>
      )}

      {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}

      <form action={startConversationWithUser} style={{ width: "100%", marginTop: 4 }}>
        <input type="hidden" name="userId" value={match.id} />
        {/* Pass the reasoning as the initial draft so it prefills the chat composer */}
        {reasoning && <input type="hidden" name="draft" value={reasoning} />}
        
        <button
          type="submit"
          className="retro-btn retro-btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 800 }}
        >
          {reasoning ? "Connect & Review Intro" : "Connect"} →
        </button>
      </form>
    </div>
  );
}
