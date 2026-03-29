import {
  LayoutDashboard,
  Inbox,
  Package,
  Settings,
  HelpCircle,
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

export const mainNavGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: LayoutDashboard,
      },
      {
        title: "My Quotes",
        url: "/quotes",
        icon: Inbox,
      },
      {
        title: "Track Shipments",
        url: "/track",
        icon: Package,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
      {
        title: "Help & Support",
        url: "/support",
        icon: HelpCircle,
      },
    ],
  },
];
