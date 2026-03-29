/** @format */

'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Box, ShieldCheck, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <Link className="flex items-center justify-center space-x-2" href="/">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
             <Box className="size-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tighter italic">KAJEN <span className="text-primary tracking-normal not-italic underline decoration-primary/30">TRACK</span></span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Button asChild size="sm">
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent -z-10" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10 opacity-50" />
          
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-2">
              Next-Gen Logistics Intelligence
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Elevate Your <span className="text-primary italic underline underline-offset-8 decoration-primary/20">Shipment Tracking</span> Beyond Limits
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl lg:text-2xl mt-6">
              A premium, administrative-grade platform for real-time parcel monitoring, quote management, and logistical optimization.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-10">
            <Button asChild size="lg" className="h-12 px-8 text-base font-semibold group rounded-full">
              <Link href="/dashboard">
                Access Control Center
                <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-card/30 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border border-border/50 bg-card/50 hover:border-primary/50 transition-colors shadow-sm">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <Zap className="size-6" />
                </div>
                <h3 className="text-xl font-bold">Real-time Updates</h3>
                <p className="text-muted-foreground">Automatic tracking sync with international carriers ensuring second-by-second accuracy.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border border-border/50 bg-card/50 hover:border-primary/50 transition-colors shadow-sm">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <ShieldCheck className="size-6" />
                </div>
                <h3 className="text-xl font-bold">Admin-Only Control</h3>
                <p className="text-muted-foreground">Secure, organization-based access for staff to manage shipments and quotes with precision.</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border border-border/50 bg-card/50 hover:border-primary/50 transition-colors shadow-sm">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                   <Box className="size-6" />
                </div>
                <h3 className="text-xl font-bold">Quote Optimization</h3>
                <p className="text-muted-foreground">Sophisticated tools to handle shipping requests and price estimations with a premium interface.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 px-4 md:px-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground bg-card">
        <p>© 2026 Kajen Track. Built with precision for premium logistics.</p>
        <div className="flex gap-4 underline-offset-4 decoration-border">
          <Link href="#" className="hover:text-primary transition-colors hover:underline">Terms of Service</Link>
          <Link href="#" className="hover:text-primary transition-colors hover:underline">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
