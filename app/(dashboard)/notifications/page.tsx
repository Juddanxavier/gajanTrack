"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  Search, 
  Archive, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Inbox,
  Filter,
  MoreVertical,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function NotificationsPage() {
  const { sessionId, activeOrgId } = useOrg();
  const [activeTab, setActiveTab] = React.useState("active");

  const activeNotifications = useQuery(api.admin_notifications.list, activeOrgId ? { 
    orgId: activeOrgId, 
    sessionId 
  } : "skip");

  const archivedNotifications = useQuery(api.admin_notifications.listArchived, activeOrgId ? { 
    orgId: activeOrgId, 
    sessionId 
  } : "skip");

  const markRead = useMutation(api.admin_notifications.markRead);
  const archive = useMutation(api.admin_notifications.archive);
  const deleteNotification = useMutation(api.admin_notifications.deleteNotification);

  const notifications = activeTab === "active" ? activeNotifications : archivedNotifications;

  return (
    <div className="flex flex-col gap-8 pb-10 p-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
        <p className="text-muted-foreground">
          Manage system alerts, shipment updates, and staff activity.
        </p>
      </div>

      <Tabs defaultValue="active" onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="active" className="px-6 h-9 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Active
              {activeNotifications && activeNotifications.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-none">
                  {activeNotifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="px-6 h-9 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Archive
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" className="h-9 px-4 font-bold text-[11px] uppercase tracking-wider">
               <Filter className="h-3.5 w-3.5 mr-2" />
               Filter
             </Button>
          </div>
        </div>

        <TabsContent value="active" className="m-0">
          <NotificationsList 
            notifications={activeNotifications} 
            onMarkRead={(id, read) => activeOrgId && markRead({ id, isRead: read, orgId: activeOrgId, sessionId })}
            onArchive={(id) => activeOrgId && archive({ id, orgId: activeOrgId, sessionId })}
            onDelete={(id) => activeOrgId && deleteNotification({ id, orgId: activeOrgId, sessionId })} 
          />
        </TabsContent>

        <TabsContent value="archived" className="m-0">
          <NotificationsList 
            notifications={archivedNotifications} 
            isArchive
            onMarkRead={(id, read) => activeOrgId && markRead({ id, isRead: read, orgId: activeOrgId, sessionId })}
            onDelete={(id) => activeOrgId && deleteNotification({ id, orgId: activeOrgId, sessionId })} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationsList({ 
  notifications, 
  isArchive = false,
  onMarkRead,
  onArchive,
  onDelete 
}: { 
  notifications: any[] | undefined, 
  isArchive?: boolean,
  onMarkRead: (id: any, read: boolean) => void,
  onArchive?: (id: any) => void,
  onDelete: (id: any) => void
}) {
  if (notifications === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 w-full animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <Inbox className="h-8 w-8 text-muted-foreground opacity-20" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">No notifications found</h3>
            <p className="text-muted-foreground max-w-xs">
              Everything is up to date! You'll see new alerts here when they happen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {notifications.map((n) => (
        <Card 
            key={n._id} 
            className={cn(
                "group relative overflow-hidden transition-all duration-300 hover:shadow-md border-border/40",
                !n.isRead && !isArchive && "bg-primary/[0.02] border-l-4 border-l-primary"
            )}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <div className={cn(
                  "mt-1 p-2 rounded-xl shrink-0 transition-colors",
                  n.priority === "high" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              )}>
                {n.type === "shipment_created" ? <CheckCircle2 className="h-5 w-5" /> :
                 n.priority === "high" ? <AlertCircle className="h-5 w-5" /> :
                 <Bell className="h-5 w-5" />}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("text-base font-bold truncate", !n.isRead ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </h3>
                    {!n.isRead && (
                        <Badge variant="default" className="h-5 px-1.5 text-[10px] uppercase font-black tracking-tighter">
                            New
                        </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    {n.message}
                </p>

                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/10">
                    <Button 
                        variant="link" 
                        className="h-auto p-0 font-bold text-xs uppercase tracking-wider text-primary hover:text-primary/80"
                        onClick={() => n.link && window.location.assign(n.link)}
                    >
                        View Details
                    </Button>

                    <div className="ml-auto flex items-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-3 font-bold text-[10px] uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary"
                            onClick={() => onMarkRead(n._id, !n.isRead)}
                        >
                            {n.isRead ? <Inbox className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            {n.isRead ? "Unread" : "Mark Read"}
                        </Button>
                        
                        {onArchive && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-3 font-bold text-[10px] uppercase tracking-widest gap-2 hover:bg-primary/10 hover:text-primary"
                                onClick={() => onArchive(n._id)}
                            >
                                <Archive className="h-3.5 w-3.5" />
                                Archive
                            </Button>
                        )}

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive font-bold text-xs uppercase tracking-widest p-3"
                                    onClick={() => onDelete(n._id)}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Permanently
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
