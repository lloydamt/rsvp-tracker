"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin, InvitationCategory, RsvpStatus } from "@/lib/supabase";
import { sendRsvpInvitation } from "@/lib/messaging";

function cleanPhone(value: FormDataEntryValue | null) {
  const phone = String(value ?? "")
    .trim()
    .replace(/[\s()-]/g, "");

  if (/^0\d{10}$/.test(phone)) return `+44${phone.slice(1)}`;
  if (/^\+44\d{10}$/.test(phone)) return phone;

  throw new Error("Enter a UK number such as 07700900123 or +447700900123.");
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

export async function addGuest(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = cleanPhone(formData.get("phone"));
  const invitationCategory = cleanInvitationCategory(formData.get("invitation_category"));
  const groupMode = String(formData.get("group_mode") ?? "none");
  if (!name || name.length > 100) throw new Error("Enter a guest name under 100 characters.");

  const supabase = getSupabaseAdmin();
  let groupId: string | null = null;
  let createdGroupId: string | null = null;

  if (groupMode === "existing") {
    const requestedGroupId = String(formData.get("existing_group_id") ?? "");
    if (!requestedGroupId) throw new Error("Choose an existing group.");
    const { data: group, error } = await supabase.from("guest_groups").select("id").eq("id", requestedGroupId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!group) throw new Error("The selected group no longer exists.");
    groupId = group.id;
  } else if (groupMode === "new") {
    const groupName = cleanGroupName(formData.get("new_group_name"));
    const { data: group, error } = await supabase.from("guest_groups").insert({ name: groupName }).select("id").single();
    if (error) throw new Error(groupErrorMessage(error));
    groupId = group.id;
    createdGroupId = group.id;
  } else if (groupMode !== "none") {
    throw new Error("Choose a valid group option.");
  }

  const { error } = await supabase.from("guests").insert({
    name,
    phone,
    invitation_category: invitationCategory,
    group_id: groupId,
    token: randomBytes(32).toString("base64url"),
  });
  if (error && createdGroupId) await supabase.from("guest_groups").delete().eq("id", createdGroupId);
  if (error) throw new Error(error.code === "23505" ? "That phone number is already in the guest list." : error.message);
  revalidatePath("/admin");
}

export async function createGroup(formData: FormData) {
  const name = cleanGroupName(formData.get("name"));
  const { error } = await getSupabaseAdmin().from("guest_groups").insert({ name });
  if (error) throw new Error(groupErrorMessage(error));
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
  const { data, error } = await getSupabaseAdmin().from("guest_groups").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Group not found.");
  revalidatePath("/admin");
}

export async function updateGuest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = cleanPhone(formData.get("phone"));
  const invitationCategory = cleanInvitationCategory(formData.get("invitation_category"));
  if (!id) throw new Error("Guest not found.");
  if (!name || name.length > 100) throw new Error("Enter a guest name under 100 characters.");

  const { data, error } = await getSupabaseAdmin()
    .from("guests")
    .update({ name, phone, invitation_category: invitationCategory })
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

  const { data, error } = await getSupabaseAdmin()
    .from("guests")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Guest not found.");
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
    const { error } = await supabase.from("guests").update({ group_id: null }).in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return;
  }

  if (operation === "delete") {
    const { error } = await supabase.from("guests").delete().in("id", ids);
    if (error) throw new Error(error.message);
    revalidatePath("/admin");
    return;
  }

  if (operation !== "send") throw new Error("Invalid bulk operation.");
  const { data: guests, error } = await supabase.from("guests").select("id,name,phone,token,invitation_category").in("id", ids);
  if (error) throw new Error(error.message);

  const sentIds: string[] = [];
  const failures: string[] = [];

  for (let index = 0; index < (guests ?? []).length; index += 10) {
    const batch = (guests ?? []).slice(index, index + 10);
    const results = await Promise.allSettled(batch.map(sendRsvpInvitation));
    results.forEach((result, resultIndex) => {
      const guest = batch[resultIndex];
      if (result.status === "fulfilled") sentIds.push(guest.id);
      else failures.push(guest.name);
    });
  }

  if (sentIds.length > 0) {
    const { error: updateError } = await supabase.from("guests").update({ message_sent_at: new Date().toISOString() }).in("id", sentIds);
    if (updateError) throw new Error(updateError.message);
  }
  revalidatePath("/admin");
  if (failures.length > 0) throw new Error(`Texting failed for: ${failures.join(", ")}.`);
}

export async function sendInvite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = getSupabaseAdmin();
  const { data: guest, error } = await supabase.from("guests").select("id,name,phone,token,invitation_category").eq("id", id).single();
  if (error || !guest) throw new Error("Guest not found.");

  await sendRsvpInvitation(guest);
  await supabase.from("guests").update({ message_sent_at: new Date().toISOString() }).eq("id", guest.id);
  revalidatePath("/admin");
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
  else targetIds = selectedIds.filter((id) => memberIds.has(id));
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
