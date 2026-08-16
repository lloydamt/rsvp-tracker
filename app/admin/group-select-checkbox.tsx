"use client";

import { useEffect, useRef } from "react";

const formId = "bulk-guest-form";

function memberCheckboxes(guestIds: string[]) {
  const ids = new Set(guestIds);
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="guest_ids"][form="${formId}"]`))
    .filter((checkbox) => ids.has(checkbox.value));
}

export function GroupSelectCheckbox({ groupName, guestIds }: { groupName: string; guestIds: string[] }) {
  const ref = useRef<HTMLInputElement>(null);
  const guestIdKey = guestIds.join(",");

  useEffect(() => {
    const members = memberCheckboxes(guestIdKey.split(",").filter(Boolean));
    const sync = () => {
      if (!ref.current) return;
      const checkedCount = members.filter((checkbox) => checkbox.checked).length;
      ref.current.checked = members.length > 0 && checkedCount === members.length;
      ref.current.indeterminate = checkedCount > 0 && checkedCount < members.length;
    };
    members.forEach((checkbox) => checkbox.addEventListener("change", sync));
    sync();
    return () => members.forEach((checkbox) => checkbox.removeEventListener("change", sync));
  }, [guestIdKey]);

  return (
    <span className="groupSelectWrap" onClick={(event) => event.stopPropagation()}>
      <input
        ref={ref}
        className="guestCheckbox"
        type="checkbox"
        aria-label={`Select all guests in ${groupName}`}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => {
          const checked = event.currentTarget.checked;
          memberCheckboxes(guestIds).forEach((checkbox) => {
            if (checkbox.checked === checked) return;
            checkbox.checked = checked;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }}
      />
    </span>
  );
}
