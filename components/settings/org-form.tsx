'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";

const orgFormSchema = z.object({
  name: z.string().min(2, { message: "Organization name must be at least 2 characters." }),
  slug: z.string().min(2, { message: "Slug must be at least 2 characters." }),
  currency: z.string().min(1, { message: "Please select a currency." }),
  country: z.string().min(1, { message: "Please select a country." }),
  logoUrl: z.string().url().optional().or(z.literal("")),
  publicDomain: z.string().optional().or(z.literal("")),
});

type OrgFormValues = z.infer<typeof orgFormSchema>;

export function OrgForm({ organization, sessionId }: { organization: any; sessionId?: string }) {
  const updateOrg = useMutation(api.settings.updateOrgSettings);

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgFormSchema),
    defaultValues: {
      name: organization?.name || "",
      slug: organization?.slug || "",
      currency: organization?.currency || "INR",
      country: organization?.country || "India",
      logoUrl: organization?.logoUrl || "",
      publicDomain: organization?.publicDomain || "",
    },
  });

  async function onSubmit(data: OrgFormValues) {
    try {
      await updateOrg({
        orgId: organization._id as Id<"organizations">,
        sessionId,
        name: data.name,
        slug: data.slug,
        currency: data.currency,
        country: data.country,
        logoUrl: data.logoUrl,
        publicDomain: data.publicDomain,
      });
      toast.success("Organization settings updated successfully");
    } catch (error) {
      toast.error("Failed to update organization settings");
      console.error(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>
          Manage your organization&apos;s public profile and operational defaults.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Logistics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="acme-logistics" {...field} />
                    </FormControl>
                    <FormDescription>Used for organization identification.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                        <SelectItem value="LKR">Sri Lankan Rupee (LKR)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="publicDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Public Tracking Domain</FormLabel>
                    <FormControl>
                      <Input placeholder="track.in" {...field} />
                    </FormControl>
                    <FormDescription>
                      Regional domain for customer tracking links.
                    </FormDescription>
                    <FormMessage />
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
