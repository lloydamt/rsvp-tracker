import { addGuest, sendInvite, updateGuest } from "@/app/actions";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import Link from "next/link";
import { BulkActions } from "./bulk-actions";
import { DeleteGuestForm } from "./delete-guest-form";

export const dynamic = "force-dynamic";

const filters = ["attending", "pending", "declined"] as const;

const previewGroups = [
  { id: "preview-group-1", name: "Bride's family" },
  { id: "preview-group-2", name: "Groom's family" },
  { id: "preview-group-3", name: "University friends" },
];

function createPreviewGuests(count: number): Guest[] {
  const firstNames = ["Ada", "Michael", "Tadiwa", "Amara", "Daniel", "Grace", "Noah", "Olivia", "Samuel", "Zara", "Theo", "Maya"];
  const lastNames = ["Thomas", "Williams", "Okafor", "Patel", "Johnson", "Mensah", "Clarke", "Adeyemi", "Taylor", "Brown"];

  return Array.from({ length: count }, (_, index) => {
    const status = filters[index % filters.length];
    return {
      id: `preview-guest-${index + 1}`,
      name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]} ${index + 1}`,
      phone: `+447700${String(900000 + index).slice(-6)}`,
      token: `preview-token-${index + 1}`,
      group_id: index % 4 === 0 ? previewGroups[index % previewGroups.length].id : null,
      invitation_category: index % 3 === 0 ? "reception_only" : "ceremony_reception",
      status,
      party_size: status === "declined" ? 0 : (index % 4) + 1,
      notes: index % 17 === 0 ? "Vegetarian meal, please." : null,
      message_sent_at: index % 5 === 0 ? null : new Date(Date.now() - index * 60_000).toISOString(),
      responded_at: status === "pending" ? null : new Date(Date.now() - index * 60_000).toISOString(),
      created_at: new Date(Date.now() - index * 60_000).toISOString(),
    };
  });
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string; preview?: string }> }) {
  const query = await searchParams;
  const isPreview = query.preview === "300";
  const requestedStatus = query.status;
  const activeStatus = filters.find((status) => status === requestedStatus);
  const activeCategory = query.category === "ceremony_reception" || query.category === "reception_only" ? query.category : undefined;
  let guests: Guest[];
  let groups: { id: string; name: string }[];
  if (isPreview) {
    guests = createPreviewGuests(300);
    groups = previewGroups;
  } else {
    const { data, error } = await getSupabaseAdmin().from("guests").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    guests = (data ?? []) as Guest[];
    const { data: storedGroups, error: groupsError } = await getSupabaseAdmin().from("guest_groups").select("id,name").order("name");
    if (groupsError) throw new Error(groupsError.message);
    groups = storedGroups ?? [];
  }
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  const counts = {
    attending: guests.filter((guest) => guest.status === "attending").length,
    pending: guests.filter((guest) => guest.status === "pending").length,
    declined: guests.filter((guest) => guest.status === "declined").length,
  };
  const categoryCounts = {
    ceremony_reception: guests.filter((guest) => guest.invitation_category === "ceremony_reception").length,
    reception_only: guests.filter((guest) => guest.invitation_category === "reception_only").length,
  };
  const visibleGuests = guests.filter((guest) => (!activeStatus || guest.status === activeStatus) && (!activeCategory || guest.invitation_category === activeCategory));
  const previewSuffix = isPreview ? "&preview=300" : "";
  const categorySuffix = activeCategory ? `&category=${activeCategory}` : "";
  const statusSuffix = activeStatus ? `&status=${activeStatus}` : "";

  return (
    <main className="container">
      <header className="pageHeader">
        <div><p className="eyebrow">Organizer view</p><h1>Guest list</h1></div>
        <div className="summary"><strong>{guests.length}</strong> total guests</div>
      </header>

      {isPreview && <div className="previewBanner"><span><strong>Preview mode:</strong> 300 generated guests. Nothing here is stored in the database.</span><Link href="/admin">Exit preview</Link></div>}

      <section className="responseOverview" aria-label="Filter guests by RSVP response">
        <Link className={`responseStat attending ${activeStatus === "attending" ? "active" : ""}`} href={`/admin?status=attending${categorySuffix}${previewSuffix}`} aria-current={activeStatus === "attending" ? "page" : undefined}>
          <strong>{counts.attending}</strong><span>Attending</span>
        </Link>
        <Link className={`responseStat pending ${activeStatus === "pending" ? "active" : ""}`} href={`/admin?status=pending${categorySuffix}${previewSuffix}`} aria-current={activeStatus === "pending" ? "page" : undefined}>
          <strong>{counts.pending}</strong><span>Not responded</span>
        </Link>
        <Link className={`responseStat declined ${activeStatus === "declined" ? "active" : ""}`} href={`/admin?status=declined${categorySuffix}${previewSuffix}`} aria-current={activeStatus === "declined" ? "page" : undefined}>
          <strong>{counts.declined}</strong><span>Not attending</span>
        </Link>
      </section>

      <section className="categoryOverview" aria-label="Filter guests by invitation category">
        <Link className={`categoryStat fullDay ${activeCategory === "ceremony_reception" ? "active" : ""}`} href={`/admin?category=ceremony_reception${statusSuffix}${previewSuffix}`}>
          <strong>{categoryCounts.ceremony_reception}</strong><span>Ceremony &amp; reception</span>
        </Link>
        <Link className={`categoryStat receptionOnly ${activeCategory === "reception_only" ? "active" : ""}`} href={`/admin?category=reception_only${statusSuffix}${previewSuffix}`}>
          <strong>{categoryCounts.reception_only}</strong><span>Reception only</span>
        </Link>
      </section>

      {(activeStatus || activeCategory) && <div className="filterBar"><span>Showing filtered guests</span><Link href={isPreview ? "/admin?preview=300" : "/admin"}>Clear filters</Link></div>}

      {!isPreview && <section className="card">
        <h2>Add a guest</h2>
        <form action={addGuest} className="inlineForm">
          <label>Name<input name="name" required maxLength={100} placeholder="Ada Lovelace" /></label>
          <label>Phone<input name="phone" required inputMode="tel" autoComplete="tel" placeholder="07700900123 or +447700900123" /></label>
          <label>Invitation<select name="invitation_category" required defaultValue="ceremony_reception"><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
          <button type="submit">Add guest</button>
        </form>
      </section>}

      {!isPreview && visibleGuests.length > 0 && <BulkActions groups={groups} />}

      <section className="guestList">
        {guests.length === 0 && <div className="card empty">No guests yet. Add your first guest above.</div>}
        {guests.length > 0 && visibleGuests.length === 0 && <div className="card empty">No guests match this response filter.</div>}
        {visibleGuests.map((guest) => (
          <details className="guestCard" key={guest.id}>
            <summary className={`guestSummary ${isPreview ? "preview" : ""}`}>
              {!isPreview && <input className="guestCheckbox" type="checkbox" name="guest_ids" value={guest.id} form="bulk-guest-form" aria-label={`Select ${guest.name}`} />}
              <span className="guestIdentity"><strong>{guest.name}</strong><span>{guest.phone}</span></span>
              <span className="guestResponse">
              <span className={`badge ${guest.status}`}>{guest.status === "pending" ? "Not responded" : guest.status === "declined" ? "Not attending" : "Attending"}</span>
              {guest.status === "attending" && <span className="muted"> · party of {guest.party_size}</span>}
              <span className={`invitationBadge ${guest.invitation_category}`}>{guest.invitation_category === "ceremony_reception" ? "Ceremony + reception" : "Reception only"}</span>
              {guest.group_id && <span className="groupBadge">{groupNames.get(guest.group_id) ?? "Group"}</span>}
              </span>
              <span className="expandHint">{isPreview ? "View" : "Manage"}</span>
            </summary>
            <div className="guestDetails">
              {isPreview && <p className="previewDetail">Generated preview guest — management actions are disabled.</p>}
              {!isPreview && <form action={updateGuest} className="guestEditForm">
                <input type="hidden" name="id" value={guest.id} />
                <label>Name<input name="name" required maxLength={100} defaultValue={guest.name} /></label>
                <label>Phone<input name="phone" required inputMode="tel" autoComplete="tel" defaultValue={guest.phone} /></label>
                <label>Invitation<select name="invitation_category" required defaultValue={guest.invitation_category}><option value="ceremony_reception">Ceremony &amp; reception</option><option value="reception_only">Reception only</option></select></label>
                <button className="secondary" type="submit">Save changes</button>
              </form>}
              {guest.notes && <p className="guestNote">Guest note: “{guest.notes}”</p>}
              {!isPreview && <div className="guestActions">
                <form action={sendInvite}>
                  <input type="hidden" name="id" value={guest.id} />
                  <button className="secondary" type="submit">{guest.message_sent_at ? "Resend text" : "Send text"}</button>
                </form>
                <DeleteGuestForm id={guest.id} name={guest.name} />
              </div>}
            </div>
          </details>
        ))}
      </section>
    </main>
  );
}
