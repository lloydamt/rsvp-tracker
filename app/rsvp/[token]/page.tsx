import { notFound } from "next/navigation";
import { isGuestToken, normalizeGuestToken } from "@/lib/guest-token";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import { GroupRsvpForm } from "./group-rsvp-form";
import { IndividualRsvpForm } from "./individual-rsvp-form";

export const dynamic = "force-dynamic";

function InvitationDate() {
  return (
    <div className="saveTheDate rsvpDate">
      <span className="dateRule" aria-hidden="true" />
      <p>
        <span>Save the date</span>
        <time dateTime="2026-10-24">October 24th, 2026</time>
      </p>
      <span className="dateRule" aria-hidden="true" />
    </div>
  );
}

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
  const invitationToken = normalizeGuestToken(token);
  if (!isGuestToken(invitationToken)) notFound();
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
  const invitationLabel = guest.invitation_category === "ceremony_reception" ? "Ceremony & reception" : "Wedding Reception";

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
            <InvitationDate />
            {guest.invitation_category === "ceremony_reception"
              ? <p>You’re invited to our wedding ceremony and reception. Please RSVP below for yourself, selected guests, or the whole group. If anyone can only attend one part, let us know in the Note section.</p>
              : <p>You’re invited to our wedding reception. Please RSVP below for yourself, selected guests, or the whole group.</p>}
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
            <p className="privacy"><span aria-hidden="true">◇</span> This page shows only the people in your group.</p>
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
          <InvitationDate />
          {guest.invitation_category === "ceremony_reception"
            ? <p>You’re invited to our wedding ceremony and reception. Please RSVP below. If you can only attend one part, let us know in the Note section.</p>
            : <p>You’re invited to our wedding reception. Please RSVP below.</p>}
        </div>
        {saved === "1" && <p className="success">Thanks — your RSVP has been saved.</p>}
        <IndividualRsvpForm token={invitationToken} initialStatus={guest.status} initialNotes={guest.notes} />
        <footer className="rsvpFooter">
          <a className="moreInfoLink" href={informationUrl} target="_blank" rel="noopener noreferrer">View {invitationLabel.toLowerCase()} information <span aria-hidden="true">↗</span></a>
          <p className="privacy"><span aria-hidden="true">◇</span> This page shows only your invitation and response.</p>
        </footer>
      </section>
    </main>
  );
}
