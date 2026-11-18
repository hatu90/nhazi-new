"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api, errorMessage, setTokenSource } from "@/client/lib/api";
import type { IMeResponse } from "@/client/lib/types";
import { getSessionUser, getToken, onSessionChange, signOut as sessionSignOut } from "./session";

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  /** Signed in with a verified phone, but no account yet: registration is next. */
  | { status: "unregistered"; phone: string | null; displayName: string | null }
  | { status: "ready"; me: IMeResponse }
  | { status: "error"; message: string };

interface AuthContextValue {
  state: AuthState;
  /** Re-run the session -> account lookup (after sign-in, registration or profile edits). */
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

setTokenSource(getToken);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const reload = useCallback(async () => {
    try {
      if (!(await getToken())) return setState({ status: "anonymous" });
      const me = await api<IMeResponse>("/api/me");
      setState({ status: "ready", me });
    } catch (err) {
      if (err instanceof ApiError && err.code === "ACCOUNT_NOT_REGISTERED") {
        const user = await getSessionUser();
        return setState({ status: "unregistered", phone: user?.phone ?? null, displayName: user?.displayName ?? null });
      }
      if (err instanceof ApiError && err.status === 401) {
        await sessionSignOut();
        return setState({ status: "anonymous" });
      }
      setState({ status: "error", message: errorMessage(err) });
    }
  }, []);

  useEffect(() => {
    let off = () => {};
    let cancelled = false;
    const first = setTimeout(() => void reload(), 0);
    void onSessionChange(() => void reload()).then((unsub) => {
      if (cancelled) unsub();
      else off = unsub;
    });
    return () => {
      clearTimeout(first);
      cancelled = true;
      off();
    };
  }, [reload]);

  const signOut = useCallback(async () => {
    await sessionSignOut();
    setState({ status: "anonymous" });
  }, []);

  const value = useMemo(() => ({ state, reload, signOut }), [state, reload, signOut]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For screens behind <RequireAccount>. */
export function useMe(): IMeResponse {
  const { state } = useAuth();
  if (state.status !== "ready") throw new Error("useMe used outside <RequireAccount>");
  return state.me;
}

/** `/auth?next=…` for a path inside the app. */
export const loginUrl = (next: string) => `/auth?next=${encodeURIComponent(next)}`;

/** Only same-origin absolute paths; anything else falls back to the dashboard. */
export const safeNext = (next: string | null | undefined, fallback = "/dashboard") =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
