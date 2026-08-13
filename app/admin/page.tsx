import { sendInvite, updateGuest } from "@/app/actions";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import Link from "next/link";
import { BulkActions } from "./bulk-actions";
import { DeleteGuestForm } from "./delete-guest-form";
import { AddGuestForm } from "./add-guest-form";
import { GroupManager } from "./group-manager";

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
  const managedGroups = groups.map((group) => ({
    ...group,
    memberCount: guests.filter((guest) => guest.group_id === group.id).length,
  }));
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
  const filterHref = ({ status, category }: { status?: typeof activeStatus; category?: typeof activeCategory }) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (isPreview) params.set("preview", "300");
    return params.size > 0 ? `/admin?${params.toString()}` : "/admin";
  };

  return (
    <main className="container">
      <header className="pageHeader">
        <div><p className="eyebrow">Organizer view</p><h1>Guest list</h1></div>
        <div className="summary"><strong>{guests.length}</strong> total guests</div>
      </header>

      {isPreview && <div className="previewBanner"><span><strong>Preview mode:</strong> 300 generated guests. Nothing here is stored in the database.</span><Link href="/admin">Exit preview</Link></div>}

      <section className="guestFilters" aria-label="Filter guests">
        <div className="responseOverview" aria-label="Filter guests by RSVP response">
          <Link className={`responseStat attending ${activeStatus === "attending" ? "active" : ""}`} href={filterHref({ status: activeStatus === "attending" ? undefined : "attending", category: activeCategory })} aria-current={activeStatus === "attending" ? "page" : undefined}>
            <strong>{counts.attending}</strong><span>Attending</span>
          </Link>
          <Link className={`responseStat pending ${activeStatus === "pending" ? "active" : ""}`} href={filterHref({ status: activeStatus === "pending" ? undefined : "pending", category: activeCategory })} aria-current={activeStatus === "pending" ? "page" : undefined}>
            <strong>{counts.pending}</strong><span>Awaiting reply</span>
          </Link>
          <Link className={`responseStat declined ${activeStatus === "declined" ? "active" : ""}`} href={filterHref({ status: activeStatus === "declined" ? undefined : "declined", category: activeCategory })} aria-current={activeStatus === "declined" ? "page" : undefined}>
            <strong>{counts.declined}</strong><span>Declined</span>
          </Link>
        </div>

        <div className="categoryOverview" aria-label="Filter guests by invitation category">
          <span className="filterLabel">Invitation</span>
          <Link className={`categoryStat fullDay ${activeCategory === "ceremony_reception" ? "active" : ""}`} href={filterHref({ status: activeStatus, category: activeCategory === "ceremony_reception" ? undefined : "ceremony_reception" })}>
            Ceremony &amp; reception <strong>{categoryCounts.ceremony_reception}</strong>
          </Link>
          <Link className={`categoryStat receptionOnly ${activeCategory === "reception_only" ? "active" : ""}`} href={filterHref({ status: activeStatus, category: activeCategory === "reception_only" ? undefined : "reception_only" })}>
            Reception only <strong>{categoryCounts.reception_only}</strong>
          </Link>
        </div>
      </section>

      {!isPreview && <details className="addGuestPanel">
        <summary>
          <span className="addIcon" aria-hidden="true">+</span>
          <span><strong>Add guests</strong><small>Create one guest or several at once</small></span>
          <span className="addGuestCta">Add guests</span>
        </summary>
        <AddGuestForm groups={groups} />
      </details>}

      {!isPreview && <GroupManager groups={managedGroups} />}

      <div className="listHeading">
        <div><h2>Guests</h2><span>{visibleGuests.length} shown</span></div>
        {(activeStatus || activeCategory) && <Link href={filterHref({})}>Clear filters</Link>}
      </div>

      {!isPreview && visibleGuests.length > 0 && <BulkActions groups={managedGroups} />}

      <section className="guestList">
        {guests.length === 0 && <div className="card empty">No guests yet. Add your first guest above.</div>}
        {guests.length > 0 && visibleGuests.length === 0 && <div className="card empty">No guests match this response filter.</div>}
        {visibleGuests.map((guest) => (
          <details className="guestCard" key={guest.id}>
            <summary className={`guestSummary ${isPreview ? "preview" : ""}`}>
              {!isPreview && <input className="guestCheckbox" type="checkbox" name="guest_ids" value={guest.id} form="bulk-guest-form" data-grouped={guest.group_id ? "true" : "false"} aria-label={`Select ${guest.name}`} />}
              <span className="guestIdentity"><strong>{guest.name}</strong><span>{guest.phone}</span></span>
              <span className="guestResponse">
                <span className={`statusLabel ${guest.status}`}><i aria-hidden="true" />{guest.status === "pending" ? "Awaiting reply" : guest.status === "declined" ? "Declined" : "Attending"}</span>
                <span className="guestMeta">
                  {guest.invitation_category === "ceremony_reception" ? "Ceremony & reception" : "Reception only"}
                  {guest.status === "attending" && <> · Party of {guest.party_size}</>}
                  {guest.group_id && <> · {groupNames.get(guest.group_id) ?? "Group"}</>}
                </span>
              </span>
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
