import type { Role } from "@/lib/auth/types";

export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Role; // Legacy custom role (if any)
    };
    org_id?: string;
    org_role?: string;
  }
}
