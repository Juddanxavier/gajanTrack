'use client';

import * as React from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrg } from '@/components/providers/org-provider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconLoader2, IconBriefcase, IconBuilding } from '@tabler/icons-react';

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'staff', 'customer']),
  orgId: z.string().min(1, 'Organization is required'),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  children: React.ReactNode;
}

export function CreateUserDialog({ children }: CreateUserDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { sessionId } = useOrg();
  const currentUser = useQuery(api.users.getCurrentUser, { sessionId });
  const organizations = useQuery(api.organizations.listOrganizations, { sessionId });
  const createUserAction = useAction(api.clerk.createUser);

  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      name: '',
      phone: '',
      role: 'customer',
      orgId: '',
    },
  });

  // Set default / fixed values based on role
  React.useEffect(() => {
    if (isStaff && currentUser?.orgId) {
      const orgIdStr = currentUser.orgId as string;
      form.setValue('orgId', orgIdStr);
      form.setValue('role', 'customer');
    } else if (isAdmin && organizations?.[0]) {
        if (!form.getValues('orgId')) {
          form.setValue('orgId', organizations[0]._id);
        }
    }
  }, [currentUser, organizations, form, isStaff, isAdmin]);

  async function onSubmit(values: CreateUserFormValues) {
    try {
      await createUserAction({
        ...values,
        sessionId,
      });
      toast.success('Professional Invitation Sent', {
        description: `An invitation has been sent to ${values.email}. They will be onboarded as a ${values.role}.`,
      });
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error('Provisioning Failed', {
        description: error.message || 'Something went away wrong while creating the user.',
      });
    }
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            {isStaff 
              ? "Provision a new customer account for your organization." 
              : "Provision a new member to the platform. We'll send them a secure invitation link to join."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 234 567 890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAdmin ? (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="orgId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select org" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
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
            ) : (
              // For Staff, we hide the selectors but show informative read-only icons/badges
              <div className="flex items-center gap-6 p-3 bg-muted/30 rounded-lg border border-dashed">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <IconBriefcase className="size-4 text-primary" />
                  <span className="uppercase tracking-wide">Role:</span>
                  <span className="text-foreground capitalize font-semibold">Customer</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <IconBuilding className="size-4 text-primary" />
                  <span className="uppercase tracking-wide">Org:</span>
                  <span className="text-foreground font-semibold truncate max-w-[120px]">
                    {organizations?.find(o => o._id === form.getValues('orgId'))?.name || 'Assigned Org'}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading && <IconLoader2 className="size-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
