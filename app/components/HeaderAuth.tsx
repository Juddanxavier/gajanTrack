"use client";

import { useUser, SignOutButton, useAuth } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, User, Settings, CreditCard, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

/**
 * HeaderAuth Component
 * Updated to use Clerk for user avatar and sign-out.
 */
export function HeaderAuth() {
  const { isLoaded } = useAuth();
  const { user } = useUser() as any;
  const router = useRouter();

  if (!isLoaded || !user) {
    return null;
  }

  const initials = `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`;

  return (
    <div className='flex items-center gap-4'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-auto flex items-center gap-3 px-2 hover:bg-accent/50 transition-all rounded-lg">
            <div className="flex flex-col items-end mr-1 hidden sm:flex pointer-events-none">
              <span className="text-xs font-black leading-none tracking-tight">{user.fullName}</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-1 opacity-70">Pro Account</span>
            </div>
            <Avatar className="h-8 w-8 border border-border/40 shadow-sm transition-transform group-hover:scale-105">
              <AvatarImage src={user.imageUrl} alt={user.fullName || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl p-2" align="end" forceMount>
          <DropdownMenuLabel className="font-normal p-2">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-black leading-none tracking-tight">{user.fullName}</p>
              <p className="text-xs leading-none text-muted-foreground opacity-70">
                {user.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border/40 my-1" />
          <DropdownMenuGroup>
            <DropdownMenuItem className="flex items-center gap-3 p-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors rounded-lg">
              <User className="h-4 w-4 opacity-70" />
              <span className="text-xs font-bold uppercase tracking-widest">Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-3 p-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors rounded-lg">
              <CreditCard className="h-4 w-4 opacity-70" />
              <span className="text-xs font-bold uppercase tracking-widest">Billing & Plans</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-3 p-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors rounded-lg">
              <Settings className="h-4 w-4 opacity-70" />
              <span className="text-xs font-bold uppercase tracking-widest">App Preferences</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-border/40 my-1" />
          <DropdownMenuItem className="flex items-center gap-3 p-2 cursor-pointer focus:bg-primary/5 focus:text-primary transition-colors rounded-lg">
               <Sparkles className="h-4 w-4 text-amber-500" />
               <span className="text-xs font-black uppercase tracking-widest">Try Premium</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-border/40 my-1" />
          <SignOutButton redirectUrl="/">
            <DropdownMenuItem className="flex items-center gap-3 p-2 cursor-pointer text-rose-500 hover:text-rose-600 focus:bg-rose-500/5 transition-colors rounded-lg">
              <LogOut className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Sign out</span>
            </DropdownMenuItem>
          </SignOutButton>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
