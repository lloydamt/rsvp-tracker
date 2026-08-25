import { GUEST_TOKEN_ALPHABET, GUEST_TOKEN_LENGTH } from "@/lib/guest-token";
import { guestCanSendInvite, smsViaOptions } from "@/lib/phone";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import Link from "next/link";
import { reorderGroups, reorderUngroupedGuests } from "@/app/actions";
import { BulkActions } from "./bulk-actions";
import { AddGuestForm } from "./add-guest-form";
import { GuestCard } from "./guest-card";
import { GuestGroupCard } from "./guest-group-card";
import { GroupManager } from "./group-manager";
import { AdminNav } from "./admin-nav";
import { SortableItem, SortableList } from "./sortable-list";

export const dynamic = "force-dynamic";

const filters = ["attending", "pending", "declined"] as const;

type GuestGroup = { id: string; name: string; created_at: string; sort_order: number };

const previewGroups: GuestGroup[] = [
  { id: "preview-group-1", name: "Bride's family", created_at: new Date(Date.now() - 180_000).toISOString(), sort_order: 0 },
  { id: "preview-group-2", name: "Groom's family", created_at: new Date(Date.now() - 120_000).toISOString(), sort_order: 1 },
  { id: "preview-group-3", name: "University friends", created_at: new Date(Date.now() - 60_000).toISOString(), sort_order: 2 },
];

function previewToken(index: number) {
  let value = index;
  let token = "";
  for (let position = 0; position < GUEST_TOKEN_LENGTH; position++) {
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
      sort_order: index,
      sms_via_guest_id: null,
    };
  });
}

const sentFilters = ["sent", "unsent"] as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ status?: string; category?: string; sent?: string; preview?: string }> }) {
  const query = await searchParams;
  const isPreview = query.preview === "300";
  const requestedStatus = query.status;
  const activeStatus = filters.find((status) => status === requestedStatus);
  const activeCategory = query.category === "ceremony_reception" || query.category === "reception_only" ? query.category : undefined;
  const activeSent = sentFilters.find((sent) => sent === query.sent);
  let guests: Guest[];
  let groups: GuestGroup[];
  if (isPreview) {
    guests = createPreviewGuests(300);
    groups = previewGroups;
  } else {
    const supabase = getSupabaseAdmin();
    const [{ data, error }, { data: storedGroups, error: groupsError }] = await Promise.all([
      supabase.from("guests").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      supabase.from("guest_groups").select("id,name,created_at,sort_order").order("name"),
    ]);
    if (error) throw new Error(error.message);
    guests = (data ?? []) as Guest[];
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
  const sentCounts = {
    sent: guests.filter((guest) => guest.message_sent_at).length,
    unsent: guests.filter((guest) => !guest.message_sent_at).length,
  };
  const visibleGuests = guests.filter((guest) => (
    (!activeStatus || guest.status === activeStatus)
    && (!activeCategory || guest.invitation_category === activeCategory)
    && (!activeSent || (activeSent === "sent" ? Boolean(guest.message_sent_at) : !guest.message_sent_at))
  ));
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      members: visibleGuests.filter((guest) => guest.group_id === group.id),
    }))
    .filter((group) => group.members.length > 0)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const ungroupedGuests = visibleGuests
    .filter((guest) => !guest.group_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  const smsViaGuests = smsViaOptions(guests);
  const guestsById = new Map(guests.map((guest) => [guest.id, guest]));
  const smsViaNameById = Object.fromEntries(guests.map((guest) => [guest.id, guest.name]));
  const canSendById = Object.fromEntries(guests.map((guest) => [
    guest.id,
    guestCanSendInvite(guest, guest.sms_via_guest_id ? guestsById.get(guest.sms_via_guest_id) : null),
  ]));
  const filtersActive = Boolean(activeStatus || activeCategory || activeSent);
  const filterHref = ({ status, category, sent }: { status?: typeof activeStatus; category?: typeof activeCategory; sent?: typeof activeSent }) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (category) params.set("category", category);
    if (sent) params.set("sent", sent);
    if (isPreview) params.set("preview", "300");
    return params.size > 0 ? `/admin?${params.toString()}` : "/admin";
  };

  return (
    <main className="container">
      <header className="pageHeader">
        <div><p className="eyebrow">Organizer view</p><h1>Guest list</h1></div>
        <div className="summary"><strong>{guests.length}</strong> total guests</div>
      </header>
      <AdminNav active="list" />

      {isPreview && <div className="previewBanner"><span><strong>Preview mode:</strong> 300 generated guests. Nothing here is stored in the database.</span><Link href="/admin">Exit preview</Link></div>}

      <section className="guestFilters" aria-label="Filter guests">
        <div className="responseOverview" aria-label="Filter guests by RSVP response">
          <Link className={`responseStat attending ${activeStatus === "attending" ? "active" : ""}`} href={filterHref({ status: activeStatus === "attending" ? undefined : "attending", category: activeCategory, sent: activeSent })} aria-current={activeStatus === "attending" ? "page" : undefined}>
            <strong>{counts.attending}</strong><span>Attending</span>
          </Link>
          <Link className={`responseStat pending ${activeStatus === "pending" ? "active" : ""}`} href={filterHref({ status: activeStatus === "pending" ? undefined : "pending", category: activeCategory, sent: activeSent })} aria-current={activeStatus === "pending" ? "page" : undefined}>
            <strong>{counts.pending}</strong><span>Awaiting reply</span>
          </Link>
          <Link className={`responseStat declined ${activeStatus === "declined" ? "active" : ""}`} href={filterHref({ status: activeStatus === "declined" ? undefined : "declined", category: activeCategory, sent: activeSent })} aria-current={activeStatus === "declined" ? "page" : undefined}>
            <strong>{counts.declined}</strong><span>Declined</span>
          </Link>
        </div>

        <div className="categoryOverview" aria-label="Filter guests by invitation category">
          <span className="filterLabel">Invitation</span>
          <Link className={`categoryStat fullDay ${activeCategory === "ceremony_reception" ? "active" : ""}`} href={filterHref({ status: activeStatus, category: activeCategory === "ceremony_reception" ? undefined : "ceremony_reception", sent: activeSent })}>
            Ceremony &amp; reception <strong>{categoryCounts.ceremony_reception}</strong>
          </Link>
          <Link className={`categoryStat receptionOnly ${activeCategory === "reception_only" ? "active" : ""}`} href={filterHref({ status: activeStatus, category: activeCategory === "reception_only" ? undefined : "reception_only", sent: activeSent })}>
            Reception only <strong>{categoryCounts.reception_only}</strong>
          </Link>
        </div>

        <div className="categoryOverview" aria-label="Filter guests by invitation text">
          <span className="filterLabel">Text</span>
          <Link className={`categoryStat ${activeSent === "unsent" ? "active" : ""}`} href={filterHref({ status: activeStatus, category: activeCategory, sent: activeSent === "unsent" ? undefined : "unsent" })} aria-current={activeSent === "unsent" ? "page" : undefined}>
            Not sent <strong>{sentCounts.unsent}</strong>
          </Link>
          <Link className={`categoryStat ${activeSent === "sent" ? "active" : ""}`} href={filterHref({ status: activeStatus, category: activeCategory, sent: activeSent === "sent" ? undefined : "sent" })} aria-current={activeSent === "sent" ? "page" : undefined}>
            Sent <strong>{sentCounts.sent}</strong>
          </Link>
        </div>
      </section>

      {!isPreview && <details className="addGuestPanel">
        <summary>
          <span className="addIcon" aria-hidden="true">+</span>
          <span><strong>Add guests</strong><small>Create one guest or several at once</small></span>
          <span className="addGuestCta">Add guests</span>
        </summary>
        <AddGuestForm groups={groups} smsViaGuests={smsViaGuests} />
      </details>}

      {!isPreview && <GroupManager groups={managedGroups} />}

      <div className="listHeading">
        <div><h2>Guests</h2><span>{visibleGuests.length} shown</span></div>
        {filtersActive && (
          <div className="listHeadingMeta">
            {!isPreview && <span className="reorderHint">Clear filters to rearrange the list.</span>}
            <Link href={filterHref({})}>Clear filters</Link>
          </div>
        )}
      </div>

      {!isPreview && visibleGuests.length > 0 && <BulkActions groups={managedGroups} />}

      <section className="guestList">
        {guests.length === 0 && <div className="card empty">No guests yet. Add your first guest above.</div>}
        {guests.length > 0 && visibleGuests.length === 0 && <div className="card empty">No guests match these filters.</div>}
        {isPreview ? visibleGroups.map((group) => (
          <GuestGroupCard key={group.id} id={group.id} name={group.name} members={group.members} isPreview={isPreview} smsViaGuests={smsViaGuests} smsViaNameById={smsViaNameById} canSendById={canSendById} />
        )) : (
          <SortableList persist={reorderGroups} disabled={filtersActive}>
            {visibleGroups.map((group) => (
              <SortableItem key={group.id} id={group.id}>
                <GuestGroupCard id={group.id} name={group.name} members={group.members} isPreview={isPreview} sortable smsViaGuests={smsViaGuests} smsViaNameById={smsViaNameById} canSendById={canSendById} />
              </SortableItem>
            ))}
          </SortableList>
        )}
        {isPreview ? ungroupedGuests.map((guest) => (
          <GuestCard key={guest.id} guest={guest} isPreview={isPreview} canSend={canSendById[guest.id]} smsViaName={guest.sms_via_guest_id ? smsViaNameById[guest.sms_via_guest_id] : undefined} smsViaGuests={smsViaGuests} />
        )) : (
          <SortableList persist={reorderUngroupedGuests} disabled={filtersActive}>
            {ungroupedGuests.map((guest) => (
              <SortableItem key={guest.id} id={guest.id}>
                <GuestCard guest={guest} isPreview={isPreview} sortable canSend={canSendById[guest.id]} smsViaName={guest.sms_via_guest_id ? smsViaNameById[guest.sms_via_guest_id] : undefined} smsViaGuests={smsViaGuests} />
              </SortableItem>
            ))}
          </SortableList>
        )}
      </section>
    </main>
  );
}
