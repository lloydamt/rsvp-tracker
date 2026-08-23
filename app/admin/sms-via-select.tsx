"use client";

import type { ChangeEvent } from "react";
import { inputNeedsSmsVia, type SmsViaOption } from "@/lib/phone";

export function SmsViaSelect({
  name,
  options,
  defaultValue,
  value,
  onChange,
  exceptId,
  required = false,
}: {
  name: string;
  options: SmsViaOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  exceptId?: string;
  required?: boolean;
}) {
  const visible = options.filter((option) => option.id !== exceptId);
  const selectProps = onChange
    ? { value: value ?? "", onChange: (event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) }
    : { defaultValue: defaultValue ?? "" };

  return (
    <label className="smsViaField">
      <span className="fieldCaption">Texts via <span className="optionalField">If not UK</span></span>
      <select name={name} {...selectProps} required={required}>
        <option value="">{required ? "Choose a UK guest" : "Text this number"}</option>
        {visible.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </label>
  );
}

export function GuestSmsViaField({
  name,
  phone,
  options,
  value,
  onChange,
  keepColumn = false,
}: {
  name: string;
  phone: string;
  options: SmsViaOption[];
  value: string;
  onChange: (value: string) => void;
  keepColumn?: boolean;
}) {
  if (inputNeedsSmsVia(phone)) {
    return <SmsViaSelect name={name} options={options} value={value} onChange={onChange} required />;
  }

  const hidden = <input type="hidden" name={name} value="" />;
  if (!keepColumn) return hidden;

  return <span className="smsViaField smsViaPlaceholder" aria-hidden="true">{hidden}</span>;
}
