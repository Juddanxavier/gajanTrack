"use client";

import { useAuth, useUser, useClerk } from "@clerk/nextjs";

/**
 * Auth Session Helper Hook
 */
export function useAuthSession() {
  const { isLoaded, userId, sessionId, getToken } = useAuth();
  return { isLoaded, userId, sessionId, getToken };
}


/**
 * Current User Helper Hook
 */
export function useCurrentUser() {
  const { isLoaded: isAuthLoaded } = useAuth();
  const { user } = useUser() as any;
  
  const mappedUser = user ? {
    id: user.id,
    name: user.fullName || user.username || "User",
    email: user.primaryEmailAddress?.emailAddress || "",
    avatar: user.imageUrl,
  } : null;

  return { isLoaded: isAuthLoaded, user: mappedUser };
}



/**
 * Auth Control Helpers
 */
export function useAuthActions() {
  const { signOut, openUserProfile } = useClerk();
  return { signOut, openUserProfile };
}
