'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Moon, Sun, Monitor } from "lucide-react";

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"], {
    required_error: "Please select a theme.",
  }),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

export function AppearanceForm({ initialData, sessionId }: { initialData: any, sessionId?: string }) {
  const { setTheme } = useTheme();
  const updatePreferences = useMutation(api.settings.updateUserSettings);

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: initialData?.preferences?.theme || "system",
    },
  });

  async function onSubmit(data: AppearanceFormValues) {
    try {
      setTheme(data.theme);
      await updatePreferences({
        sessionId,
        preferences: {
          theme: data.theme as "light" | "dark" | "system",
        },
      });
      toast.success("Appearance settings updated");
    } catch (error) {
      toast.error("Failed to save appearance settings");
      console.error(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize the look and feel of the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Theme</FormLabel>
                  <FormDescription>
                    Select the theme for the dashboard.
                  </FormDescription>
                  <FormMessage />
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid max-w-md grid-cols-3 gap-8 pt-2"
                  >
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="light" className="sr-only" />
                        </FormControl>
                        <div className="items-center rounded-md border-2 border-muted p-1 hover:border-accent flex flex-col gap-2 cursor-pointer transition-all">
                          <div className="space-y-2 rounded-sm bg-[#ecedef] p-2 w-full">
                            <Sun className="h-4 w-4" />
                            <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
                              <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                            </div>
                          </div>
                          <span className="block w-full p-2 text-center font-normal">
                            Light
                          </span>
                        </div>
                      </FormLabel>
                    </FormItem>
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="dark" className="sr-only" />
                        </FormControl>
                        <div className="items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent flex flex-col gap-2 cursor-pointer transition-all">
                          <div className="space-y-2 rounded-sm bg-slate-950 p-2 w-full">
                            <Moon className="h-4 w-4 text-slate-400" />
                            <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                          </div>
                          <span className="block w-full p-2 text-center font-normal">
                            Dark
                          </span>
                        </div>
                      </FormLabel>
                    </FormItem>
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="system" className="sr-only" />
                        </FormControl>
                        <div className="items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent flex flex-col gap-2 cursor-pointer transition-all">
                          <div className="space-y-2 rounded-sm bg-slate-900 p-2 w-full">
                             <Monitor className="h-4 w-4 text-slate-400" />
                            <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
                              <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
                              <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
                            </div>
                          </div>
                          <span className="block w-full p-2 text-center font-normal">
                            System
                          </span>
                        </div>
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
