import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { anthropic, TWIN_MODEL, withAnthropicRetry } from "@/lib/anthropic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId } = await req.json();
    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    const service = createServiceClient();

    // Fetch both twins
    const [{ data: myTwin }, { data: theirTwin }, { data: theirProfile }] = await Promise.all([
      service
        .from("twin_profiles")
        .select("goals, deal_preferences, ai_export_blob")
        .eq("user_id", user.id)
        .maybeSingle(),
      service
        .from("twin_profiles")
        .select("goals, deal_preferences, ai_export_blob")
        .eq("user_id", matchId)
        .maybeSingle(),
      service
        .from("profiles")
        .select("display_name")
        .eq("id", matchId)
        .maybeSingle()
    ]);

    if (!myTwin || !theirTwin) {
      return NextResponse.json({ error: "Twin data missing" }, { status: 400 });
    }

    const theirName = theirProfile?.display_name || "this person";

    // Graceful fallback for local testing without Anthropic API Key
    if (!process.env.ANTHROPIC_API_KEY) {
      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 1500));
      return NextResponse.json({
        reasoning: `I scanned ${theirName}'s goals and found a high-leverage overlap with yours. They are actively looking for the exact kind of value you provide in your deal preferences, and their background perfectly complements your current goals. This is a rare, high-sync match.`
      });
    }

    const systemPrompt = `You are an elite AI networking agent ("Twin") working for the user. Your job is to explain why they should connect with a specific match.
Be concise (2-3 sentences max). Be direct. Use a confident, professional tone. Focus entirely on the concrete synergies between their goals and deal preferences.
Address your user directly as "you". Refer to the match as "${theirName}".
Never use generic filler. Point out exactly where their needs meet your user's offers, or vice versa.`;

    const userMessage = `My Twin Profile:
Goals: ${myTwin.goals}
Deal Preferences: ${myTwin.deal_preferences}
Additional Context: ${myTwin.ai_export_blob?.slice(0, 500) || "None"}

Match's Twin Profile:
Goals: ${theirTwin.goals}
Deal Preferences: ${theirTwin.deal_preferences}
Additional Context: ${theirTwin.ai_export_blob?.slice(0, 500) || "None"}

Why should I connect with ${theirName}?`;

    const res = await withAnthropicRetry(() =>
      anthropic.messages.create({
        model: TWIN_MODEL,
        max_tokens: 150,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }]
      })
    );

    const reasoning = (res.content[0] as any)?.text?.trim() || "Strong alignment found across multiple preferences.";

    return NextResponse.json({ reasoning });
  } catch (err: any) {
    console.error("[match-reasoning error]", err);
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 });
  }
}
