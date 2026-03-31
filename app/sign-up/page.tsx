"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Box, Loader2, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signUp, setActive } = useSignUp() as any;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
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
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  async function handleSocialLogin(provider: "google") {
    if (!signUp) return;
    setLoading(true);
    try {
      await (signUp as any).authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/api/auth/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to start social signup");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await (signUp as any).create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      await (signUp as any).prepareEmailAddressVerification({ strategy: "email_code" });

      setPendingVerification(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  async function onPressVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const completeSignUp = await (signUp as any).attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status !== "complete") {
        setError("Verification failed. Please try again.");
      } else {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
        <Card className="w-full max-w-md border-border/40 bg-card/50 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We sent a verification code to {email}
            </CardDescription>
          </CardHeader>
          <form onSubmit={onPressVerify}>
            <CardContent className="space-y-4 text-center">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="code" className="sr-only">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background/50 h-12 text-center text-xl tracking-[0.5em] font-mono"
                  maxLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full font-bold h-11" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
      
      <Card className="w-full max-w-md border-border/40 bg-card/50 backdrop-blur-sm shadow-xl">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <Link href="/" className="mb-4 flex items-center justify-center space-x-2">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Box className="size-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-black tracking-tighter italic uppercase">
              {(process.env.NEXT_PUBLIC_APP_NAME || 'GT Express').split(' ')[0]}{" "}
              <span className="text-primary not-italic underline decoration-primary/30">
                {(process.env.NEXT_PUBLIC_APP_NAME || 'GT Express').split(' ').slice(1).join(' ')}
              </span>
            </span>
          </Link>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription>
            Enter your details to get started with {process.env.NEXT_PUBLIC_APP_NAME || 'GT Express'}
          </CardDescription>

        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={loading}
                  className="bg-background/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-background/50"
              />

            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full font-bold h-11" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>


            <div className="relative w-full text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
              <span className="relative z-10 bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>

            <Button 
              type="button"
              variant="outline" 
              className="w-full h-11" 
              onClick={() => handleSocialLogin("google")}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign up with Google
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}


