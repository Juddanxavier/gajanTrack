'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconLoader2, IconDeviceFloppy, IconShieldCheck, IconBuilding, IconPhone, IconUser } from '@tabler/icons-react';
import { useOrg } from '@/components/providers/org-provider';
import { getCountryConfig } from '@/lib/countries';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'staff', 'customer']),
  orgId: z.string().optional(),
});

interface EditUserFormProps {
  user: any;
  currentUser: any;
}

export function EditUserForm({ user, currentUser }: EditUserFormProps) {
  const { sessionId } = useOrg();
  const updateUser = useMutation(api.users.mutations.updateUser);
  const organizations = useQuery(api.organizations.queries.listOrganizations, { sessionId });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user.name || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      orgId: typeof user.orgId === 'string' ? user.orgId : user.orgId?._id || 'none',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await updateUser({
        userId: user._id,
        sessionId,
        name: values.name,
        phone: values.phone,
        role: values.role as any,
        orgId: values.orgId === 'none' ? undefined : values.orgId,
      });
      toast.success('Identity updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user');
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isEditingAdmin = user.role === 'admin';
  const canChangeRole = isAdmin && (!isEditingAdmin || user._id === currentUser._id || isAdmin); 
  // Simplified logic: Admins can change anyone's role. Staff can't use this form based on RBAC in mutation, but we should reflect it in UI.
  
  const isPending = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Full Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <IconUser className="absolute left-3 top-3 size-4 text-muted-foreground/40" />
                    <Input {...field} className="pl-10 h-11 bg-background/50 border-border/40 focus:border-primary/40 focus:ring-primary/10 transition-all" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => {
              const selectedOrgId = form.watch('orgId');
              const selectedOrg = organizations?.find((o: any) => o._id === selectedOrgId);
              const countryConfig = getCountryConfig(selectedOrg?.country);

              return (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Contact Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <IconPhone className="absolute left-3 top-3 size-4 text-muted-foreground/40" />
                      <Input 
                        {...field} 
                        placeholder={countryConfig.placeholder} 
                        className="pl-10 h-11 bg-background/50 border-border/40 focus:border-primary/40 focus:ring-primary/10 transition-all font-mono" 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Role */}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Access Level</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={!isAdmin || (user.role === 'admin' && currentUser?.role !== 'admin')}
                >
                  <FormControl>
                    <SelectTrigger className="h-11 bg-background/50 border-border/40 focus:border-primary/40 focus:ring-primary/10 transition-all">
                      <div className="flex items-center gap-2">
                        <IconShieldCheck className="size-4 text-primary/40" />
                        <SelectValue placeholder="Select a role" />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="customer">Customer (Default)</SelectItem>
                    <SelectItem value="staff">Staff (Operational)</SelectItem>
                    <SelectItem value="admin">Administrator (Global)</SelectItem>
                  </SelectContent>
                </Select>
                {!isAdmin && (
                  <FormDescription className="text-[10px] italic">
                    Requires administrator privileges to modify.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Organization */}
          <FormField
            control={form.control}
            name="orgId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Assigned Organization</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-11 bg-background/50 border-border/40 focus:border-primary/40 focus:ring-primary/10 transition-all">
                      <div className="flex items-center gap-2">
                        <IconBuilding className="size-4 text-amber-500/40" />
                        <SelectValue placeholder="Select an organization" />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None (Global Access)</SelectItem>
                    {organizations?.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button 
            type="submit" 
            disabled={isPending}
            className="gap-2 h-11 px-8 font-bold uppercase tracking-widest text-[10px] shadow-xl hover:shadow-primary/20 transition-all"
          >
            {isPending ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="size-4" />
            )}
            Persist Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
