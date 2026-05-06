"use client";

import { trackEvent } from "@/lib/analytics";
import type { AnchorHTMLAttributes } from "react";

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  eventName: string;
  eventParams?: Record<string, string | number>;
}

export default function TrackedLink({
  eventName,
  eventParams,
  onClick,
  children,
  ...props
}: Props) {
  return (
    <a
      onClick={(e) => {
        trackEvent(eventName, eventParams);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
