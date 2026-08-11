"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Mode = "magic" | "password";

function CallbackErrorBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "auth") return null;
  return (
    <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
      That sign-in link didn&apos;t work — it may have expired, already been used, or been opened
      in a different browser than the one you requested it from. Request a new one below.
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [magicStatus, setMagicStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [magicError, setMagicError] = useState<string | null>(null);

  const [passwordStatus, setPasswordStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [resetError, setResetError] = useState<string | null>(null);

  async function handleMagicSubmit(e: FormEvent) {
    e.preventDefault();
    setMagicStatus("sending");
    setMagicError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setMagicStatus("error");
      setMagicError(error.message);
      return;
    }
    setMagicStatus("sent");
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordStatus("submitting");
    setPasswordError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setPasswordStatus("error");
      setPasswordError(error.message);
      return;
    }
    router.push("/");
  }

  async function handleForgotPassword() {
    if (!email) {
      setResetStatus("error");
      setResetError("Enter your email above first.");
      return;
    }
    setResetStatus("sending");
    setResetError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setResetStatus("error");
      setResetError(error.message);
      return;
    }
    setResetStatus("sent");
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">weekly</CardTitle>
          <CardDescription>
            weekly already works without an account. Sign in with your email to save your items
            and history online, so they follow you across devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense fallback={null}>
            <CallbackErrorBanner />
          </Suspense>

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={mode === "magic" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("magic")}
            >
              Magic link
            </Button>
            <Button
              type="button"
              variant={mode === "password" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode("password")}
            >
              Password
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          {mode === "magic" ? (
            magicStatus === "sent" ? (
              <p className="text-sm text-muted-foreground">
                Check <span className="font-medium text-foreground">{email}</span> for a sign-in
                link.
              </p>
            ) : (
              <form onSubmit={handleMagicSubmit} className="flex flex-col gap-3">
                {magicError && <p className="text-sm text-destructive">{magicError}</p>}
                <Button type="submit" disabled={magicStatus === "sending"} className="w-full">
                  {magicStatus === "sending" ? "Sending link…" : "Send magic link"}
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              <Button type="submit" disabled={passwordStatus === "submitting"} className="w-full">
                {passwordStatus === "submitting" ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Haven&apos;t set a password yet? Sign in with a magic link first, then set one from
                the menu once you&apos;re in.
              </p>
              {resetStatus === "sent" ? (
                <p className="text-sm text-muted-foreground">
                  Check <span className="font-medium text-foreground">{email}</span> for a
                  password reset link.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetStatus === "sending"}
                  className="self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {resetStatus === "sending" ? "Sending reset link…" : "Forgot password?"}
                </button>
              )}
              {resetError && <p className="text-sm text-destructive">{resetError}</p>}
            </form>
          )}

          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Continue without an account
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
