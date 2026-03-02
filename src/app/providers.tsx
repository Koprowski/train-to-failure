"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

function ExerciseSync() {
  const { status } = useSession();
  const synced = useRef(false);

  useEffect(() => {
    if (status === "authenticated" && !synced.current) {
      synced.current = true;
      fetch("/api/exercises/sync", { method: "POST" }).catch(() => {});
    }
  }, [status]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ExerciseSync />
      {children}
    </SessionProvider>
  );
}
