import { notFound } from "next/navigation";
import { submitRsvp } from "@/app/actions";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import { GroupRsvpForm } from "./group-rsvp-form";

export const dynamic = "force-dynamic";

function categoryInfoUrl(category: Guest["invitation_category"]) {
  const configured = category === "ceremony_reception" ? process.env.CEREMONY_RECEPTION_INFO_URL : process.env.RECEPTION_ONLY_INFO_URL;
  try {
    const url = new URL(configured || "https://www.google.com");
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "https://www.google.com";
  } catch {
    return "https://www.google.com";
  }
}

export default async function RsvpPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { token } = await params;
  const { saved } = await searchParams;
  // Vonage's free-tier SMS service can append "[FREE]" directly to a message.
  // Some SMS clients then include that marker in the clickable URL.
  const invitationToken = token.replace(/(?:\[|%5B)FREE(?:\]|%5D)?$/i, "");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("guests")
    .select("id,name,status,party_size,notes,group_id,invitation_category")
    .eq("token", invitationToken)
    .maybeSingle();
  if (error) throw new Error(`Unable to load this invitation: ${error.message}`);
  if (!data) notFound();
  const guest = data as Pick<Guest, "id" | "name" | "status" | "party_size" | "notes" | "group_id" | "invitation_category">;
  const action = submitRsvp.bind(null, invitationToken);
  const informationUrl = categoryInfoUrl(guest.invitation_category);
  const invitationLabel = guest.invitation_category === "ceremony_reception" ? "Ceremony & reception" : "Reception only";

  if (guest.group_id) {
    const { data: members, error } = await supabase
      .from("guests")
      .select("id,name,status")
      .eq("group_id", guest.group_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const orderedMembers = [...(members ?? [])].sort((a, b) => Number(b.id === guest.id) - Number(a.id === guest.id));

    return (
      <main className="centered">
        <section className="card rsvpCard">
          <p className="eyebrow">{invitationLabel} · Group invitation</p>
          <h1>Hello, {guest.name}</h1>
          <p>You can respond for yourself, selected people, or your whole group.</p>
          <div className="groupRoster">{orderedMembers.map((member) => <span key={member.id}>{member.name}</span>)}</div>
          {saved === "1" && <p className="success">Thanks — the selected responses have been saved.</p>}
          <GroupRsvpForm
            token={invitationToken}
            ownerId={guest.id}
            ownerStatus={guest.status}
            initialNotes={guest.notes}
            members={orderedMembers}
          />
          <a className="moreInfoLink" href={informationUrl} target="_blank" rel="noopener noreferrer">View {invitationLabel.toLowerCase()} information <span aria-hidden="true">↗</span></a>
          <p className="privacy">This private link shows only the people in your group.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="centered">
      <section className="card rsvpCard">
        <p className="eyebrow">{invitationLabel}</p>
        <h1>Hello, {guest.name}</h1>
        <p>Please let us know whether you’ll be joining us.</p>
        {saved === "1" && <p className="success">Thanks — your RSVP has been saved.</p>}
        <form action={action} className="rsvpForm">
          <fieldset>
            <legend>Your response</legend>
            <label className="choice"><input type="radio" name="status" value="attending" required defaultChecked={guest.status === "attending"} /> Joyfully attending</label>
            <label className="choice"><input type="radio" name="status" value="declined" required defaultChecked={guest.status === "declined"} /> Unable to attend</label>
          </fieldset>
          <label>Number attending<input type="number" name="party_size" min="1" max="20" defaultValue={guest.party_size || 1} required /></label>
          <label>Note (optional)<textarea name="notes" maxLength={500} defaultValue={guest.notes ?? ""} placeholder="Dietary needs or a message…" /></label>
          <button type="submit">Save RSVP</button>
        </form>
        <a className="moreInfoLink" href={informationUrl} target="_blank" rel="noopener noreferrer">View {invitationLabel.toLowerCase()} information <span aria-hidden="true">↗</span></a>
        <p className="privacy">This private link shows only your invitation and response.</p>
      </section>
    </main>
  );
}
