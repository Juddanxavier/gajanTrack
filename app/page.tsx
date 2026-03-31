/** @format */

'use client';

import { useAuth, SignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Box, Loader2 } from 'lucide-react';

export default function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  // If already signed in, redirect to dashboard
  if (isLoaded && isSignedIn) {
    router.push('/dashboard');
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary mb-4' />
        <p className='text-muted-foreground animate-pulse'>
          Session active, redirecting...
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary mb-4' />
        <p className='text-muted-foreground animate-pulse uppercase tracking-widest text-xs'></p>
      </div>
    );
  }

  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='flex flex-col gap-4 p-6 md:p-10 bg-background'>
        <div className='flex justify-center gap-2 md:justify-start'>
          <div className='flex items-center justify-center space-x-2'>
            <div className='size-8 bg-primary rounded-lg flex items-center justify-center'>
              <Box className='size-5 text-primary-foreground' />
            </div>
            <span className='text-xl tracking-tighter italic uppercase'>
              {(process.env.NEXT_PUBLIC_APP_NAME || 'GT Express').split(' ')[0]}{' '}
              <span className='text-primary tracking-normal not-italic underline decoration-primary/30'>
                {(process.env.NEXT_PUBLIC_APP_NAME || 'GT Express')
                  .split(' ')
                  .slice(1)
                  .join(' ')}
              </span>
            </span>
          </div>
        </div>
        <div className='flex flex-1 items-center justify-center py-12'>
          <div className='w-full max-w-sm'>
            <SignIn
              appearance={{
                elements: {
                  formButtonPrimary:
                    'bg-primary hover:bg-primary/90 text-primary-foreground',
                  card: 'shadow-none border-none bg-transparent',
                  headerTitle: 'text-2xl tracking-tight',
                  headerSubtitle: 'text-sm text-muted-foreground',
                },
              }}
            />
          </div>
        </div>
      </div>
      <div className='relative hidden bg-muted lg:block overflow-hidden border-l border-border/40'>
        <img
          src='/login-bg.png'
          alt='Professional Logistics Hub'
          className='absolute inset-0 h-full w-full object-cover brightness-[0.8] contrast-[1.1]'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60' />
        <div className='absolute bottom-12 left-12 right-12'>
          <div className='p-8 rounded-2xl bg-background/10 backdrop-blur-md border border-white/10 shadow-2xl space-y-4'>
            <div className='h-px w-12 bg-primary' />
            <h2 className='text-3xl text-white tracking-tight leading-tight'>
              Global Visibility.
              <span className='text-primary'>Real-Time</span> Intelligence.
            </h2>
            <p className='text-white/60 text-sm leading-relaxed max-w-md'>
              Empowering your logistics chain with industrial-grade tracking and
              automated analytics. Integrated with the world's leading carriers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
