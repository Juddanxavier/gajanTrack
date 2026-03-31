import * as React from 'react';
import { DashboardClientWrapper } from '@/components/dashboard-client-wrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardClientWrapper>
      {children}
    </DashboardClientWrapper>
  );
}

