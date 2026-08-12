import { notFound } from "next/navigation";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import { GroupRsvpForm } from "./group-rsvp-form";
import { IndividualRsvpForm } from "./individual-rsvp-form";

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
          <div className="rsvpIntro">
            <p className="eyebrow">{invitationLabel} · Group invitation</p>
            <h1>Hello, {guest.name}</h1>
            <p>You can respond for yourself, selected people, or your whole group.</p>
          </div>
          {saved === "1" && <p className="success">Thanks — the selected responses have been saved.</p>}
          <GroupRsvpForm
            token={invitationToken}
            ownerId={guest.id}
            ownerStatus={guest.status}
            initialNotes={guest.notes}
            members={orderedMembers}
          />
          <footer className="rsvpFooter">
            <a className="moreInfoLink" href={informationUrl} target="_blank" rel="noopener noreferrer">View {invitationLabel.toLowerCase()} information <span aria-hidden="true">↗</span></a>
            <p className="privacy"><span aria-hidden="true">◇</span> This private link shows only the people in your group.</p>
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className="centered">
      <section className="card rsvpCard">
        <div className="rsvpIntro">
          <p className="eyebrow">{invitationLabel}</p>
          <h1>Hello, {guest.name}</h1>
          <p>Please let us know whether you’ll be joining us.</p>
        </div>
        {saved === "1" && <p className="success">Thanks — your RSVP has been saved.</p>}
        <IndividualRsvpForm token={invitationToken} initialStatus={guest.status} initialNotes={guest.notes} />
        <footer className="rsvpFooter">
          <a className="moreInfoLink" href={informationUrl} target="_blank" rel="noopener noreferrer">View {invitationLabel.toLowerCase()} information <span aria-hidden="true">↗</span></a>
          <p className="privacy"><span aria-hidden="true">◇</span> This private link shows only your invitation and response.</p>
        </footer>
      </section>
    </main>
  );
}
