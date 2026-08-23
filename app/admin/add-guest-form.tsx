"use client";

import { useActionState, useEffect, useState } from "react";
import { addGuests, type AddGuestsResult } from "@/app/actions";
import { inputNeedsSmsVia, type SmsViaOption } from "@/lib/phone";
import { GuestSmsViaField } from "./sms-via-select";

type InvitationCategory = "ceremony_reception" | "reception_only";
type GuestRow = {
  id: number;
  name: string;
  phone: string;
  invitationCategory: InvitationCategory;
  smsViaGuestId: string;
  phoneError?: string;
};

function emptyRow(id: number): GuestRow {
  return { id, name: "", phone: "", invitationCategory: "ceremony_reception", smsViaGuestId: "" };
}

export function AddGuestForm({ groups, smsViaGuests }: { groups: { id: string; name: string }[]; smsViaGuests: SmsViaOption[] }) {
  const [groupMode, setGroupMode] = useState<"none" | "existing" | "new">("none");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [rows, setRows] = useState<GuestRow[]>([emptyRow(1)]);
  const [nextRowId, setNextRowId] = useState(2);
  const [result, formAction, isPending] = useActionState(
    async (_previous: AddGuestsResult | null, formData: FormData) => {
      try {
        const nextResult = await addGuests(formData);
        if (nextResult.status === "success") {
          setRows([emptyRow(1)]);
          setNextRowId(2);
          setGroupMode("none");
          setSelectedGroupId("");
          return nextResult;
        }
        setRows((current) => current.map((row, index) => ({
          ...row,
          phoneError: nextResult.phoneErrors?.[index] || undefined,
        })));
        return nextResult;
      } catch {
        return { status: "error" as const, message: "Those guests could not be saved. Please try again." };
      }
    },
    null,
  );
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (result?.status !== "success") {
      setShowSuccess(false);
      return;
    }
    setShowSuccess(true);
    const timeout = window.setTimeout(() => setShowSuccess(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [result]);

  const dismissSuccess = () => setShowSuccess(false);

  const addRow = () => {
    if (rows.length >= 50) return;
    dismissSuccess();
    setRows((current) => [...current, emptyRow(nextRowId)]);
    setNextRowId((current) => current + 1);
  };

  const updateRow = (id: number, patch: Partial<GuestRow>) => {
    dismissSuccess();
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const showSmsViaColumn = rows.some((row) => inputNeedsSmsVia(row.phone));
  const someoneHasPhone = rows.some((row) => row.phone.trim());

  return (
    <form action={formAction} className="addGuestForm">
      <div className="multiGuestHeader">
        <div><strong>Guest details</strong><small>Add up to 50 guests in one go. Plus-ones can skip a phone number if someone in the same group has one. Only non-UK numbers need a “texts via” guest.</small></div>
        <span>{rows.length} guest{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="guestRows">
        {rows.map((row, index) => (
          <div className={`guestInputRow${row.phoneError ? " hasError" : ""}${showSmsViaColumn ? "" : " noSmsVia"}`} key={row.id}>
            <span className="guestRowNumber" aria-hidden="true">{index + 1}</span>
            <label><span className="fieldCaption">Name</span><input name="guest_name" required maxLength={100} placeholder={index === 0 ? "Ada Lovelace" : "Guest name"} value={row.name} onChange={(event) => updateRow(row.id, { name: event.target.value })} /></label>
            <label>
              <span className="fieldCaption">Phone <span className="optionalField">{groupMode === "none" && rows.length === 1 && index === 0 ? "Required" : "Optional in a group"}</span></span>
              <input
              name="guest_phone"
              required={groupMode === "none" && !someoneHasPhone && index === 0}
              inputMode="tel"
              autoComplete="tel"
              placeholder={index === 0 ? "07700 900123 or +1…" : "Optional plus-one"}
              value={row.phone}
              aria-invalid={Boolean(row.phoneError)}
              aria-describedby={row.phoneError ? `guest-phone-error-${row.id}` : undefined}
              onChange={(event) => updateRow(row.id, { phone: event.target.value, phoneError: undefined, smsViaGuestId: "" })}
            />
              {row.phoneError && <small className="guestPhoneError" id={`guest-phone-error-${row.id}`} role="alert">{row.phoneError}</small>}
            </label>
            <GuestSmsViaField
              name="guest_sms_via_guest_id"
              phone={row.phone}
              options={smsViaGuests}
              value={row.smsViaGuestId}
              onChange={(smsViaGuestId) => updateRow(row.id, { smsViaGuestId })}
              keepColumn={showSmsViaColumn}
            />
            <label><span className="fieldCaption">Invitation</span><select
              name="guest_invitation_category"
              required
              value={row.invitationCategory}
              onChange={(event) => updateRow(row.id, { invitationCategory: event.target.value as InvitationCategory })}
            ><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
            <button
              className="removeGuestRow"
              type="button"
              aria-label={`Remove guest ${index + 1}`}
              disabled={isPending || rows.length === 1}
              onClick={() => {
                dismissSuccess();
                setRows((current) => current.filter((item) => item.id !== row.id));
              }}
            >×</button>
          </div>
        ))}
      </div>
      <button className="addAnotherGuest" type="button" onClick={addRow} disabled={isPending || rows.length >= 50}><span aria-hidden="true">+</span> Add plus-one or another guest</button>
      {rows.length > 1 && groupMode === "none" && <p className="addGuestHint">These guests will be saved as a group. Only one phone number is needed — plus-ones do not need a number or a “texts via” guest.</p>}
      <fieldset className="guestGroupField">
        <legend>Group <span>Optional · applies to everyone above</span></legend>
        <input type="hidden" name="group_mode" value={groupMode} />
        {groupMode !== "new" && <div className="groupSelectRow">
          <select
            name="existing_group_id"
            value={selectedGroupId}
            onChange={(event) => {
              dismissSuccess();
              setSelectedGroupId(event.target.value);
              setGroupMode(event.target.value ? "existing" : "none");
            }}
            aria-label="Guest group"
          >
            <option value="">No group</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
          <button className="secondary" type="button" onClick={() => { dismissSuccess(); setGroupMode("new"); }}>Create new group</button>
        </div>}
        {groupMode === "new" && <div className="groupSelectRow">
          <input name="new_group_name" required maxLength={100} placeholder="e.g. University friends" aria-label="New group name" autoFocus />
          <button className="secondary" type="button" onClick={() => { dismissSuccess(); setGroupMode(selectedGroupId ? "existing" : "none"); }}>Use existing</button>
        </div>}
      </fieldset>
      {result && (result.status === "error" || showSuccess) && (
        <p className={`addGuestFeedback ${result.status}`} role={result.status === "error" ? "alert" : "status"}>{result.message}</p>
      )}
      <div className="addGuestSubmit"><button type="submit" disabled={isPending}>{isPending ? "Saving…" : `Save ${rows.length} guest${rows.length === 1 ? "" : "s"}`}</button></div>
    </form>
  );
}
