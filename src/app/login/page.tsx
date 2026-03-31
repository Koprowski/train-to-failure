"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";

type Mode = "signin" | "signup" | "forgot";
type NoticeTone = "success" | "error" | "info";

type Notice = {
  tone: NoticeTone;
  message: string;
  previewUrl?: string | null;
};

function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) return null;

  const toneClasses = notice.tone === "success"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : notice.tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : "border-sky-500/30 bg-sky-500/10 text-sky-200";

  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${toneClasses}`}>
      <p>{notice.message}</p>
      {notice.previewUrl && (
        <p className="mt-2">
          <a href={notice.previewUrl} className="underline underline-offset-2" target="_self">
            Open preview link
          </a>
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    getProviders()
      .then((providers) => {
        setGoogleEnabled(Boolean(providers?.google));
      })
      .catch(() => {
        setGoogleEnabled(false);
      });
  }, []);

  const resetMessages = () => setNotice(null);

  async function requestVerificationEmail() {
    const response = await fetch("/api/auth/request-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setNotice({
      tone: "info",
      message: data.message || "If that email exists, a verification email has been sent.",
      previewUrl: data.verificationUrl ?? null,
    });
  }

  async function handleCredentialsSignIn() {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    if (result?.error) {
      if (result.error === "EMAIL_NOT_VERIFIED") {
        setNotice({
          tone: "info",
          message: "Your email is not verified yet. Use the resend verification action below.",
        });
        return;
      }

      setNotice({ tone: "error", message: "Invalid email or password." });
      return;
    }

    router.push(result?.url || "/");
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setSubmitting(true);

    try {
      if (!email.trim()) {
        setNotice({ tone: "error", message: "Email is required." });
        return;
      }

      if (mode === "forgot") {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();
        setNotice({
          tone: "info",
          message: data.message || "If that email exists, a password reset link has been sent.",
          previewUrl: data.resetUrl ?? null,
        });
        return;
      }

      if (!password) {
        setNotice({ tone: "error", message: "Password is required." });
        return;
      }

      if (mode === "signup") {
        if (password.length < 8) {
          setNotice({ tone: "error", message: "Password must be at least 8 characters." });
          return;
        }

        if (password !== confirmPassword) {
          setNotice({ tone: "error", message: "Passwords do not match." });
          return;
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();
        if (!response.ok) {
          setNotice({ tone: "error", message: data.error || "Failed to create account." });
          return;
        }

        setNotice({
          tone: "success",
          message: data.message || "Account created. Verify your email before signing in.",
          previewUrl: data.verificationUrl ?? null,
        });
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      await handleCredentialsSignIn();
    } catch {
      setNotice({ tone: "error", message: "Auth request failed." });
    } finally {
      setSubmitting(false);
    }
  }

  const title = mode === "signup"
    ? "Create an account"
    : mode === "forgot"
      ? "Reset your password"
      : "Sign in to track your workouts";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center shadow-2xl shadow-black/20">
        <Image src="/flamingo-logo-160.png" alt="One Foot Fitness" width={160} height={160} className="mx-auto mb-5 h-40 w-40" priority />
        <h1 className="mb-2 text-2xl font-bold text-white">One Foot Fitness</h1>
        <p className="mb-6 text-gray-400">{title}</p>

        <div className="mb-6 grid grid-cols-3 rounded-xl bg-gray-950 p-1 text-sm">
          {(["signin", "signup", "forgot"] as Mode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                resetMessages();
              }}
              className={`rounded-lg px-3 py-2 font-medium transition-colors ${
                mode === value ? "bg-emerald-500 text-gray-900 font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              {value === "signin" ? "Sign In" : value === "signup" ? "Sign Up" : "Reset"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
              />
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          <NoticeBanner notice={notice} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? mode === "signup"
                ? "Creating account..."
                : mode === "forgot"
                  ? "Sending reset link..."
                  : "Signing in..."
              : mode === "signup"
                ? "Create Account"
                : mode === "forgot"
                  ? "Send Reset Link"
                  : "Sign In"}
          </button>
        </form>

        {mode === "signin" && (
          <div className="mt-4 flex items-center justify-between gap-4 text-sm text-gray-400">
            <button type="button" onClick={() => requestVerificationEmail()} className="text-left text-emerald-400 hover:text-emerald-300">
              Resend verification email
            </button>
            <button type="button" onClick={() => setMode("forgot")} className="text-right text-emerald-400 hover:text-emerald-300">
              Forgot password?
            </button>
          </div>
        )}

        {googleEnabled === true && mode !== "forgot" && (
          <>
            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-gray-500">
              <div className="h-px flex-1 bg-gray-800" />
              <span>or</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-medium text-gray-900 transition-colors hover:bg-gray-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <div className="mt-6 text-sm text-gray-400">
          {mode !== "signin" ? (
            <button type="button" onClick={() => setMode("signin")} className="text-emerald-400 hover:text-emerald-300">
              Back to sign in
            </button>
          ) : (
            <span>Email/password accounts must verify email before first sign-in.</span>
          )}
        </div>

        {process.env.NODE_ENV === "development" && notice?.previewUrl && (
          <div className="mt-4 text-xs text-gray-500">
            Development mode is returning a preview link because no email transport is configured.
          </div>
        )}
      </div>
    </div>
  );
}
