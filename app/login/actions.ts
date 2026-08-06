"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function origin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

/**
 * If the login form carries an `invite` (per-person slug) or `conference`
 * (community slug), thread it through the callback's `next` param so the
 * post-auth redirect lands on `/claim/<slug>` (atomic conversation seed)
 * or `/conferences/<slug>/join` (membership upsert) instead of dashboard.
 */
function nextFromForm(formData: FormData): string {
  const inv = String(formData.get("invite") ?? "").trim().toLowerCase();
  if (inv && /^[a-z0-9-]+$/.test(inv)) {
    return `/claim/${encodeURIComponent(inv)}`;
  }
  const conf = String(formData.get("conference") ?? "").trim().toLowerCase();
  if (conf && /^[a-z0-9-]+$/.test(conf)) {
    return `/conferences/${encodeURIComponent(conf)}/join`;
  }
  return "/dashboard";
}

function callbackUrl(formData: FormData): string {
  const next = nextFromForm(formData);
  return `${origin()}/auth/callback?next=${encodeURIComponent(next)}`;
}

// ── Magic link ────────────────────────────────────────────────────────────
export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/login?error=missing_email");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl(formData) }
  });

  if (error) {
    console.error("signInWithOtp error", error);
    const detail = encodeURIComponent(
      `${error.message}${error.status ? ` (status ${error.status})` : ""}`
    );
    redirect(`/login?error=send_failed&detail=${detail}`);
  }
  redirect("/login?sent=1");
}

// ── Password sign-in ──────────────────────────────────────────────────────
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing_credentials");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) {
    const detail = encodeURIComponent(error.message);
    redirect(`/login?error=password_failed&detail=${detail}`);
  }
  redirect(nextFromForm(formData));
}

// ── Password sign-up ──────────────────────────────────────────────────────
// If Supabase has "Confirm email" on, the user still gets a confirmation
// email. Once confirmed (or if confirmation is off) they can password-login
// forever after — the redundancy that doesn't depend on magic links working.
export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) redirect("/login?error=missing_credentials");
  if (password.length < 8) {
    redirect(
      `/login?error=password_failed&detail=${encodeURIComponent(
        "Password must be at least 8 characters."
      )}`
    );
  }

  const supabase = createClient();
  
  // Normal sign-up respects the "Confirm email" setting in Supabase Auth config
  // and actually sends the confirmation email rather than bypassing it via admin.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl(formData) }
  });

  const existsByError =
    (!!error && /already (been )?registered|already exists/i.test(error.message)) ||
    (data?.user && data.user.identities && data.user.identities.length === 0);

  if (existsByError) {
    // Just try signing them in if they already exist to save them from being trapped
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (!signInErr) {
       redirect(nextFromForm(formData));
    }
    
    // Fall back to old behavior if password is wrong
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(formData) }
    });
    redirect("/login?exists=1");
  }

  if (error) {
    const detail = encodeURIComponent(error.message);
    redirect(`/login?error=password_failed&detail=${detail}`);
  }

  // Tell the user to check their inbox if confirmation is required
  if (data.session === null) {
    redirect("/login?sent=1");
  }

  // If email confirmation is off, sign them in directly
  redirect(nextFromForm(formData));
}

// ── OAuth (Google / Apple) ────────────────────────────────────────────────
// These require the provider to be enabled in Supabase → Auth → Providers
// with OAuth credentials. The code is ready; the provider config is not.
export async function signInWithGoogle() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin()}/auth/callback` }
  });
  if (error || !data.url) {
    redirect(
      `/login?error=oauth_failed&detail=${encodeURIComponent(
        error?.message ?? "Google sign-in is not configured yet."
      )}`
    );
  }
  redirect(data.url);
}

export async function signInWithApple() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: `${origin()}/auth/callback` }
  });
  if (error || !data.url) {
    redirect(
      `/login?error=oauth_failed&detail=${encodeURIComponent(
        error?.message ?? "Apple sign-in is not configured yet."
      )}`
    );
  }
  redirect(data.url);
}

// ── Sign out ──────────────────────────────────────────────────────────────
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
