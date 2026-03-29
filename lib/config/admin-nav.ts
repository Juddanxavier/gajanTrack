import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  BarChart3,
  Shield,
  Truck,
  Bell,
  FileText,
  Map,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
}

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: NavSubItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNavGroups: NavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Quotes",
        url: "/quotes",
        icon: Inbox,
      },
      {
        title: "Shipments",
        url: "/shipments",
        icon: Package,
        items: [
          { title: "All Shipments", url: "/shipments" },
          { title: "In Transit", url: "/shipments/in-transit" },
          { title: "Delivered", url: "/shipments/delivered" },
        ],
      },
      {
        title: "Tracking",
        url: "/tracking",
        icon: Map,
      },
      {
        title: "Fleet",
        url: "/fleet",
        icon: Truck,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        title: "Users",
        url: "/users",
        icon: Users,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart3,
      },
      {
        title: "Reports",
        url: "/reports",
        icon: FileText,
      },
      {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Access Control",
        url: "/access",
        icon: Shield,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        items: [
          { title: "General", url: "/settings" },
          { title: "Integrations", url: "/settings/integrations" },
          { title: "API Keys", url: "/settings/api-keys" },
        ],
      },
    ],
  },
];
