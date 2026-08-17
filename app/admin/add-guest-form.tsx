"use client";

import { useActionState, useEffect, useState } from "react";
import { addGuests, type AddGuestsResult } from "@/app/actions";

type InvitationCategory = "ceremony_reception" | "reception_only";
type GuestRow = {
  id: number;
  name: string;
  phone: string;
  invitationCategory: InvitationCategory;
  phoneError?: string;
};

function emptyRow(id: number): GuestRow {
  return { id, name: "", phone: "", invitationCategory: "ceremony_reception" };
}

export function AddGuestForm({ groups }: { groups: { id: string; name: string }[] }) {
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

  return (
    <form action={formAction} className="addGuestForm">
      <div className="multiGuestHeader">
        <div><strong>Guest details</strong><small>Add up to 50 guests in one go. Phone can be left blank for plus-ones if someone in the group has a number.</small></div>
        <span>{rows.length} guest{rows.length === 1 ? "" : "s"}</span>
      </div>
      <div className="guestRows">
        {rows.map((row, index) => (
          <div className={`guestInputRow${row.phoneError ? " hasError" : ""}`} key={row.id}>
            <span className="guestRowNumber" aria-hidden="true">{index + 1}</span>
            <label>Name<input name="guest_name" required maxLength={100} placeholder={index === 0 ? "Ada Lovelace" : "Guest name"} value={row.name} onChange={(event) => updateRow(row.id, { name: event.target.value })} /></label>
            <label>Phone<span className="optionalField">{groupMode === "none" && index === 0 ? "Required" : "Optional in a group"}</span><input
              name="guest_phone"
              required={groupMode === "none" && index === 0}
              inputMode="tel"
              autoComplete="tel"
              placeholder={index === 0 ? "07700 900123" : "Optional plus-one"}
              value={row.phone}
              aria-invalid={Boolean(row.phoneError)}
              aria-describedby={row.phoneError ? `guest-phone-error-${row.id}` : undefined}
              onChange={(event) => updateRow(row.id, { phone: event.target.value, phoneError: undefined })}
            />
              {row.phoneError && <small className="guestPhoneError" id={`guest-phone-error-${row.id}`} role="alert">{row.phoneError}</small>}
            </label>
            <label>Invitation<select
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
      {rows.length > 1 && groupMode === "none" && <p className="addGuestHint">Choose or create a group below to save plus-ones without a phone number.</p>}
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
