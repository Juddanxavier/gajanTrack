"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid administrator email.",
  }),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordFormProps {
  onSubmit: (values: ForgotPasswordValues) => void
  loading?: boolean
  error?: string
}

export function ForgotPasswordForm({
  onSubmit,
  loading,
  error,
}: ForgotPasswordFormProps) {
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl tracking-tight">Recover Account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your administrator email to receive a reset code
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
            name="email"
            render={({ field }) => (
              <FormItem className="grid gap-2 space-y-0">
                <FormLabel className="text-xs opacity-70">Administrator Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="admin@kajen.track" 
                    {...field} 
                    disabled={loading}
                    className="h-11 bg-muted/50 border-border/40 focus:bg-background transition-all font-normal"
                  />
                </FormControl>
                <FormMessage className="text-[10px]" />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Code
          </Button>
          
          <div className="text-center">
            <Link 
              href="/sign-in" 
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign in
            </Link>
          </div>
        </div>
      </form>
    </Form>
  )
}
