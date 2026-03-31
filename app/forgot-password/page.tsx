"use client"

import { useState } from "react"
import { useSignIn, useAuth, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Box, Loader2 } from "lucide-react"
import Link from "next/link"
import { ForgotPasswordForm } from "@/components/forgot-password-form"
import { ResetPasswordForm } from "@/components/reset-password-form"

export default function ForgotPasswordPage() {
  const { isLoaded: authLoaded, isSignedIn } = useAuth()
  const { signIn, fetchStatus } = useSignIn()
  const { setActive } = useClerk()
  const router = useRouter()

  const isLoaded = authLoaded && fetchStatus !== "fetching"

  const [step, setStep] = useState<"request" | "reset">("request")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Handle Step 1: Request code
  async function handleRequestCode(values: { email: string }) {
    if (!signIn) return
    setLoading(true)
    setError("")

    try {
      await (signIn as any).create({
        strategy: "reset_password_email_code",
        identifier: values.email,
      })
      setStep("reset")
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Failed to send reset code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle Step 2: Reset password
  async function handleResetPassword(values: { code: string; password: string }) {
    if (!signIn) return
    setLoading(true)
    setError("")

    try {
      const result = await (signIn as any).attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: values.code,
        password: values.password,
      })

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId })
        router.push("/dashboard")
      } else {
        setError("Something went wrong. Please check your verification code.")
      }
    } catch (err: any) {
      console.error("Clerk Reset Error:", err);
      const message = err.errors?.[0]?.message || "Failed to reset password. Please check your code.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse uppercase tracking-widest text-xs">Initializing Security...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Link className="flex items-center justify-center space-x-2 group transition-all" href="/">
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
               <Box className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl tracking-tighter italic">KAJEN <span className="text-primary tracking-normal not-italic underline decoration-primary/30">TRACK</span></span>
          </Link>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-sm">
          {step === "request" ? (
            <ForgotPasswordForm 
              onSubmit={handleRequestCode}
              loading={loading}
              error={error}
            />
          ) : (
            <ResetPasswordForm 
              onSubmit={handleResetPassword}
              onBack={() => setStep("request")}
              loading={loading}
              error={error}
            />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          &copy; 2026 Kajen Track. Industrial-grade logistics monitoring.
        </p>
      </div>
    </div>
  )
}
