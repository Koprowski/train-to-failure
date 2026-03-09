"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const missingToken = !token;
  const [status, setStatus] = useState<Status>(missingToken ? "error" : "loading");
  const [message, setMessage] = useState(missingToken ? "Verification link is missing or invalid." : "Verifying your email...");

  useEffect(() => {
    if (!token) {
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Verification failed.");
        }
        setStatus("success");
        setMessage(data.message || "Email verified. You can now sign in.");
      })
      .catch((error: Error) => {
        setStatus("error");
        setMessage(error.message || "Verification failed.");
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl shadow-black/20">
        <h1 className="mb-4 text-2xl font-bold text-white">Verify Email</h1>
        <p className={`mb-6 text-sm ${status === "error" ? "text-red-300" : status === "success" ? "text-emerald-300" : "text-gray-300"}`}>
          {message}
        </p>
        {status === "loading" && <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-emerald-500" />}
        {status !== "loading" && (
          <Link href="/login" className="inline-flex rounded-lg bg-emerald-500 px-4 py-2 font-medium text-white hover:bg-emerald-600 transition-colors">
            Go to Login
          </Link>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-emerald-500" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
