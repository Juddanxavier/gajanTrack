"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { getSessionId } from "@/lib/session";

interface OrgContextType {
  activeOrgId: Id<"organizations"> | null;
  setActiveOrgId: (id: Id<"organizations">) => void;
  organizations: Doc<"organizations">[];
  activeOrg: Doc<"organizations"> | null;
  isLoading: boolean;
  sessionId: string;
  session: Doc<"sessions"> | null;
  isSyncing: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const sessionId = useMemo(() => getSessionId(), []);
  const [activeOrgId, setActiveOrgId] = useState<Id<"organizations"> | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeOrgId") as Id<"organizations"> | null;
    }
    return null;
  });

  // Persist org selection
  useEffect(() => {
    if (activeOrgId) {
      localStorage.setItem("activeOrgId", activeOrgId);
    }
  }, [activeOrgId]);
  
  const currentUser = useQuery(api.users.queries.getCurrentUser, isSignedIn ? { sessionId } : "skip");
  const organizationsData = useQuery(api.organizations.queries.listOrganizations, isSignedIn ? { sessionId } : "skip") as Doc<"organizations">[] | undefined;
  const sessionData = useQuery(api.sessions.getCurrentSession, isSignedIn ? { sessionId } : "skip");
  const touchSession = useMutation(api.sessions.touchSession);
  const ensureDefaultOrg = useMutation(api.users.mutations.ensureDefaultOrganization);
  
  const organizations = (organizationsData || []) as Doc<"organizations">[];
  
  // A user is "syncing" if they are signed into Clerk but Convex hasn't found them yet
  const isSyncing = isClerkLoaded && isSignedIn && currentUser === null;
  const isLoading = !isClerkLoaded || currentUser === undefined || organizationsData === undefined;

  // JIT Sync logic removed as user synchronization is handled by Clerk webhooks.

  // Sync session on mount and when org changes
  useEffect(() => {
    if (isClerkLoaded && isSignedIn) {
      touchSession({ 
        sessionId, 
        orgId: activeOrgId || undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined
      }).catch((err) => {
        console.error("Failed to sync session context:", err);
      });
    }
  }, [isClerkLoaded, isSignedIn, activeOrgId, sessionId, touchSession]);

  useEffect(() => {
    if (!isLoading && currentUser) {
      // Only set initial org if not already selected
      // This allows Admins to switch organizations without being reset
      if (!activeOrgId) {
        if (currentUser.orgId) {
          setActiveOrgId(currentUser.orgId as any);
        } else if (currentUser.role === "admin") {
          // Force ensure a default org for admins if they have none
          ensureDefaultOrg({ sessionId }).then(res => {
            if (res?.orgId) {
              setActiveOrgId(res.orgId as any);
              toast.success(`Organization Ready: ${res.name}`);
            }
          }).catch(err => {
              console.error("[OrgProvider] Failed to ensure default org:", err);
              toast.error("Cloud Context: Failed to initialize organization");
          });
        }
      }
    }
  }, [isLoading, currentUser, activeOrgId, ensureDefaultOrg, sessionId]);

  const activeOrg = organizations.find(org => org._id === (activeOrgId as any)) || null;

  return (
    <OrgContext.Provider 
      value={{ 
        activeOrgId, 
        setActiveOrgId, 
        organizations, 
        activeOrg,
        isLoading,
        sessionId,
        session: sessionData || null,
        isSyncing // Added to the context
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}

