"use client";

import * as React from "react";
import { Bell, BellDot, Check, Inbox, Trash2, Archive } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrg } from "@/components/providers/org-provider";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export function NotificationBell() {
  const { sessionId, activeOrgId } = useOrg();
  
  const notifications = useQuery(api.admin_notifications.list, activeOrgId ? { 
    orgId: activeOrgId, 
    sessionId 
  } : "skip");
  
  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;
  
  const markRead = useMutation(api.admin_notifications.markRead);
  const archive = useMutation(api.admin_notifications.archive);

  const handleMarkAllRead = async () => {
    if (!notifications || !activeOrgId) return;
    for (const n of notifications) {
      if (!n.isRead) {
        await markRead({ id: n._id, isRead: true, orgId: activeOrgId, sessionId });
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-accent/50 transition-colors">
          {unreadCount > 0 ? (
            <>
              <BellDot className="h-5 w-5 text-primary animate-pulse" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold border-2 border-background animate-in zoom-in">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            </>
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground opacity-70" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0 shadow-2xl border-border/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
          <DropdownMenuLabel className="p-0 font-semibold text-sm">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-[11px] uppercase tracking-wider font-bold text-primary hover:text-primary/80"
                onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        
        <ScrollArea className="h-[400px]">
          {notifications && notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                    key={n._id} 
                    className={cn(
                        "group flex flex-col gap-1 p-4 border-b border-border/10 transition-all hover:bg-accent/30 cursor-pointer",
                        !n.isRead && "bg-primary/5 border-l-2 border-l-primary"
                    )}
                    onClick={() => markRead({ id: n._id, isRead: true, orgId: orgId as any, sessionId })}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {n.priority === "high" && <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />}
                        <span className={cn("text-sm font-semibold", !n.isRead ? "text-foreground" : "text-muted-foreground")}>
                            {n.title}
                        </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium pt-0.5 whitespace-nowrap">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    {n.link ? (
                        <Link 
                            href={n.link} 
                            className="text-[11px] font-bold text-primary hover:underline underline-offset-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            View Details
                        </Link>
                    ) : <div />}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-primary/20 hover:text-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activeOrgId) markRead({ id: n._id, isRead: !n.isRead, orgId: activeOrgId, sessionId });
                            }}
                            title={n.isRead ? "Mark as unread" : "Mark as read"}
                        >
                            {n.isRead ? <Inbox className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-primary/20 hover:text-primary"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activeOrgId) archive({ id: n._id, orgId: activeOrgId, sessionId });
                            }}
                            title="Archive"
                        >
                            <Archive className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] gap-4 p-8 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Bell className="h-6 w-6 text-muted-foreground opacity-50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">No notifications</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  When you have notifications, they will appear here.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
        
        <DropdownMenuSeparator className="m-0" />
        <Link href="/notifications" className="block">
          <Button variant="ghost" className="w-full rounded-none h-12 text-xs font-bold uppercase tracking-widest hover:bg-accent/50 transition-all">
            See All Notifications
          </Button>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
