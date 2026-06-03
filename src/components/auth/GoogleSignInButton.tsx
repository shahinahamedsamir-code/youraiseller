"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import { loginWithGoogleProfile, syncDevUsersFromServer } from "@/lib/dev-users";
import { Loader2, ShieldCheck } from "lucide-react";
import clsx from "clsx";

function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type Props = {
  label?: string;
  variant?: "login" | "signup";
};

function GoogleSignInButtonInner({
  label = "Continue with Google",
  variant = "login",
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const completeSignIn = async (accessToken: string) => {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Google sign-in failed.");
      return;
    }

    // Pull the latest users (incl. invited team members) so login on any
    // device resolves them instead of creating a new signup request.
    await syncDevUsersFromServer(true);

    const result = loginWithGoogleProfile(
      {
        email: data.email,
        name: data.name,
        googleId: data.sub,
      },
      { mode: variant }
    );

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.redirect === "dashboard") {
      router.push("/dashboard");
    } else {
      router.push("/renew");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setLoading(true);
      try {
        await completeSignIn(tokenResponse.access_token);
      } catch {
        setError("Could not complete Google sign-in. Try again.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError("Google sign-in was cancelled or failed.");
      setLoading(false);
    },
    scope: "openid email profile",
  });

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setError("");
          googleLogin();
        }}
        className={clsx(
          "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition",
          "hover:border-slate-300 hover:shadow-md hover:shadow-slate-200/50",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500",
          "disabled:cursor-not-allowed disabled:opacity-70",
          variant === "signup" &&
            "border-teal-200/80 hover:border-teal-300 hover:shadow-teal-100/40"
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/80 to-transparent opacity-0 transition group-hover:opacity-100" />
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        ) : (
          <GoogleGIcon className="h-5 w-5 shrink-0" />
        )}
        <span>{loading ? "Signing in…" : label}</span>
      </button>

      <div className="flex items-start gap-2 rounded-xl bg-slate-50/90 px-3 py-2.5 text-left">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        <p className="text-xs leading-relaxed text-slate-600">
          {variant === "signup" ? (
            <>
              Your store account is created on first sign-in. An admin reviews
              new sellers before dashboard access is enabled.
            </>
          ) : (
            <>
              Secure sign-in with Google. New sellers wait for admin approval;
              active accounts go straight to the dashboard.
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          {error}
        </p>
      )}
    </div>
  );
}

export function GoogleSignInButton(props: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Google login not configured</p>
        <p className="mt-1 text-xs text-amber-800/90">
          Add GOOGLE_CLIENT_ID to .env.local (Google Cloud Console → OAuth client).
        </p>
      </div>
    );
  }

  return <GoogleSignInButtonInner {...props} />;
}
