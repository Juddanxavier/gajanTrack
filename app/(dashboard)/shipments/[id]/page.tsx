'use client';

import * as React from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useOrg } from '@/components/providers/org-provider';
import { useParams, useRouter } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatStatus } from "@/lib/utils";
import { 
  ArrowLeft, 
  RefreshCw, 
  Package, 
  Truck, 
  MapPin, 
  AlertCircle,
  Clock,
  Info,
  History as HistoryIcon,
  Copy,
  Check,
  ShieldCheck,
  Users,
  Globe,
  Building2,
  Plane,
  Home,
  Map as MapIcon,
  Search,
  Mail,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { RetrackDialog } from '@/components/shipments/retrack-dialog';
import { ShipmentQR } from '@/components/shipments/shipment-qr';
import { CopyButton } from '@/components/copy-button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { useMutation } from 'convex/react';
import { QrCode } from 'lucide-react';

export default function ShipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  const { activeOrgId, sessionId } = useOrg();
  const shipmentId = params.id as Id<'shipments'>;
  
  const shipment = useQuery(
    api.shipments.queries.getShipment, 
    activeOrgId ? { id: shipmentId, orgId: activeOrgId, sessionId } : "skip"
  );

  const refreshAction = useAction(api.shipments.actions.refreshShipment);
  const updateShipment = useMutation(api.shipments.mutations.updateShipment);
  
  const communicationLogs = useQuery(
    api.communication.getShipmentLogs,
    activeOrgId ? { shipmentId, orgId: activeOrgId, sessionId } : "skip"
  );
  
  const manualNotification = useAction(api.notifications.actions.sendManualNotification);
  
  const [refreshing, setRefreshing] = React.useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = React.useState(false);
  const [retrackOpen, setRetrackOpen] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);

  const handlePreferenceToggle = async (channel: 'email' | 'whatsapp', enabled: boolean) => {
    try {
      if (!activeOrgId || !shipment) return;
      
      const currentPrefs = shipment.notification_preferences || { email: true, whatsapp: true };
      const newPrefs = { ...currentPrefs, [channel]: enabled };
      
      await updateShipment({
        id: shipmentId,
        orgId: activeOrgId,
        notification_preferences: newPrefs,
        sessionId
      });
      
      toast.success(`${channel === 'email' ? 'Email' : 'WhatsApp'} notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update preferences');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (!activeOrgId) return;
      await refreshAction({ shipment_id: shipmentId, orgId: activeOrgId, sessionId });
      toast.success('Manifest sequence updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sync telemetry');
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualWhatsApp = async () => {
    if (!shipment?.customer_phone) {
        toast.error("No phone number found for this shipment");
        return;
    }
    
    setSendingWhatsApp(true);
    const toastId = toast.loading("Dispatching WhatsApp alert...");
    
    try {
        if (!activeOrgId) throw new Error("No active organization");
        const res = await manualNotification({ 
            id: shipmentId, 
            status: shipment.status || "tracking_update",
            orgId: activeOrgId,
            sessionId: sessionId 
        });
        
        if (res.success) {
            toast.success("WhatsApp alert dispatched", { id: toastId });
        } else {
            toast.error(res.message || "Failed to send WhatsApp", { id: toastId });
        }
    } catch (error) {
        console.error(error);
        toast.error("Error triggering notification", { id: toastId });
    } finally {
        setSendingWhatsApp(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Tracking ID copied');
  };


  if (shipment === undefined) return <div className="p-12 flex justify-center"><RefreshCw className="animate-spin text-primary/40" /></div>;
  if (shipment === null) return <div className="p-12 text-center text-muted-foreground font-bold">Shipment not found</div>;

  const steps = [
    { key: 'info_received', label: 'Processing', icon: Package },
    { key: 'in_transit', label: 'In Transit', icon: Plane },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: Home },
  ];

  const statusToStepMap: Record<string, string> = {
    'pending': 'info_received',
    'info_received': 'info_received',
    'in_transit': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'failed_attempt': 'out_for_delivery',
    'exception': 'in_transit',
  };

  const effectiveStatus = statusToStepMap[shipment.status || 'pending'] || 'info_received';
  const currentStatusIndex = steps.findIndex(step => step.key === effectiveStatus);
  const isDelivered = shipment.status === 'delivered';
  const hasException = shipment.status === 'exception' || shipment.status === 'failed_attempt';

  const getEventIcon = (status: string, message: string = "") => {
    const msg = message.toLowerCase();
    if (status === 'delivered') return <Home size={16} />;
    if (msg.includes('flight') || msg.includes('departed')) return <Plane size={16} />;
    if (msg.includes('facility') || msg.includes('hub')) return <Building2 size={16} />;
    if (msg.includes('customs')) return <ShieldCheck size={16} />;
    if (msg.includes('delivery')) return <Truck size={16} />;
    return <Globe size={16} />;
  };

  const statusColors: Record<string, string> = {
    pending: "text-slate-500 border-slate-500/20 bg-slate-500/5",
    info_received: "text-sky-500 border-sky-500/20 bg-sky-500/5",
    in_transit: "text-blue-500 border-blue-500/20 bg-blue-500/5",
    out_for_delivery: "text-orange-500 border-orange-500/20 bg-orange-500/5",
    delivered: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
    failed_attempt: "text-rose-400 border-rose-400/20 bg-rose-400/5",
    exception: "text-rose-500 border-rose-500/20 bg-rose-500/5",
  };

  return (
    <div className='flex-1 flex flex-col min-h-screen bg-background'>
      {/* Standard Action Bar */}
      <div className='sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-3 px-6 lg:px-8 flex items-center justify-between shadow-sm'>
        <div className="flex items-center gap-4">
            <Button variant='ghost' size="icon" onClick={() => router.back()} className='h-8 w-8 rounded-full'>
                <ArrowLeft className="h-4 w-4" /> 
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <h2 className="text-sm font-semibold tracking-tight">
                Shipment Details
            </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant='outline' 
            size="sm"
            onClick={() => setRetrackOpen(true)}
            className='h-8 gap-2'
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Update Carrier
          </Button>
          <Button 
            size="sm"
            onClick={handleRefresh} 
            disabled={refreshing}
            className='h-8 gap-2'
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && 'animate-spin')} />
            Sync
          </Button>
        </div>
      </div>

      <div className='flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500'>
        {/* Header Overview */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div className='space-y-6'>
                <div className="flex items-center gap-3">
                    <Badge 
                        variant='outline' 
                        className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider",
                            statusColors[shipment.status || 'pending'] || ""
                        )}
                    >
                        {formatStatus(shipment.status || 'pending')}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Updated {format(shipment.last_synced_at || shipment.created_at || Date.now(), 'MMM d, HH:mm')}
                    </span>
                </div>
                
                <div className="flex items-center gap-3">
                    <h1 className='text-3xl font-bold tracking-tight'>
                        {shipment.white_label_code || shipment.tracking_number}
                    </h1>
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => copyToClipboard(shipment.white_label_code || shipment.tracking_number || "")}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Globe className="h-4 w-4" />
                        {shipment.origin_country || 'Global'}
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                        <Truck className="h-4 w-4" />
                        {shipment.carrier_name || shipment.carrier_code || 'TBD'}
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-2 group cursor-pointer" onClick={() => setQrOpen(true)}>
                <div className="p-4 bg-muted/30 rounded-xl border border-border/40 transition-all group-hover:bg-primary/5 group-hover:border-primary/20">
                    <QrCode className="h-10 w-10 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest group-hover:text-primary transition-colors">Shipment QR Asset</p>
                <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                    <ShipmentQR 
                        trackingNumber={shipment.white_label_code || shipment.tracking_number || ""} 
                        publicDomain={undefined} 
                        customerName={shipment.customer_name}
                    />
                </Dialog>
            </div>
        </div>

        <Separator />

        {/* 2-Column Main Content */}
        <div className='grid gap-8 lg:grid-cols-[1fr_320px] items-start'>
          <div className='space-y-8'>
            {/* Simple Progress Stepper */}
            <div className="grid grid-cols-4 gap-2">
                {steps.map((step, idx) => {
                    const isCompleted = idx <= currentStatusIndex;
                    const isCurrent = idx === currentStatusIndex;
                    return (
                        <div key={idx} className="space-y-2">
                            <div className={cn(
                                "h-1.5 rounded-full transition-all duration-500",
                                isCompleted ? 'bg-primary' : 'bg-muted'
                            )} />
                            <p className={cn(
                                "text-[10px] font-bold uppercase tracking-wider text-center",
                                isCompleted ? 'text-foreground' : 'text-muted-foreground/40'
                            )}>
                                {step.label}
                            </p>
                        </div>
                    );
                })}
            </div>

                <div className="relative border-t border-border/40 pt-10">
                    {/* Progress Line */}
                    <div className="absolute left-[99px] top-10 bottom-0 w-px bg-border/40" />
                    
                    <div className="space-y-6">
                        {shipment.events.length > 0 ? (
                            shipment.events.map((event: any, index: number) => {
                                const isLatest = index === 0;
                                return (
                                    <div key={index} className="grid grid-cols-[100px_1fr] gap-10 relative group items-start">
                                         {/* Time Column */}
                                         <div className="text-right pt-2 pr-2">
                                            <p className={`text-[11px] font-black uppercase tracking-widest leading-none ${isLatest ? 'text-primary' : 'text-muted-foreground/40'}`}>
                                                {format(event.occurred_at, 'MMM d')}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/30 font-bold mt-1.5 font-mono">
                                                {format(event.occurred_at, 'HH:mm')}
                                            </p>
                                        </div>

                                        {/* Status Node Overlayed on Line */}
                                        <div className={`absolute left-[95px] top-2 z-10 h-3.5 w-3.5 rounded-full border-2 transition-all duration-500 bg-background flex items-center justify-center ${
                                            isLatest ? 'border-primary ring-4 ring-primary/10' : 'border-border'
                                        }`}>
                                            {event.status === 'delivered' && (
                                                <Check className="h-2 w-2 text-primary" strokeWidth={4} />
                                            )}
                                        </div>

                                        {/* Content Area */}
                                        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 rounded-xl border transition-all duration-300 ${
                                            isLatest ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-card/40 border-border/10 hover:border-border/30'
                                        }`}>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-3">
                                                    <h4 className={`text-sm font-bold tracking-tight uppercase ${isLatest ? 'text-foreground' : 'text-muted-foreground/70'}`}>
                                                        {formatStatus(event.status)}
                                                    </h4>
                                                    {isLatest && <Badge className="h-4 text-[8px] font-black uppercase px-2 bg-primary/20 text-primary border-none shadow-none">Latest</Badge>}
                                                </div>
                                                <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-2xl">
                                                    {event.message}
                                                </p>
                                            </div>
                                            
                                            <div className="flex items-center gap-8 shrink-0">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/20 italic">Location</span>
                                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/60 uppercase">
                                                        <MapPin size={11} className="text-primary/30" />
                                                        {event.location || 'Terminal Hub'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-20 text-center rounded-2xl border border-dashed border-border/20 bg-muted/5">
                                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Awaiting manifest telemetry...</p>
                            </div>
                        )}
                    </div>
                </div>
          </div>

          {/* Sidebar Metadata */}
          <div className='space-y-6'>
            <div className="space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 px-1">Details</h4>
                
                <div className="rounded-xl border bg-card p-5 space-y-6 shadow-sm">
                    {/* Carrier */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Carrier Information</p>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                                <Truck className="h-4.5 w-4.5 text-muted-foreground" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-semibold">{shipment.carrier_name || shipment.carrier_code || 'Pending'}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">ID: {shipment._id?.substring(0, 8)}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Sender */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Sender</p>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">{shipment.customer_name || 'Restricted'}</p>
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center justify-between group/email">
                                    <p className="text-[11px] text-muted-foreground truncate">{shipment.customer_email || '—'}</p>
                                    {shipment.customer_email && (
                                        <CopyButton value={shipment.customer_email} label="Email" className="h-4 w-4 opacity-0 group-hover/email:opacity-100 transition-opacity" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between group/phone">
                                    {shipment.customer_phone && (
                                        <p className="text-[11px] text-primary font-bold font-mono">
                                            {shipment.customer_phone}
                                        </p>
                                    )}
                                    {shipment.customer_phone && (
                                        <CopyButton value={shipment.customer_phone} label="Phone" className="h-4 w-4 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Notifications */}
                    <div className="space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Alert Settings</p>
                        <div className="space-y-3">
                            {[
                                { label: 'Email Alerts', icon: Mail, type: 'email' },
                                { label: 'WhatsApp', icon: MessageSquare, type: 'whatsapp' }
                            ].map((chan) => (
                                <div key={chan.type} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <chan.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-xs font-medium">{chan.label}</span>
                                    </div>
                                    <Switch 
                                        checked={shipment.notification_preferences?.[chan.type as 'email' | 'whatsapp'] ?? true}
                                        onCheckedChange={(checked) => handlePreferenceToggle(chan.type as 'email' | 'whatsapp', checked)}
                                        className="scale-75"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Communication History */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Communication History</p>
                            <HistoryIcon className="h-3 w-3 text-muted-foreground/30" />
                        </div>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full h-8 text-[10px] font-bold uppercase tracking-widest gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                            onClick={handleManualWhatsApp}
                            disabled={sendingWhatsApp || !shipment.customer_phone}
                        >
                            {sendingWhatsApp ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                                <MessageSquare className="h-3 w-3" />
                            )}
                            Send Manual Alert
                        </Button>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            {communicationLogs === undefined ? (
                                <div className="flex justify-center py-4"><RefreshCw className="h-4 w-4 animate-spin text-muted-foreground/20" /></div>
                            ) : communicationLogs.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground/40 italic text-center py-2">No notifications sent yet</p>
                            ) : (
                                communicationLogs.map((log) => (
                                    <div key={log._id} className="group relative pl-3 border-l-2 border-border/40 hover:border-primary/40 transition-colors py-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1.5">
                                                {log.type === 'whatsapp' ? (
                                                    <MessageSquare className="h-3 w-3 text-emerald-500" />
                                                ) : (
                                                    <Mail className="h-3 w-3 text-blue-500" />
                                                )}
                                                <span className="text-[10px] font-bold uppercase tracking-tight">{log.type}</span>
                                            </div>
                                            <span className="text-[9px] text-muted-foreground/40 font-mono">
                                                {format(log.sentAt, 'HH:mm')}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground line-clamp-1">{log.content}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className={cn(
                                                "text-[8px] px-1.5 py-0 h-3.5 border-none bg-transparent font-black uppercase tracking-tighter",
                                                log.status === 'sent' ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                • {log.status}
                                            </Badge>
                                            <span className="text-[9px] text-muted-foreground/20 font-bold uppercase tracking-widest">
                                                {format(log.sentAt, 'MMM d')}
                                            </span>
                                        </div>
                                        {log.error && (
                                            <p className="text-[9px] text-rose-400/60 leading-tight mt-1 bg-rose-500/5 p-1 rounded italic">{log.error}</p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <RetrackDialog 
        shipment={shipment as any}
        open={retrackOpen}
        onOpenChange={setRetrackOpen}
      />
    </div>
  );
}
