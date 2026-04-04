"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const updateSettings = useMutation(api.users.mutations.updateUserSettings);

  const handleToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    // Sync to backend without blocking UI
    updateSettings({ preferences: { theme: newTheme } as any }).catch(console.error);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 rounded-md border border-border/40 bg-background/50 backdrop-blur-sm hover:bg-accent transition-all"
      onClick={handleToggle}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

