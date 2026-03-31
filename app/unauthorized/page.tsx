import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-background">
      <div className="mx-auto max-w-md text-center space-y-6 p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Access Restricted
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your account does not have permission to access this application.
            Only <span className="text-foreground font-medium">admin</span> and{' '}
            <span className="text-foreground font-medium">staff</span> members can log in.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please contact your administrator.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

