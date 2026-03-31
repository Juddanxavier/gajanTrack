import { SignInButton } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const signinSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid administrator email.",
  }),
  password: z.string().min(5, {
    message: "Password must be at least 5 characters.",
  }),
})

type SigninValues = z.infer<typeof signinSchema>

interface LoginFormProps extends Omit<React.ComponentPropsWithoutRef<"form">, "onSubmit"> {
  onSubmit: (values: SigninValues) => void
  loading?: boolean
  error?: string
}

export function LoginForm({
  className,
  onSubmit,
  loading,
  error,
  ...props
}: LoginFormProps) {
  const form = useForm<SigninValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl tracking-tight">System Login</h1>
          <p className="text-sm text-muted-foreground">
            Enter credentials to access the tracking vault
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
                    className="h-11 bg-muted/50 border-border/40 focus:bg-background transition-all"
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
                <div className="flex items-center">
                  <FormLabel className="text-xs opacity-70">Password</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-xs underline-offset-4 hover:underline text-muted-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
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
            Sign in
          </Button>
          
          <div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
          
          <SignInButton mode="redirect" forceRedirectUrl="/dashboard">
            <Button 
              type="button"
              variant="outline" 
              className="w-full h-11 border-border/40 hover:bg-muted/50 transition-all" 
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
              Sign in with Google
            </Button>
          </SignInButton>
        </div>
      </form>
    </Form>
  )
}
