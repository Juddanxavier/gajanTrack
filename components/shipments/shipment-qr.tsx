/** @format */

'use client';

import * as React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  Printer, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ShipmentQRProps {
  trackingNumber: string;
  publicDomain?: string;
  customerName?: string;
}

export function ShipmentQR({ trackingNumber, publicDomain, customerName }: ShipmentQRProps) {
  const [copied, setCopied] = React.useState(false);
  
  // Use the custom domain if provided, otherwise fallback to current origin
  const baseUrl = publicDomain 
    ? (publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`)
    : typeof window !== 'undefined' ? window.location.origin : '';
    
  const trackingUrl = `${baseUrl}/track?id=${trackingNumber}`;

  const downloadQR = () => {
    const svg = document.getElementById('shipment-qr-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 500;
      canvas.height = 500;
      ctx?.drawImage(img, 0, 0, 500, 500);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${trackingNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    toast.success('QR Code downloaded successfully');
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${trackingNumber}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
            .label { margin-top: 20px; font-weight: bold; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .sub-label { margin-top: 5px; color: #666; }
          </style>
        </head>
        <body>
          <div id="qr-container"></div>
          <div class="label">${trackingNumber}</div>
          ${customerName ? `<div class="sub-label">${customerName}</div>` : ''}
          <script>
            const svg = window.opener.document.getElementById('shipment-qr-svg').cloneNode(true);
            svg.setAttribute('width', '400');
            svg.setAttribute('height', '400');
            document.getElementById('qr-container').appendChild(svg);
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    toast.success('Tracking URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DialogContent className="sm:max-w-md border-border/40 bg-card/95 backdrop-blur-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold uppercase tracking-wider text-center">Shipment Identity</DialogTitle>
        <DialogDescription className="text-center font-semibold text-muted-foreground/60 uppercase text-[10px] tracking-wider">
          Dynamic regional tracking node
        </DialogDescription>
      </DialogHeader>
      
      <div className="flex flex-col items-center justify-center p-6 space-y-8">
        <div className="p-4 bg-white rounded-2xl shadow-2xl shadow-primary/10 transition-transform hover:scale-105 duration-500">
          <QRCodeSVG
            id="shipment-qr-svg"
            value={trackingUrl}
            size={240}
            level="H"
            includeMargin={false}
            imageSettings={{
                src: "/favicon.ico",
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
            }}
          />
        </div>
        
        <div className="w-full space-y-2 text-center">
            <h3 className="text-2xl font-semibold tracking-tighter uppercase">{trackingNumber}</h3>
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-[0.2em]">{publicDomain || 'Global Network'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full">
            <Button 
                variant="outline" 
                className="font-black uppercase tracking-widest text-[10px] h-12 rounded-xl border-border/40 hover:bg-primary hover:text-primary-foreground transition-all group"
                onClick={downloadQR}
            >
                <Download size={14} className="mr-2 opacity-40 group-hover:opacity-100" />
                Get Asset
            </Button>
            <Button 
                variant="outline" 
                className="font-black uppercase tracking-widest text-[10px] h-12 rounded-xl border-border/40 hover:bg-primary hover:text-primary-foreground transition-all group"
                onClick={printQR}
            >
                <Printer size={14} className="mr-2 opacity-40 group-hover:opacity-100" />
                Insta Print
            </Button>
            <Button 
                variant="outline" 
                className="col-span-2 font-semibold uppercase tracking-wider text-[10px] h-12 rounded-xl border-border/40 hover:bg-muted transition-all group"
                onClick={copyUrl}
            >
                {copied ? <Check size={14} className="mr-2 text-emerald-500" /> : <Copy size={14} className="mr-2 opacity-40 group-hover:opacity-100" />}
                {copied ? 'Captured' : 'Copy Track link'}
            </Button>
        </div>
        
        <a 
            href={trackingUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wider text-primary/40 hover:text-primary transition-colors"
        >
            <ExternalLink size={10} />
            Force Open Remote Node
        </a>
      </div>
    </DialogContent>
  );
}

