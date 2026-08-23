"use client";

import type { ChangeEvent } from "react";
import type { SmsViaOption } from "@/lib/phone";

export function SmsViaSelect({
  name,
  options,
  defaultValue,
  value,
  onChange,
  exceptId,
}: {
  name: string;
  options: SmsViaOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  exceptId?: string;
}) {
  const visible = options.filter((option) => option.id !== exceptId);
  const selectProps = onChange
    ? { value: value ?? "", onChange: (event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) }
    : { defaultValue: defaultValue ?? "" };

  return (
    <label className="smsViaField">
      <span className="fieldCaption">Texts via <span className="optionalField">If not UK</span></span>
      <select name={name} {...selectProps}>
        <option value="">Text this number</option>
        {visible.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}
