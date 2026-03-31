'use client';

import * as React from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { useOrg } from '@/components/providers/org-provider';
import { Doc } from '@/convex/_generated/dataModel';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw, Check, Package, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface RetrackDialogProps {
  shipment: Doc<"shipments">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RetrackDialog({ shipment, open, onOpenChange }: RetrackDialogProps) {
  const [openCombobox, setOpenCombobox] = React.useState(false);
  const { activeOrgId: orgId, sessionId } = useOrg();
  const [carrierSearch, setCarrierSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedCarrier, setSelectedCarrier] = React.useState<{ key: number, name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(carrierSearch), 300);
    return () => clearTimeout(timer);
  }, [carrierSearch]);

  const carrierResults = useQuery(api.tracking.carriers.search, { 
    query: debouncedSearch,
    limit: 10
  });

  const retrack = useAction(api.shipments.actions.retrackShipment);

  const handleRetrack = async () => {
    if (!orgId) return;
    setIsSubmitting(true);
    
    const promise = retrack({
      id: shipment._id,
      orgId,
      tracking_number: shipment.tracking_number,
      carrier_code: selectedCarrier ? String(selectedCarrier.key) : shipment.carrier_code || "auto",
      provider: shipment.provider as any,
      sessionId,
    });

    toast.promise(promise, {
      loading: 'Registering with carrier...',
      success: (data) => {
        onOpenChange(false);
        return `Successfully registered via ${shipment.provider}. Status: ${data.status}`;
      },
      error: (err) => `Registration failed: ${err.message}`,
    });

    try {
      await promise;
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Correct Carrier & Re-track
          </DialogTitle>
          <DialogDescription>
            Update the carrier for <span className="font-mono font-bold text-foreground">{shipment.tracking_number}</span> to fix registration errors.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Selected Provider</Label>
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border border-border/20 text-sm font-bold uppercase tracking-widest">
                <Package size={16} className="text-primary" />
                {shipment.provider}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="carrier">New Carrier (Optional)</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between bg-background"
                >
                  {selectedCarrier ? selectedCarrier.name : "Search official carriers..."}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Type to search 3,000+ carriers..." 
                    onValueChange={setCarrierSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No carrier found.</CommandEmpty>
                    <CommandGroup>
                      {carrierResults?.map((carrier: any) => (
                        <CommandItem
                          key={carrier.key}
                          value={carrier.name}
                          onSelect={() => {
                            setSelectedCarrier({ key: carrier.key, name: carrier.name });
                            setOpenCombobox(false);
                          }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{carrier.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{carrier.country_iso || "Global"}</span>
                          </div>
                          <Check
                            className={cn(
                              "ml-2 h-4 w-4",
                              selectedCarrier?.key === carrier.key ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-[10px] text-muted-foreground italic">
                {selectedCarrier ? `Numeric ID: ${selectedCarrier.key}` : "Leaving this empty will attempt auto-detection again."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleRetrack} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Trigger Re-registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

