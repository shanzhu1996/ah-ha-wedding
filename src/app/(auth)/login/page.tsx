"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Mail, Lock, User, ArrowRight, MailCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSignup = searchParams.get("signup") === "true";
  const [mode, setMode] = useState<"login" | "signup">(
    isSignup ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [duplicateEmail, setDuplicateEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(
    null
  );
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const supabase = createClient();

  // While the user is staring at the "Check your email" card, watch for
  // a session to appear — handles the case where they confirm in the
  // SAME browser (different tab) and never refresh this one. Cross-device
  // confirms (mobile email app → mobile browser) don't fire here, but
  // those users are already on the new device.
  useEffect(() => {
    if (!pendingConfirmEmail) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.push("/onboarding?welcome=true");
      }
    });
    return () => subscription.unsubscribe();
  }, [pendingConfirmEmail, supabase, router]);

  function switchMode(next: "login" | "signup") {
    setMode(next);
    setError("");
    setDuplicateEmail(false);
    setPendingConfirmEmail(null);
    setResendStatus(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDuplicateEmail(false);
    setResendStatus(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: `${window.location.origin}/callback`,
          },
        });
        if (error) throw error;
        if (data?.user && data.user.identities?.length === 0) {
          setDuplicateEmail(true);
          return;
        }
        // Email confirmation enabled: signUp returns no session until the
        // user clicks the link. Show a check-your-inbox card instead of
        // redirecting (they'd just get bounced back by middleware).
        if (!data.session) {
          setPendingConfirmEmail(email);
          return;
        }
        router.push("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // Surface the same check-your-inbox UI so the user has a path
          // forward (resend) instead of a raw error string.
          if (/email not confirmed/i.test(error.message)) {
            setPendingConfirmEmail(email);
            return;
          }
          throw error;
        }
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingConfirmEmail) return;
    setResending(true);
    setResendStatus(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingConfirmEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });
      if (error) {
        setResendStatus(error.message);
      } else {
        setResendStatus("Sent — check your inbox (and spam folder).");
      }
    } finally {
      setResending(false);
    }
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/30">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <span className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              Ah-Ha!
            </span>
          </Link>
          <p className="text-muted-foreground mt-2">
            {pendingConfirmEmail
              ? "Check your email"
              : mode === "signup"
              ? "Create your account"
              : "Welcome back"}
          </p>
        </div>

        {pendingConfirmEmail ? (
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mx-auto">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm">We sent a confirmation link to</p>
              <p className="font-medium text-sm break-all">
                {pendingConfirmEmail}
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                Click the link in the email to finish creating your account.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? "Sending..." : "Resend email"}
            </Button>
            {resendStatus && (
              <p className="text-xs text-center text-muted-foreground">
                {resendStatus}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setPendingConfirmEmail(null);
                setResendStatus(null);
                setPassword("");
              }}
              className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full gap-2 mb-4"
            onClick={handleGoogleLogin}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-4">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {duplicateEmail && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-2">
                <p>This email is already registered.</p>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setDuplicateEmail(false);
                    setPassword("");
                  }}
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1"
                >
                  Log in instead
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {error && !duplicateEmail && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                "Loading..."
              ) : mode === "signup" ? (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => switchMode("signup")}
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => switchMode("login")}
                className="text-primary font-medium hover:underline"
              >
                Log in
              </button>
            </>
          )}
        </p>
          </>
        )}
      </div>
    </div>
  );
}
