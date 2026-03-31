'use client';

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ProfileForm } from "@/components/settings/profile-form";
import { OrgForm } from "@/components/settings/org-form";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/components/providers/org-provider";
import { User, Building2, Bell, Palette } from "lucide-react";

export default function SettingsPage() {
  const { sessionId, session, isLoading: isOrgLoading } = useOrg();
  const settings = useQuery(api.organizations.queries.getSettings, 
    (sessionId && session) ? { sessionId } : "skip"
  );

  if (isOrgLoading || (sessionId && !session) || settings === undefined) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-12">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Failed to load settings. Please ensure you are logged in.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and organization preferences.
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-12">
        <aside className="md:w-[250px]">
          <TabsList className="bg-transparent flex flex-col items-stretch h-auto p-0 gap-1 space-y-1">
            <TabsTrigger 
              value="profile"
              className="flex items-center justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground justify-start"
            >
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="organization"
              className="flex items-center justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground justify-start"
            >
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger 
              value="notifications"
              className="flex items-center justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground justify-start"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="appearance"
              className="flex items-center justify-start gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted data-[state=active]:bg-muted data-[state=active]:text-foreground justify-start"
            >
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
          </TabsList>
        </aside>

        <div className="flex-1">
          <TabsContent value="profile" className="m-0 border-none p-0 outline-none">
            <ProfileForm initialData={settings.user} sessionId={sessionId} />
          </TabsContent>
          <TabsContent value="organization" className="m-0 border-none p-0 outline-none">
            <OrgForm organization={settings.organization} sessionId={sessionId} />
          </TabsContent>
          <TabsContent value="notifications" className="m-0 border-none p-0 outline-none">
            <NotificationsForm organization={settings.organization} sessionId={sessionId} />
          </TabsContent>
          <TabsContent value="appearance" className="m-0 border-none p-0 outline-none">
            <AppearanceForm initialData={settings.user} sessionId={sessionId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

