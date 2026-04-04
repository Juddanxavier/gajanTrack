"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

function ThemeSync() {
  const user = useQuery(api.users.queries.getCurrentUser, {});
  const { setTheme, theme } = useTheme();

  React.useEffect(() => {
    // Note: ensure we don't spam updates if it perfectly matches
    if (user?.preferences?.theme && user.preferences.theme !== theme) {
      setTheme(user.preferences.theme);
    }
  }, [user?.preferences?.theme, theme, setTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeSync />
      {children}
    </NextThemesProvider>
  )
}

