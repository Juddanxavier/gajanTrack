"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Box, Loader2 } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signIn, setActive } = useSignIn() as any;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // If already signed in, redirect to dashboard
  if (isLoaded && isSignedIn) {
    router.push("/dashboard");
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Session active, redirecting...</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Initializing Security...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await (signIn as any).create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      } else {
        setError("Something went wrong. Please check your credentials.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: "google") {
    if (!signIn) return;
    setLoading(true);
    try {
      await (signIn as any).authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/api/auth/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to start social login");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
      
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="mb-4 flex items-center justify-center space-x-2">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Box className="size-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic">KAJEN <span className="text-primary not-italic underline decoration-primary/30">TRACK</span></span>
          </Link>
        </div>

        <LoginForm 
          onSubmit={handleSubmit}
          onSocialLogin={handleSocialLogin}
          loading={loading}
          error={error}
          className="bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/40 shadow-xl"
        />
      </div>
    </div>
  );
}

