"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  iconSize?: number;
}

export function CopyButton({ value, label, className, iconSize = 12 }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!value) return;
    
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label || "Code"} copied to clipboard`, {
        className: 'font-black uppercase tracking-widest text-[10px]'
    });

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-6 w-6 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-all focus-visible:ring-0",
        className
      )}
      onClick={onCopy}
    >
      {copied ? (
        <Check className="text-emerald-500" size={iconSize} />
      ) : (
        <Copy size={iconSize} />
      )}
    </Button>
  );
}
