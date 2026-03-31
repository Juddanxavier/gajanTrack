'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Id } from "@/convex/_generated/dataModel";

const notificationsFormSchema = z.object({
  email: z.boolean(),
  whatsapp: z.boolean(),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

export function NotificationsForm({ organization, sessionId }: { organization: any; sessionId?: string }) {
  const updateOrg = useMutation(api.organizations.mutations.updateOrgSettings);

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      email: organization?.notificationDefaults?.email ?? true,
      whatsapp: organization?.notificationDefaults?.whatsapp ?? false,
    },
  });

  async function onSubmit(data: NotificationsFormValues) {
    if (!organization?._id) {
      toast.error("Organization ID not found. Please refresh the page.");
      return;
    }

    try {
      await updateOrg({
        orgId: organization._id as Id<"organizations">,
        sessionId,
        notificationDefaults: {
          email: data.email,
          whatsapp: data.whatsapp,
        },
      });
      toast.success("Notification settings updated successfully");
    } catch (error: any) {
      const message = error?.message || "Failed to update notification settings";
      toast.error(message);
      console.error("[NotificationsForm] Error:", error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Notifications</CardTitle>
        <CardDescription>
          Set the default notification channels for all shipments in your organization.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Email Notifications</FormLabel>
                      <FormDescription>
                        Send automated status updates via email.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>WhatsApp Notifications</FormLabel>
                      <FormDescription>
                        Send automated status updates via WhatsApp.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

