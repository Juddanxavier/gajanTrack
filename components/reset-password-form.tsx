"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft } from "lucide-react"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const resetPasswordSchema = z.object({
  code: z.string().min(6, {
    message: "Verification code must be at least 6 characters.",
  }),
  password: z.string().min(8, {
    message: "New password must be at least 8 characters.",
  }),
})

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

interface ResetPasswordFormProps {
  onSubmit: (values: ResetPasswordValues) => void
  onBack: () => void
  loading?: boolean
  error?: string
}

export function ResetPasswordForm({
  onSubmit,
  onBack,
  loading,
  error,
}: ResetPasswordFormProps) {
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      code: "",
      password: "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl tracking-tight">Set New Password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to your email and your new password
          </p>
        </div>
        <div className="grid gap-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}
          
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="grid gap-2 space-y-0">
                <FormLabel className="text-xs opacity-70">Verification Code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="123456" 
                    {...field} 
                    disabled={loading}
                    className="h-11 bg-muted/50 border-border/40 focus:bg-background transition-all text-center tracking-widest font-mono"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem className="grid gap-2 space-y-0">
                <FormLabel className="text-xs opacity-70">New Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    {...field} 
                    disabled={loading}
                    className="h-11 bg-muted/50 border-border/40 focus:bg-background transition-all"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
          
          <div className="text-center">
            <button 
              type="button"
              onClick={onBack}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change email
            </button>
          </div>
        </div>
      </form>
    </Form>
  )
}
