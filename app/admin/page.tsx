import { GUEST_TOKEN_ALPHABET } from "@/lib/guest-token";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import Link from "next/link";
import { BulkActions } from "./bulk-actions";
import { AddGuestForm } from "./add-guest-form";
import { GuestCard } from "./guest-card";
import { GuestGroupCard } from "./guest-group-card";
import { GroupManager } from "./group-manager";

export const dynamic = "force-dynamic";

const filters = ["attending", "pending", "declined"] as const;

type GuestGroup = { id: string; name: string; created_at: string };

const previewGroups: GuestGroup[] = [
  { id: "preview-group-1", name: "Bride's family", created_at: new Date(Date.now() - 180_000).toISOString() },
  { id: "preview-group-2", name: "Groom's family", created_at: new Date(Date.now() - 120_000).toISOString() },
  { id: "preview-group-3", name: "University friends", created_at: new Date(Date.now() - 60_000).toISOString() },
];

function previewToken(index: number) {
  let value = index;
  let token = "";
  for (let position = 0; position < 4; position++) {
    token = GUEST_TOKEN_ALPHABET[value % GUEST_TOKEN_ALPHABET.length] + token;
    value = Math.floor(value / GUEST_TOKEN_ALPHABET.length);
  }
  return token;
}

function createPreviewGuests(count: number): Guest[] {
  const firstNames = ["Ada", "Michael", "Tadiwa", "Amara", "Daniel", "Grace", "Noah", "Olivia", "Samuel", "Zara", "Theo", "Maya"];
  const lastNames = ["Thomas", "Williams", "Okafor", "Patel", "Johnson", "Mensah", "Clarke", "Adeyemi", "Taylor", "Brown"];

  return Array.from({ length: count }, (_, index) => {
    const status = filters[index % filters.length];
    return {
      id: `preview-guest-${index + 1}`,
      name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]} ${index + 1}`,
      phone: `+447700${String(900000 + index).slice(-6)}`,
      token: previewToken(index),
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
  let groups: GuestGroup[];
  if (isPreview) {
    guests = createPreviewGuests(300);
    groups = previewGroups;
  } else {
    const { data, error } = await getSupabaseAdmin().from("guests").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    guests = (data ?? []) as Guest[];
    const { data: storedGroups, error: groupsError } = await getSupabaseAdmin().from("guest_groups").select("id,name,created_at").order("name");
    if (groupsError) throw new Error(groupsError.message);
    groups = storedGroups ?? [];
  }
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
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      members: visibleGuests.filter((guest) => guest.group_id === group.id),
    }))
    .filter((group) => group.members.length > 0)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.name.localeCompare(b.name));
  const ungroupedGuests = visibleGuests.filter((guest) => !guest.group_id);
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
        {visibleGroups.map((group) => (
          <GuestGroupCard key={group.id} name={group.name} members={group.members} isPreview={isPreview} />
        ))}
        {ungroupedGuests.map((guest) => (
          <GuestCard key={guest.id} guest={guest} isPreview={isPreview} />
        ))}
      </section>
    </main>
  );
}
