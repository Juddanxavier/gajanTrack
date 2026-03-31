"use client";

import { useOrg } from "@/components/providers/org-provider";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";

export function OrgSwitcher() {
  const { activeOrgId, setActiveOrgId, organizations, activeOrg, sessionId } = useOrg();
  const currentUser = useQuery(api.users.queries.getCurrentUser, { sessionId });

  // If user is not an admin, they can't switch orgs
  if (currentUser?.role !== "admin") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{activeOrg?.name || "Select Org"}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org._id}
            onClick={() => setActiveOrgId(org._id)}
            className="flex items-center justify-between"
          >
            {org.name}
            {org._id === activeOrgId && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

