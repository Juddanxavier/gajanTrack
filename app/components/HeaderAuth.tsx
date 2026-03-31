import { UserButton, useAuth } from "@clerk/nextjs";

/**
 * HeaderAuth Component
 * Updated to use the stable Clerk UserButton for a consistent and reliable experience.
 */
export function HeaderAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className='flex items-center gap-4'>
      <UserButton 
        afterSignOutUrl="/"
        appearance={{
          elements: {
            userButtonTrigger: "hover:bg-accent/50 transition-all rounded-lg p-1",
            userButtonAvatarBox: "h-8 w-8 border border-border/40 shadow-sm",
          },
        }}
      />
    </div>
  );
}

