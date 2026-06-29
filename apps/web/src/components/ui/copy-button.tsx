"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  size = "sm",
  variant = "secondary",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button onClick={handleCopy} size={size} variant={variant} className={className}>
      {copied ? (
        <Check className="h-3 w-3 mr-1.5 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 mr-1.5" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
