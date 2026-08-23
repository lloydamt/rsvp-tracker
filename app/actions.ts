"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createUniqueGuestTokens, isGuestToken, isTokenUniqueViolation, normalizeGuestToken } from "@/lib/guest-token";
import { getSupabaseAdmin, InvitationCategory, RsvpStatus } from "@/lib/supabase";
import { sendRsvpInvitation } from "@/lib/messaging";
import { inviteDestination, isSmsViaRecipient, isUkPhone, parseGuestPhone } from "@/lib/phone";

async function invitationBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      const isLocalUrl = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (process.env.NODE_ENV !== "production" || !isLocalUrl) return url.origin;
    } catch {
      // In production, fall through to the public request origin so an invalid
      // local setting cannot leak into invitation texts.
    }
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0].trim() || requestHeaders.get("host");
  if (host) {
    const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
    const protocol = forwardedProtocol || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return new URL(`${protocol}://${host}`).origin;
  }

  throw new Error("Set NEXT_PUBLIC_APP_URL to the public HTTPS URL for this site.");
}

export type AddGuestsResult = {
  status: "success" | "error";
  message: string;
  phoneErrors?: string[];
};

function cleanSmsViaGuestId(value: FormDataEntryValue | null) {
  const id = String(value ?? "").trim();
  return id || null;
}

function formValues(formData: FormData, name: string, count: number) {
  const values = formData.getAll(name);
  return Array.from({ length: count }, (_, index) => values[index] ?? "");
}

function resolveAddGuestsGroup(formData: FormData) {
  const declared = String(formData.get("group_mode") ?? "none");
  const existingId = String(formData.get("existing_group_id") ?? "").trim();
  const newName = String(formData.get("new_group_name") ?? "").trim();
  if (declared === "new" || (declared !== "existing" && newName)) {
    return { mode: "new" as const, existingId: "", newName };
  }
  if (declared === "existing" || existingId) {
    return { mode: "existing" as const, existingId, newName: "" };
  }
  return { mode: "none" as const, existingId: "", newName: "" };
}

function isSmsViaForeignKeyViolation(error: { code?: string; message?: string; details?: string }) {
  if (error.code !== "23503") return false;
  return /sms_via/i.test(`${error.message ?? ""} ${error.details ?? ""}`);
}

const smsViaRecipientInUseMessage = "Reassign international guests who receive texts via this person first.";

type SmsViaGuest = { id: string; name: string; phone: string | null; sms_via_guest_id: string | null };

async function loadSmsViaGuests(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, SmsViaGuest>();
  const { data, error } = await getSupabaseAdmin().from("guests").select("id,name,phone,sms_via_guest_id").in("id", uniqueIds);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((guest) => [guest.id, guest]));
}

async function resolveSavedSmsVia(phone: string | null, smsViaGuestId: string | null, exceptId?: string) {
  if (!phone) return null;
  if (!smsViaGuestId) {
    if (isUkPhone(phone)) return null;
    throw new Error("Choose a guest with a UK number to receive this invitation text.");
  }
  if (smsViaGuestId === exceptId) throw new Error("A guest cannot receive their own invitation texts.");
  const viaGuests = await loadSmsViaGuests([smsViaGuestId]);
  const viaGuest = viaGuests.get(smsViaGuestId);
  if (!viaGuest || !isSmsViaRecipient(viaGuest)) {
    throw new Error("Choose a guest with a UK number to receive this invitation text.");
  }
  return viaGuest.id;
}

async function assertNotSmsViaRecipient(ids: string[], exceptIds: string[] = []) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("guests").select("id,name,sms_via_guest_id").in("sms_via_guest_id", uniqueIds);
  if (error) throw new Error(error.message);
  const excluded = new Set(exceptIds);
  const blocking = (data ?? []).filter((guest) => !excluded.has(guest.id));
  if (blocking.length > 0) throw new Error(smsViaRecipientInUseMessage);
}

async function groupHasPhone(
  groupId: string,
  exceptIds: string[] = [],
) {
  const { data, error } = await getSupabaseAdmin().from("guests").select("id,phone").eq("group_id", groupId);
  if (error) throw new Error(error.message);
  const excluded = new Set(exceptIds);
  return (data ?? []).some((guest) => !excluded.has(guest.id) && Boolean(guest.phone));
}

function isPhoneUniqueViolation(error: { code?: string; message?: string; details?: string }) {
  if (error.code !== "23505") return false;
  return /phone/i.test(`${error.message ?? ""} ${error.details ?? ""}`);
}

function cleanInvitationCategory(value: FormDataEntryValue | null): InvitationCategory {
  const category = String(value ?? "");
  if (category === "ceremony_reception" || category === "reception_only") return category;
  throw new Error("Choose an invitation category.");
}

function cleanGroupName(value: FormDataEntryValue | null) {
  const name = String(value ?? "").trim();
  if (!name || name.length > 100) throw new Error("Enter a group name under 100 characters.");
  return name;
}

function groupErrorMessage(error: { code?: string; message: string }) {
  return error.code === "23505" ? "A group with that name already exists." : error.message;
}

async function insertGuestGroup(name: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("guest_groups")
    .insert({ name, sort_order: await nextSortOrder("guest_groups") })
    .select("id")
    .single();
  if (error) throw Object.assign(new Error(groupErrorMessage(error)), { code: error.code });
  return data.id;
}

async function insertUniqueGuestGroup(baseName: string) {
  const root = baseName.trim().slice(0, 100) || "Group";
  for (let attempt = 1; attempt <= 20; attempt++) {
    const suffix = attempt === 1 ? "" : ` (${attempt})`;
    const name = `${root.slice(0, Math.max(1, 100 - suffix.length))}${suffix}`;
    try {
      return await insertGuestGroup(name);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "23505") throw error;
    }
  }
  throw new Error("Could not create a group for these guests. Please choose a group name.");
}

async function deleteGroupsWithoutMembers(groupIds: Array<string | null>) {
  const affectedGroupIds = [...new Set(groupIds.filter((id): id is string => Boolean(id)))];
  if (affectedGroupIds.length === 0) return;

  const supabase = getSupabaseAdmin();
  const { data: remainingMembers, error: memberError } = await supabase
    .from("guests")
    .select("group_id")
    .in("group_id", affectedGroupIds);
  if (memberError) throw new Error(memberError.message);

  const groupsWithMembers = new Set((remainingMembers ?? []).map((guest) => guest.group_id).filter(Boolean));
  const emptyGroupIds = affectedGroupIds.filter((id) => !groupsWithMembers.has(id));
  if (emptyGroupIds.length === 0) return;

  const { error: groupError } = await supabase.from("guest_groups").delete().in("id", emptyGroupIds);
  if (groupError) throw new Error(groupError.message);
}

async function nextSortOrder(table: "guests" | "guest_groups") {
  const { data, error } = await getSupabaseAdmin().from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return ((data ?? [])[0]?.sort_order ?? -1) + 1;
}

export async function addGuests(formData: FormData): Promise<AddGuestsResult> {
  try {
    const names = formData.getAll("guest_name");
    if (names.length === 0 || names.length > 50) {
      return { status: "error", message: "Add between 1 and 50 guests at a time." };
    }
    const phones = formValues(formData, "guest_phone", names.length);
    const categories = formValues(formData, "guest_invitation_category", names.length);
    const smsViaIds = formValues(formData, "guest_sms_via_guest_id", names.length);

    const phoneErrors = Array.from({ length: names.length }, () => "");
    const guests: { name: string; phone: string | null; invitation_category: InvitationCategory; sms_via_guest_id: string | null }[] = [];
    const messages: string[] = [];

    for (let index = 0; index < names.length; index++) {
      const name = String(names[index]).trim();
      if (!name || name.length > 100) messages.push(`Enter a name under 100 characters for guest ${index + 1}.`);

      const parsedPhone = parseGuestPhone(phones[index]);
      if (!parsedPhone.ok) phoneErrors[index] = parsedPhone.error;

      let invitationCategory: InvitationCategory | null = null;
      try {
        invitationCategory = cleanInvitationCategory(categories[index]);
      } catch (error) {
        messages.push(error instanceof Error ? error.message : "Choose an invitation category.");
      }

      guests.push({
        name,
        phone: parsedPhone.ok ? parsedPhone.phone : null,
        invitation_category: invitationCategory ?? "ceremony_reception",
        sms_via_guest_id: cleanSmsViaGuestId(smsViaIds[index]),
      });
    }

    const seenPhones = new Set<string>();
    for (let index = 0; index < guests.length; index++) {
      const phone = guests[index].phone;
      if (!phone || phoneErrors[index]) continue;
      if (seenPhones.has(phone)) {
        phoneErrors[index] = "This phone number is used more than once.";
        continue;
      }
      seenPhones.add(phone);
    }

    const supabase = getSupabaseAdmin();
    const uniquePhones = [...seenPhones];
    if (uniquePhones.length > 0) {
      const { data: existingGuests, error: existingPhoneError } = await supabase.from("guests").select("phone").in("phone", uniquePhones);
      if (existingPhoneError) return { status: "error", message: existingPhoneError.message };
      const existingPhones = new Set((existingGuests ?? []).map((guest) => guest.phone));
      for (let index = 0; index < guests.length; index++) {
        const phone = guests[index].phone;
        if (!phone || !existingPhones.has(phone)) continue;
        phoneErrors[index] = "This phone number is already in the guest list.";
      }
    }

    const requestedViaIds = [...new Set(guests.map((guest) => guest.sms_via_guest_id).filter((id): id is string => Boolean(id)))];
    let viaById = new Map<string, SmsViaGuest>();
    if (requestedViaIds.length > 0) {
      try {
        viaById = await loadSmsViaGuests(requestedViaIds);
      } catch (error) {
        return { status: "error", message: error instanceof Error ? error.message : "Those guests could not be saved. Please try again." };
      }
    }
    for (let index = 0; index < guests.length; index++) {
      if (phoneErrors[index]) continue;
      const guest = guests[index];
      if (!guest.phone) {
        guest.sms_via_guest_id = null;
        continue;
      }
      if (!guest.sms_via_guest_id) {
        if (!isUkPhone(guest.phone)) phoneErrors[index] = "Choose a guest with a UK number to receive this invitation text.";
        continue;
      }
      const viaGuest = viaById.get(guest.sms_via_guest_id);
      if (!viaGuest || !isSmsViaRecipient(viaGuest)) {
        phoneErrors[index] = "Choose a guest with a UK number to receive this invitation text.";
      }
    }

    if (phoneErrors.some(Boolean)) {
      return {
        status: "error",
        message: messages[0] ?? "Fix the highlighted phone numbers and try again.",
        phoneErrors,
      };
    }
    if (messages.length > 0) return { status: "error", message: messages[0] };

    const group = resolveAddGuestsGroup(formData);
    let groupId: string | null = null;
    let createdGroupId: string | null = null;
    const batchHasPhone = guests.some((guest) => guest.phone);
    const batchHasPlusOne = guests.some((guest) => !guest.phone);

    if (group.mode === "none") {
      if (batchHasPlusOne && guests.length >= 2 && batchHasPhone) {
        try {
          groupId = await insertUniqueGuestGroup(guests[0].name);
          createdGroupId = groupId;
        } catch (error) {
          return { status: "error", message: error instanceof Error ? error.message : "Those guests could not be saved. Please try again." };
        }
      } else {
        for (let index = 0; index < guests.length; index++) {
          if (guests[index].phone) continue;
          phoneErrors[index] = "Add a phone number, or put this guest in a group with someone who has one.";
        }
        if (phoneErrors.some(Boolean)) {
          return {
            status: "error",
            message: "Fix the highlighted phone numbers and try again.",
            phoneErrors,
          };
        }
      }
    } else if (group.mode === "existing") {
      const requestedGroupId = group.existingId;
      if (!requestedGroupId) return { status: "error", message: "Choose an existing group." };
      const { data: selectedGroup, error } = await supabase.from("guest_groups").select("id").eq("id", requestedGroupId).maybeSingle();
      if (error) return { status: "error", message: error.message };
      if (!selectedGroup) return { status: "error", message: "The selected group no longer exists." };
      if (!batchHasPhone && !(await groupHasPhone(selectedGroup.id))) {
        return { status: "error", message: "This group needs at least one guest with a phone number." };
      }
      groupId = selectedGroup.id;
    } else if (group.mode === "new") {
      if (!batchHasPhone) return { status: "error", message: "Add a phone number for at least one guest in this group." };
      try {
        groupId = await insertGuestGroup(cleanGroupName(group.newName || formData.get("new_group_name")));
        createdGroupId = groupId;
      } catch (error) {
        return { status: "error", message: error instanceof Error ? error.message : "Enter a group name under 100 characters." };
      }
    } else {
      return { status: "error", message: "Choose a valid group option." };
    }

    let insertError: { code?: string; message: string; details?: string } | null = null;
    const firstSortOrder = await nextSortOrder("guests");
    for (let attempt = 0; attempt < 5; attempt++) {
      const tokens = createUniqueGuestTokens(guests.length);
      const { error } = await supabase.from("guests").insert(guests.map((guest, index) => ({
        ...guest,
        group_id: groupId,
        token: tokens[index],
        sort_order: firstSortOrder + index,
      })));
      if (!error) {
        revalidatePath("/admin");
        return { status: "success", message: `${guests.length} guest${guests.length === 1 ? " was" : "s were"} added.` };
      }
      insertError = error;
      if (isTokenUniqueViolation(error) && attempt < 4) continue;
      break;
    }
    if (insertError && createdGroupId) await supabase.from("guest_groups").delete().eq("id", createdGroupId);
    if (insertError?.code === "23505" && isTokenUniqueViolation(insertError)) {
      return { status: "error", message: "Could not create unique RSVP codes. Please try again." };
    }
    if (insertError && isPhoneUniqueViolation(insertError)) {
      const conflictText = `${insertError.details ?? ""} ${insertError.message ?? ""}`;
      const conflictErrors = guests.map((guest) => (guest.phone && conflictText.includes(guest.phone) ? "This phone number is already in the guest list." : ""));
      return {
        status: "error",
        message: "Fix the highlighted phone numbers and try again.",
        phoneErrors: conflictErrors.some(Boolean) ? conflictErrors : undefined,
      };
    }
    return { status: "error", message: insertError?.message ?? "Those guests could not be saved. Please try again." };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Those guests could not be saved. Please try again." };
  }
}

export async function createGroup(formData: FormData) {
  const name = cleanGroupName(formData.get("name"));
  const { error } = await getSupabaseAdmin().from("guest_groups").insert({ name, sort_order: await nextSortOrder("guest_groups") });
  if (error) throw new Error(groupErrorMessage(error));
  revalidatePath("/admin");
}

export async function reorderGroups(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0 || uniqueIds.length !== ids.length) throw new Error("Those groups could not be reordered.");

  const supabase = getSupabaseAdmin();
  const { data: groups, error } = await supabase.from("guest_groups").select("id").in("id", uniqueIds);
  if (error) throw new Error(error.message);
  if ((groups ?? []).length !== uniqueIds.length) throw new Error("Those groups could not be reordered.");

  for (const [index, id] of uniqueIds.entries()) {
    const { error: updateError } = await supabase.from("guest_groups").update({ sort_order: index }).eq("id", id);
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath("/admin");
}

export async function reorderUngroupedGuests(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0 || uniqueIds.length !== ids.length) throw new Error("Those guests could not be reordered.");

  const supabase = getSupabaseAdmin();
  const { data: guests, error } = await supabase.from("guests").select("id,group_id").in("id", uniqueIds);
  if (error) throw new Error(error.message);
  if ((guests ?? []).length !== uniqueIds.length) throw new Error("Those guests could not be reordered.");
  if ((guests ?? []).some((guest) => guest.group_id)) throw new Error("Only ungrouped guests can be rearranged.");

  for (const [index, id] of uniqueIds.entries()) {
    const { error: updateError } = await supabase.from("guests").update({ sort_order: index }).eq("id", id);
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath("/admin");
}

export async function renameGroup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = cleanGroupName(formData.get("name"));
  if (!id) throw new Error("Group not found.");
  const { data, error } = await getSupabaseAdmin().from("guest_groups").update({ name }).eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(groupErrorMessage(error));
  if (!data) throw new Error("Group not found.");
  revalidatePath("/admin");
}

export async function deleteGroup(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Group not found.");
  const supabase = getSupabaseAdmin();
  const { data: members, error: memberError } = await supabase.from("guests").select("phone").eq("group_id", id);
  if (memberError) throw new Error(memberError.message);
  if ((members ?? []).some((guest) => !guest.phone)) {
    throw new Error("Add a phone number to plus-ones, or delete them, before deleting this group.");
  }
  const { data, error } = await supabase.from("guest_groups").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Group not found.");
  revalidatePath("/admin");
}

export async function updateGuest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const parsedPhone = parseGuestPhone(formData.get("phone"));
  const invitationCategory = cleanInvitationCategory(formData.get("invitation_category"));
  const requestedSmsViaGuestId = cleanSmsViaGuestId(formData.get("sms_via_guest_id"));
  if (!id) throw new Error("Guest not found.");
  if (!name || name.length > 100) throw new Error("Enter a guest name under 100 characters.");
  if (!parsedPhone.ok) throw new Error(parsedPhone.error);

  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase.from("guests").select("id,group_id").eq("id", id).maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) throw new Error("Guest not found.");
  if (!parsedPhone.phone) {
    if (!current.group_id) throw new Error("Ungrouped guests need a phone number.");
    if (!(await groupHasPhone(current.group_id, [id]))) {
      throw new Error("This group needs at least one guest with a phone number.");
    }
  }

  const { count, error: dependentsError } = await supabase.from("guests").select("id", { count: "exact", head: true }).eq("sms_via_guest_id", id);
  if (dependentsError) throw new Error(dependentsError.message);
  if ((count ?? 0) > 0) {
    if (requestedSmsViaGuestId) throw new Error("Reassign guests who receive texts via this person before sending their texts elsewhere.");
    if (!isUkPhone(parsedPhone.phone)) throw new Error("Reassign guests who receive texts via this person before changing this number.");
  }

  const smsViaGuestId = await resolveSavedSmsVia(parsedPhone.phone, requestedSmsViaGuestId, id);

  const { data, error } = await supabase
    .from("guests")
    .update({ name, phone: parsedPhone.phone, invitation_category: invitationCategory, sms_via_guest_id: smsViaGuestId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.code === "23505" ? "That phone number is already in the guest list." : error.message);
  if (!data) throw new Error("Guest not found.");
  revalidatePath("/admin");
}

export async function deleteGuest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Guest not found.");

  const supabase = getSupabaseAdmin();
  const { data: current, error: currentError } = await supabase.from("guests").select("id,group_id,phone").eq("id", id).maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (!current) throw new Error("Guest not found.");
  if (current.group_id && current.phone && !(await groupHasPhone(current.group_id, [id]))) {
    const { data: remaining, error: remainingError } = await supabase.from("guests").select("id").eq("group_id", current.group_id).neq("id", id);
    if (remainingError) throw new Error(remainingError.message);
    if ((remaining ?? []).length > 0) {
      throw new Error("Add a phone number to another group member before deleting this guest.");
    }
  }

  await assertNotSmsViaRecipient([id]);

  const { data, error } = await supabase
    .from("guests")
    .delete()
    .eq("id", id)
    .select("id,group_id")
    .maybeSingle();
  if (error) throw new Error(isSmsViaForeignKeyViolation(error) ? smsViaRecipientInUseMessage : error.message);
  if (!data) throw new Error("Guest not found.");
  await deleteGroupsWithoutMembers([data.group_id]);
  revalidatePath("/admin");
}

export async function bulkGuestOperation(formData: FormData) {
  const operation = String(formData.get("operation") ?? "");
  const ids = [...new Set(formData.getAll("guest_ids").map(String).filter(Boolean))].slice(0, 300);
  if (ids.length === 0) throw new Error("Select at least one guest.");

  const supabase = getSupabaseAdmin();
  if (operation === "set_category") {
    const invitationCategory = cleanInvitationCategory(formData.get("invitation_category"));
    const { error } = await supabase.from("guests").update({ invitation_category: invitationCategory }).in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return;
  }
  if (operation === "add_to_group") {
    const groupId = String(formData.get("existing_group_id") ?? "");
    if (!groupId) throw new Error("Choose an existing group.");
    const { data: selectedGuests, error: selectedGuestsError } = await supabase.from("guests").select("id,group_id").in("id", ids);
    if (selectedGuestsError) throw new Error(selectedGuestsError.message);
    if ((selectedGuests ?? []).some((guest) => guest.group_id)) throw new Error("Remove guests from their current group before adding them to another group.");
    const { data: group, error: groupError } = await supabase.from("guest_groups").select("id").eq("id", groupId).maybeSingle();
    if (groupError) throw new Error(groupError.message);
    if (!group) throw new Error("The selected group no longer exists.");
    const { error } = await supabase.from("guests").update({ group_id: group.id }).in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return;
  }

  if (operation === "ungroup") {
    const { data: selectedGuests, error: selectedGuestsError } = await supabase.from("guests").select("id,phone,group_id").in("id", ids);
    if (selectedGuestsError) throw new Error(selectedGuestsError.message);
    if ((selectedGuests ?? []).some((guest) => !guest.phone)) {
      throw new Error("Guests without a phone number must stay in a group.");
    }
    const groupIds = [...new Set((selectedGuests ?? []).map((guest) => guest.group_id).filter((id): id is string => Boolean(id)))];
    if (groupIds.length > 0) {
      const { data: members, error: memberError } = await supabase.from("guests").select("id,phone,group_id").in("group_id", groupIds);
      if (memberError) throw new Error(memberError.message);
      const selected = new Set(ids);
      const groupWouldLoseContact = groupIds.some((groupId) => {
        const remaining = (members ?? []).filter((guest) => guest.group_id === groupId && !selected.has(guest.id));
        return remaining.length > 0 && remaining.every((guest) => !guest.phone);
      });
      if (groupWouldLoseContact) throw new Error("Keep at least one guest with a phone number in the group.");
    }
    const { error } = await supabase.from("guests").update({ group_id: null }).in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return;
  }

  if (operation === "delete") {
    const { data: selectedGuests, error: selectedGuestsError } = await supabase.from("guests").select("id,phone,group_id").in("id", ids);
    if (selectedGuestsError) throw new Error(selectedGuestsError.message);
    const groupIds = [...new Set((selectedGuests ?? []).map((guest) => guest.group_id).filter((id): id is string => Boolean(id)))];
    if (groupIds.length > 0) {
      const { data: members, error: memberError } = await supabase.from("guests").select("id,phone,group_id").in("group_id", groupIds);
      if (memberError) throw new Error(memberError.message);
      const selected = new Set(ids);
      const groupWouldLoseContact = groupIds.some((groupId) => {
        const remaining = (members ?? []).filter((guest) => guest.group_id === groupId && !selected.has(guest.id));
        return remaining.length > 0 && remaining.every((guest) => !guest.phone);
      });
      if (groupWouldLoseContact) throw new Error("Add a phone number to another group member before deleting the last contact in the group.");
    }
    await assertNotSmsViaRecipient(ids, ids);
    const { error: clearViaError } = await supabase.from("guests").update({ sms_via_guest_id: null }).in("id", ids);
    if (clearViaError) throw new Error(clearViaError.message);
    const { error } = await supabase.from("guests").delete().in("id", ids);
    if (error) throw new Error(isSmsViaForeignKeyViolation(error) ? smsViaRecipientInUseMessage : error.message);
    await deleteGroupsWithoutMembers((selectedGuests ?? []).map((guest) => guest.group_id));
    revalidatePath("/admin");
    return;
  }

  if (operation !== "send") throw new Error("Invalid bulk operation.");
  const { data: guests, error } = await supabase.from("guests").select("id,name,phone,token,invitation_category,sms_via_guest_id").in("id", ids);
  if (error) return { status: "error" as const, message: "The invitation texts could not be attempted. Please try again." };

  let viaById: Map<string, SmsViaGuest>;
  try {
    viaById = await loadSmsViaGuests((guests ?? []).map((guest) => guest.sms_via_guest_id).filter((id): id is string => Boolean(id)));
  } catch (loadError) {
    return { status: "error" as const, message: loadError instanceof Error ? loadError.message : "The invitation texts could not be attempted. Please try again." };
  }

  const reachable: Array<{ guest: NonNullable<typeof guests>[number]; phone: string; viaName: string | null }> = [];
  const skippedNames: string[] = [];
  for (const guest of guests ?? []) {
    const resolved = inviteDestination(guest, guest.sms_via_guest_id ? viaById.get(guest.sms_via_guest_id) : null);
    if (resolved.ok) reachable.push({ guest, phone: resolved.destination.phone, viaName: resolved.destination.viaName });
    else skippedNames.push(guest.name);
  }
  if (reachable.length === 0) {
    return { status: "error" as const, message: "None of the selected guests can be texted." };
  }

  let appUrl: string;
  try {
    appUrl = await invitationBaseUrl();
  } catch (error) {
    return { status: "error" as const, message: error instanceof Error ? error.message : "The invitation URL could not be created." };
  }

  const sentIds: string[] = [];
  const failures: Array<{ name: string; reason: string }> = [];

  for (let index = 0; index < reachable.length; index += 10) {
    const batch = reachable.slice(index, index + 10);
    const results = await Promise.allSettled(batch.map((item) => sendRsvpInvitation({ ...item.guest, phone: item.phone }, appUrl)));
    results.forEach((result, resultIndex) => {
      const item = batch[resultIndex];
      if (result.status === "fulfilled") sentIds.push(item.guest.id);
      else failures.push({
        name: item.guest.name,
        reason: result.reason instanceof Error ? result.reason.message : "The messaging provider rejected the request.",
      });
    });
  }

  if (sentIds.length > 0) {
    const { error: updateError } = await supabase.from("guests").update({ message_sent_at: new Date().toISOString() }).in("id", sentIds);
    if (updateError) {
      return {
        status: "success" as const,
        message: `${sentIds.length} invitation text${sentIds.length === 1 ? " was" : "s were"} sent, but the sent status could not be saved.`,
      };
    }
  }
  revalidatePath("/admin");
  const skippedSummary = skippedNames.length > 0 ? ` Skipped ${skippedNames.length} who cannot be texted: ${skippedNames.join(", ")}.` : "";
  if (failures.length > 0) {
    const sentSummary = sentIds.length > 0 ? `${sentIds.length} sent. ` : "";
    const reasons = [...new Set(failures.map((failure) => failure.reason))];
    return {
      status: "error" as const,
      message: `${sentSummary}Texting failed for: ${failures.map((failure) => failure.name).join(", ")}. ${reasons.join(" ")}${skippedSummary}`,
    };
  }
  return {
    status: "success" as const,
    message: `${sentIds.length} invitation text${sentIds.length === 1 ? " was" : "s were"} sent.${skippedSummary}`,
  };
}

export async function sendInvite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = getSupabaseAdmin();
  const { data: guest, error } = await supabase.from("guests").select("id,name,phone,token,invitation_category,sms_via_guest_id").eq("id", id).single();
  if (error || !guest) return { status: "error" as const, message: "The text could not be attempted because the guest was not found." };

  let viaGuest: SmsViaGuest | null = null;
  if (guest.sms_via_guest_id) {
    try {
      viaGuest = (await loadSmsViaGuests([guest.sms_via_guest_id])).get(guest.sms_via_guest_id) ?? null;
    } catch (loadError) {
      return { status: "error" as const, message: loadError instanceof Error ? loadError.message : "The invitation texts could not be attempted. Please try again." };
    }
  }
  const resolved = inviteDestination(guest, viaGuest);
  if (!resolved.ok) return { status: "error" as const, message: resolved.message };

  try {
    const appUrl = await invitationBaseUrl();
    await sendRsvpInvitation({ ...guest, phone: resolved.destination.phone }, appUrl);
    const { error: updateError } = await supabase.from("guests").update({ message_sent_at: new Date().toISOString() }).eq("id", guest.id);
    revalidatePath("/admin");
    if (updateError) return { status: "success" as const, message: "Text sent, but the sent status could not be saved." };
    if (resolved.destination.viaName) return { status: "success" as const, message: `Text for ${guest.name} sent via ${resolved.destination.viaName}.` };
    return { status: "success" as const, message: `Text sent to ${guest.name}.` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The messaging provider rejected the request.";
    return { status: "error" as const, message: `The text to ${guest.name} could not be sent. ${reason}` };
  }
}

export async function openRsvpByCode(formData: FormData) {
  const code = normalizeGuestToken(String(formData.get("code") ?? ""));
  if (!isGuestToken(code)) return { status: "error" as const, message: "Enter the 6-character code from your invitation text." };
  redirect(`/rsvp/${code}`);
}

export async function submitRsvp(token: string, formData: FormData) {
  const status = String(formData.get("status") ?? "") as RsvpStatus;
  const partySize = Number(formData.get("party_size"));
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);
  if (!token || !["attending", "declined"].includes(status)) throw new Error("Invalid response.");
  if (!Number.isInteger(partySize) || partySize < 0 || partySize > 20) throw new Error("Party size must be between 0 and 20.");

  const { data, error } = await getSupabaseAdmin()
    .from("guests")
    .update({ status, party_size: status === "declined" ? 0 : partySize, notes: notes || null, responded_at: new Date().toISOString() })
    .eq("token", token)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("This invitation link is invalid.");
  redirect(`/rsvp/${token}?saved=1`);
}

export async function submitGroupRsvp(token: string, formData: FormData) {
  const status = String(formData.get("status") ?? "") as RsvpStatus;
  const scope = String(formData.get("scope") ?? "self");
  const selectedIds = [...new Set(formData.getAll("selected_ids").map(String).filter(Boolean))];
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 500);
  if (!token || !["attending", "declined"].includes(status)) throw new Error("Choose an RSVP response.");
  if (!["self", "selected", "group"].includes(scope)) throw new Error("Choose who this response applies to.");

  const supabase = getSupabaseAdmin();
  const { data: owner } = await supabase.from("guests").select("id,group_id").eq("token", token).maybeSingle();
  if (!owner?.group_id) throw new Error("This group invitation is invalid.");
  const { data: members, error: memberError } = await supabase.from("guests").select("id").eq("group_id", owner.group_id);
  if (memberError) throw new Error(memberError.message);
  const memberIds = new Set((members ?? []).map((member) => member.id));

  let targetIds: string[];
  if (scope === "self") targetIds = [owner.id];
  else if (scope === "group") targetIds = [...memberIds];
  else targetIds = [...new Set([owner.id, ...selectedIds.filter((id) => memberIds.has(id))])];
  if (targetIds.length === 0) throw new Error("Select at least one person from the group.");

  const { error } = await supabase.from("guests").update({
    status,
    party_size: status === "attending" ? 1 : 0,
    responded_at: new Date().toISOString(),
  }).in("id", targetIds);
  if (error) throw new Error(error.message);
  if (notes) await supabase.from("guests").update({ notes }).eq("id", owner.id);
  redirect(`/rsvp/${token}?saved=1`);
}
