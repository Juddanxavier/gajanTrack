'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { getTracking } from 'ts-tracking-number';
import { useOrg } from '@/components/providers/org-provider';

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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Package, RefreshCw, Check, Users, ShieldCheck, Zap, Mail, MessageSquare } from 'lucide-react';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import couriersData from '@/lib/data/couriers.json';

const formSchema = z.object({
  tracking_number: z.string().min(1, 'Tracking number is required'),
  carrier_code: z.string().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  origin_country: z.string().min(1, 'Origin country is required'),
  provider: z.union([z.literal("trackingmore"), z.literal("track123"), z.literal("track17")]),
  live_track: z.boolean().default(true),
  email_notify: z.boolean().default(true),
  whatsapp_notify: z.boolean().default(true),
});

interface AddShipmentDialogProps {
  children?: React.ReactNode;
}

export function AddShipmentDialog({ children }: AddShipmentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [openCombobox, setOpenCombobox] = React.useState(false);
  const { activeOrgId: orgId, activeOrg, sessionId } = useOrg();
  const [carrierSearch, setCarrierSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [isDetecting, setIsDetecting] = React.useState(false);
  const [detectedCarrierName, setDetectedCarrierName] = React.useState<string | undefined>(undefined);


  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(carrierSearch), 300);
    return () => clearTimeout(timer);
  }, [carrierSearch]);

  const carrierResults = useQuery(api.tracking.carriers.search, { 
    query: debouncedSearch,
    limit: 20
  });

  const addAndTrack = useAction(api.shipments.addAndTrackShipment);

  const defaultCountry = 'india';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tracking_number: '',
      carrier_code: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      origin_country: defaultCountry,
      provider: "track17",
      live_track: true,
      email_notify: true,
      whatsapp_notify: true,
    },
});

  const watchTrackingNumber = form.watch('tracking_number');
  const watchEmail = form.watch('customer_email');
  const watchPhone = form.watch('customer_phone');

  React.useEffect(() => {
    console.log(`[DEBUG] watchTrackingNumber: "${watchTrackingNumber}" (Length: ${watchTrackingNumber?.length || 0})`);
  }, [watchTrackingNumber]);

  // Debounced Contact Lookup
  const [debouncedContact, setDebouncedContact] = React.useState("");
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedContact(watchEmail || watchPhone || "");
    }, 500);
    return () => clearTimeout(timer);
  }, [watchEmail, watchPhone]);

  const foundCustomer = useQuery(api.users.findCustomerByContact, 
    orgId && debouncedContact.length >= 3 
      ? { contact: debouncedContact, orgId, sessionId } 
      : "skip"
  );

  // Debounced Duplicate Tracking Check
  const [debouncedTrackingCheck, setDebouncedTrackingCheck] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTrackingCheck(watchTrackingNumber?.trim() || "");
    }, 500);
    return () => clearTimeout(timer);
  }, [watchTrackingNumber]);

  const isDuplicate = useQuery(api.shipments.checkTrackingExists, 
    orgId && debouncedTrackingCheck.length >= 5 
      ? { tracking_number: debouncedTrackingCheck, orgId, sessionId } 
      : "skip"
  );

  console.log(`[DEBUG] AddShipmentDialog - foundCustomer:`, foundCustomer);

  // Keep track of detected userId separately to avoid form reset issues
  const [detectedUserId, setDetectedUserId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (foundCustomer) {
      if (foundCustomer.isUser) {
        setDetectedUserId(foundCustomer.externalId);
      } else {
        setDetectedUserId(undefined);
      }
      
      const currentName = form.getValues('customer_name');
      const currentEmail = form.getValues('customer_email');
      const currentPhone = form.getValues('customer_phone');
      
      // Auto-fill fields if they are empty
      if (!currentName || currentName === '') {
        form.setValue('customer_name', foundCustomer.name || '');
      }
      
      if ((!currentEmail || currentEmail === '') && foundCustomer.email) {
        form.setValue('customer_email', foundCustomer.email);
      }
      
      if ((!currentPhone || currentPhone === '') && foundCustomer.phone) {
        form.setValue('customer_phone', foundCustomer.phone);
      }

      // If we just matched, show a toast once
      if (!detectedUserId && foundCustomer.name) {
        if (foundCustomer.isUser) {
          toast.success(`Registered user linked: ${foundCustomer.name}`);
        } else {
          toast.info(`Retrieved details for: ${foundCustomer.name}`);
        }
      }
    } else {
      setDetectedUserId(undefined);
    }
  }, [foundCustomer, form, detectedUserId]);

  const detectCarrier = useAction(api.shipments.detectCarrierAction);

  // Debounced server-side auto-detect carrier
  React.useEffect(() => {
    if (!watchTrackingNumber || watchTrackingNumber.trim() === '') {
      const currentCarrier = form.getValues('carrier_code');
      if (currentCarrier) {
        form.setValue('carrier_code', '');
        setDetectedCarrierName(undefined);
      }

      return;
    }

    if (watchTrackingNumber && watchTrackingNumber.trim().length >= 8) {
      // Immediate client-side check for faster feedback
      const localResult = getTracking(watchTrackingNumber.trim());
      if (localResult && localResult.courier && localResult.courier.name) {
        setDetectedCarrierName(localResult.courier.name);
      }

      const timeoutId = setTimeout(async () => {
        try {
          const currentCarrier = form.getValues('carrier_code');
          if (currentCarrier && currentCarrier !== "") return;
          
          setIsDetecting(true);
          const trackingNum = watchTrackingNumber.trim();
          console.log(`[AUTO-DETECT] Starting detection for ${trackingNum}...`);
          const result = await detectCarrier({ tracking_number: trackingNum });
          console.log(`[AUTO-DETECT] Result:`, result);
          
          if (result && result.carrierCode) {
            console.log(`[AUTO-DETECT] Found carrier: ${result.carrierCode} (${result.carrierName || 'unknown'}) via ${result.provider}`);
            form.setValue('carrier_code', result.carrierCode);
            if (result.carrierName) {
              setDetectedCarrierName(result.carrierName);
            }
            toast.success(`Carrier auto-detected: ${result.carrierName || result.carrierCode} (${result.provider})`);
          } else {
            console.log(`[AUTO-DETECT] No carrier found for ${trackingNum}`);
            // Only clear if the server definitely found nothing
            if (!localResult) setDetectedCarrierName(undefined);
          }
        } catch (e) {
          console.error("Auto-detect error:", e);
        } finally {
          setIsDetecting(false);
        }
      }, 400); // 400ms debounce (faster than 1s)
      return () => clearTimeout(timeoutId);
    }

  }, [watchTrackingNumber, form, detectCarrier]);

  // Update origin country based on active organization
  React.useEffect(() => {
    if (activeOrg?.country) {
      const countryValue = activeOrg.country.toLowerCase().replace(/\s/g, '');
      form.setValue('origin_country', countryValue);
    }
  }, [activeOrg, form]);

  const addManual = useMutation(api.shipments.createShipmentManual);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!orgId) {
          toast.error("No active organization found. Please switch orgs.");
          return;
      }
      
      console.log(`[SUBMIT] Adding shipment to Org: ${orgId}`, values);

      if (values.live_track) {
          await addAndTrack({
            orgId,
            tracking_number: values.tracking_number,
            carrier_code: values.carrier_code || undefined,
            customer_name: values.customer_name || undefined,
            customer_email: values.customer_email || undefined,
            customer_phone: values.customer_phone || undefined,
            userId: detectedUserId, 
            origin_country: values.origin_country,
            provider: values.provider as any,
            notification_preferences: {
              email: values.email_notify,
              whatsapp: values.whatsapp_notify,
            },
            sessionId,
          });
      } else {
          await addManual({
            orgId,
            tracking_number: values.tracking_number,
            carrier_code: values.carrier_code || "unknown",
            provider: values.provider as any,
            customer_name: values.customer_name || undefined,
            customer_email: values.customer_email || undefined,
            customer_phone: values.customer_phone || undefined,
            userId: detectedUserId, 
            origin_country: values.origin_country,
            notification_preferences: {
              email: values.email_notify,
              whatsapp: values.whatsapp_notify,
            },
            sessionId,
          });
      }
      
      toast.success('Shipment added successfully');
      setOpen(false);
      form.reset();
      setDetectedUserId(undefined);
    } catch (error: any) {
      console.error("[SUBMIT ERROR]", error);
      
      // Handle ConvexError data specifically
      const backendMessage = error.data || error.message || '';
      console.log("[SUBMIT ERROR] Parsed message:", backendMessage);
      
      const isDuplicate = backendMessage.toLowerCase().includes("already active") || 
                          backendMessage.toLowerCase().includes("duplicate");

      if (isDuplicate) {
          toast.error("Duplicate Shipment", {
            description: backendMessage.includes("Error:") ? backendMessage.split("Error:")[1] : backendMessage
          });
      } else {
          toast.error("Failed to initialize tracking", {
            description: "Please verify the tracking number and try again."
          });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="h-12 px-8 gap-2 bg-primary shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all rounded-md font-semibold uppercase tracking-wider text-[10px]">
            <Plus size={16} /> New Manifest
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-border/40 bg-card/95 backdrop-blur-2xl rounded-xl shadow-2xl">
        <div className="bg-primary h-1.5 w-full" />
        <DialogHeader className="p-8 pb-0">
          <DialogTitle className="text-3xl font-semibold tracking-tighter">Initialize Tracking</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground/60">
            Enter sender details and select origin country for the tracking sequence.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="tracking_number"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground ml-1">Carrier Tracking ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 1Z999AA10123456784"
                        className={cn(
                          "h-12 bg-muted/30 border-border/40 rounded-lg focus:ring-primary/20 font-mono font-medium transition-all",
                          isDuplicate && "border-rose-500/50 bg-rose-500/5 ring-rose-500/10"
                        )}
                        {...field}
                      />
                    </FormControl>
                    {isDuplicate && (
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                        <ShieldCheck size={12} className="text-rose-500" />
                        This tracking number is already active in your organization
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin_country"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground ml-1">Origin Country</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 bg-muted/30 border-border/40 rounded-lg font-semibold">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border/50">
                          <SelectItem value="india">India (GT Prefix)</SelectItem>
                          <SelectItem value="srilanka">Sri Lanka (LM Prefix)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carrier_code"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 flex flex-col">
                      <FormLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground ml-1 mt-0.5">Carrier (Optional)</FormLabel>
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "h-12 w-full justify-between bg-muted/30 border-border/40 rounded-lg font-semibold uppercase overflow-hidden",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {isDetecting ? (
                                  <div className="flex items-center gap-2">
                                    <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                                    <span className="animate-pulse">Detecting...</span>
                                  </div>
                                ) : (
                                  field.value ? (
                                    form.watch("provider") === "track17"
                                      ? (carrierResults?.find(c => c.key.toString() === field.value)?.name || detectedCarrierName || field.value)
                                      : (couriersData.find((c) => c.code.toLowerCase() === field.value?.toLowerCase())?.name || field.value)
                                  ) : "Auto-detect..."
                                )}

                              </span>
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4 shrink-0 opacity-50"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 border-border/50 bg-card/95 backdrop-blur-xl" align="start">
                          <Command shouldFilter={form.getValues("provider") !== "track17"}>
                            <CommandInput 
                              placeholder="Search carrier..." 
                              className="h-9" 
                              value={carrierSearch}
                              onValueChange={setCarrierSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No carrier found.</CommandEmpty>
                              <CommandGroup>
                                {form.watch("provider") === "track17" ? (
                                  <>
                                    {carrierResults?.map((carrier) => (
                                      <CommandItem
                                        value={`${carrier.key} ${carrier.name}`}
                                        key={carrier.key}
                                        onSelect={() => {
                                          form.setValue("carrier_code", carrier.key.toString());
                                          setOpenCombobox(false);
                                        }}
                                      >
                                        <div className="flex flex-col gap-0.5 overflow-hidden">
                                            <span className="truncate font-semibold">{carrier.name}</span>
                                            {carrier.country_iso && (
                                                <span className="text-[10px] text-muted-foreground uppercase">{carrier.country_iso}</span>
                                            )}
                                        </div>
                                        <Check
                                          className={cn(
                                            "ml-auto h-4 w-4 shrink-0",
                                            carrier.key.toString() === field.value ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {couriersData.map((courier) => (
                                      <CommandItem
                                        value={`${courier.code} ${courier.name}`}
                                        key={courier.code}
                                        onSelect={() => {
                                          form.setValue("carrier_code", courier.code);
                                          setOpenCombobox(false);
                                        }}
                                      >
                                        <span className="truncate">{courier.name}</span>
                                        <Check
                                          className={cn(
                                            "ml-auto h-4 w-4 shrink-0",
                                            courier.code === field.value ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  </>
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground ml-1">Notification Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="email"
                            placeholder="customer@example.com"
                            className={cn(
                              "h-11 bg-muted/30 border-border/40 rounded-lg font-semibold transition-all",
                              detectedUserId && "border-primary/50 bg-primary/5"
                            )}
                            {...field}
                          />
                          {detectedUserId && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-semibold uppercase text-primary bg-background/80 px-2 py-0.5 rounded shadow-sm border border-primary/20">
                              <Users size={10} />
                              Linked
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground ml-1">WhatsApp / Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+91 99999 99999"
                          className="h-11 bg-muted/30 border-border/40 rounded-lg font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-2 border-t border-border/10">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground ml-1">Sender Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          className="h-11 bg-muted/30 border-border/40 rounded-lg font-bold"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notification Preferences */}
              <div className="pt-4 border-t border-border/10 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] uppercase font-semibold tracking-wider flex items-center gap-2">
                       <Mail size={12} className="text-primary" /> Email Alerts
                    </Label>
                    <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-tight">Send updates to sender email</p>
                  </div>
                   <FormField
                    control={form.control}
                    name="email_notify"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between px-1">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] uppercase font-semibold tracking-wider flex items-center gap-2">
                       <MessageSquare size={12} className="text-primary" /> WhatsApp Alerts
                    </Label>
                    <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-tight">Real-time alerts via WhatsApp Business</p>
                  </div>
                   <FormField
                    control={form.control}
                    name="whatsapp_notify"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/10 flex sm:justify-between items-center gap-4">
              <p className="hidden sm:block text-[9px] text-muted-foreground/40 font-semibold uppercase tracking-wider max-w-[150px]">
                  Tracking status will be synced periodically.
              </p>
              <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting || !!isDuplicate}
                  className={cn(
                    "h-14 px-12 rounded-lg bg-primary shadow-lg shadow-primary/20 hover:scale-95 active:scale-90 transition-all font-semibold uppercase tracking-wider text-[10px]",
                    isDuplicate && "opacity-50 grayscale cursor-not-allowed hover:scale-100"
                  )}
              >
                {form.formState.isSubmitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Package className="mr-2 h-4 w-4" />}
                Begin Tracking
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
