'use client';

/** @format */

import * as React from 'react';
import {
  IconMail,
  IconMessageCircle,
  IconHelp,
  IconChevronRight,
  IconTruck,
  IconSettings,
  IconShieldCheck,
  IconExternalLink,
  IconSearch,
} from '@tabler/icons-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const faqs = [
  {
    question: 'How do I track my shipment?',
    answer:
      'Simply enter your tracking number in the search bar on the dashboard or head to the Shipments page for a detailed list. You can also scan the QR code provided on your shipment label to track directly on your mobile device.',
    icon: IconSearch,
  },
  {
    question: 'What carriers are currently supported?',
    answer:
      'We support over 200+ global carriers including FedEx, UPS, DHL, USPS, China Post, and many regional services like India Post. Our system automatically detects the carrier based on the tracking number format.',
    icon: IconTruck,
  },
  {
    question: 'Can I share my shipment details with others?',
    answer:
      'Yes! You can generate a public tracking link or a QR code from the shipment details page. This allows your customers or team members to view real-time updates without needing to log in.',
    icon: IconExternalLink,
  },
  {
    question: 'How do I update my profile or organization settings?',
    answer:
      'Click on the "Settings" link in the sidebar. From there, you can manage your account details, organization profile, notification preferences, and API integrations.',
    icon: IconSettings,
  },
  {
    question: 'What do the different tracking statuses mean?',
    answer:
      'Our platform standardizes statuses across all carriers: "In Transit" means the package is moving; "Out for Delivery" means it\'s with the local courier; "Delivered" means it has reached its destination. "Exception" indicates a delay or issue that requires attention.',
    icon: IconShieldCheck,
  },
];

export default function HelpPage() {
  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Get Help & Support
          </h2>
          <p className="text-muted-foreground">
            Find answers to common questions or reach out to our team for assistance.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
        {/* Contact Support Card */}
        <Card className="relative overflow-hidden group border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
          <CardHeader>
            <div className="p-2 w-fit rounded-lg bg-primary/20 text-primary mb-2">
              <IconMail className="size-6" />
            </div>
            <CardTitle>Email Support</CardTitle>
            <CardDescription>
              Expect a response within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
              support@kajentrack.com
            </Button>
          </CardContent>
        </Card>

        {/* Documentation Card */}
        <Card className="relative overflow-hidden group border-muted-foreground/20 bg-muted/5 hover:bg-muted/10 transition-colors">
          <CardHeader>
            <div className="p-2 w-fit rounded-lg bg-muted/20 text-muted-foreground mb-2">
              <IconHelp className="size-6" />
            </div>
            <CardTitle>Documentation</CardTitle>
            <CardDescription>
              Detailed guides for all features and integrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full group-hover:bg-foreground group-hover:text-background transition-all">
              View Guidelines
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-3xl mx-auto space-y-6 pt-8">
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-2xl font-bold">Frequently Asked Questions</h3>
          <p className="text-muted-foreground">
            Quick solutions to the most common queries.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border rounded-xl px-4 bg-card/50 hover:bg-card transition-colors"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left">
                  <div className="p-2 rounded-lg bg-muted flex-shrink-0">
                    <faq.icon className="size-4 text-muted-foreground" />
                  </div>
                  <span className="font-medium text-base">{faq.question}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm pb-4 pl-12 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-12 text-sm text-muted-foreground">
        <p>© 2026 KAJEN TRACK. All rights reserved.</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
