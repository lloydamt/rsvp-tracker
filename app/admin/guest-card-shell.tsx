"use client";

import { useState, type ReactNode } from "react";

export function GuestCardShell({
  summary,
  children,
  message,
}: {
  summary: ReactNode;
  children: ReactNode;
  message: ReactNode;
}) {
  const [messageKey, setMessageKey] = useState(0);

  return (
    <details
      className="guestCard"
      onToggle={(event) => {
        if (!event.currentTarget.open) setMessageKey((key) => key + 1);
      }}
    >
      {summary}
      <div className="guestDetails">
        {children}
        <div key={messageKey}>{message}</div>
      </div>
    </details>
  );
}
