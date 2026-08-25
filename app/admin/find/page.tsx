import { guestMatchesSearch, isGuestSearchQueryUseful, normalizeSearchQuery } from "@/lib/guest-search";
import { guestCanSendInvite, smsViaOptions } from "@/lib/phone";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import { AdminNav } from "../admin-nav";
import { GuestCard } from "../guest-card";

export const dynamic = "force-dynamic";

export default async function FindPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const normalized = normalizeSearchQuery(query);
  const searched = Boolean(normalized);
  const useful = isGuestSearchQueryUseful(normalized);

  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: storedGroups, error: groupsError }] = await Promise.all([
    supabase.from("guests").select("*").order("name", { ascending: true }),
    supabase.from("guest_groups").select("id,name"),
  ]);
  if (error) throw new Error(error.message);
  if (groupsError) throw new Error(groupsError.message);

  const guests = (data ?? []) as Guest[];
  const groupNameById = Object.fromEntries((storedGroups ?? []).map((group) => [group.id, group.name]));
  const guestsById = new Map(guests.map((guest) => [guest.id, guest]));
  const smsViaGuests = smsViaOptions(guests);
  const smsViaNameById = Object.fromEntries(guests.map((guest) => [guest.id, guest.name]));
  const matches = useful
    ? guests.filter((guest) => guestMatchesSearch(
      guest,
      normalized,
      guest.sms_via_guest_id ? guestsById.get(guest.sms_via_guest_id)?.phone : null,
    ))
    : [];

  return (
    <main className="container">
      <header className="pageHeader">
        <div><p className="eyebrow">Organizer view</p><h1>Find guests</h1></div>
        <div className="summary"><strong>{guests.length}</strong> total guests</div>
      </header>
      <AdminNav active="find" />

      <form className="findSearch" action="/admin/find" method="get" role="search">
        <label>
          <span className="fieldCaption">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Name or phone"
            autoComplete="off"
            autoFocus
          />
        </label>
        <button type="submit">Find</button>
      </form>

      <div className="listHeading">
        <div>
          <h2>Results</h2>
          {useful && <span>{matches.length} shown</span>}
        </div>
      </div>

      <section className="guestList">
        {!searched && <div className="card empty">Search by name or phone number to find a guest.</div>}
        {searched && !useful && <div className="card empty">Enter at least 2 letters of a name, or 4 digits of a phone number.</div>}
        {useful && matches.length === 0 && <div className="card empty">No guests match.</div>}
        {matches.map((guest) => (
          <GuestCard
            key={guest.id}
            guest={guest}
            isPreview={false}
            selectable={false}
            groupName={guest.group_id ? groupNameById[guest.group_id] : undefined}
            canSend={guestCanSendInvite(guest, guest.sms_via_guest_id ? guestsById.get(guest.sms_via_guest_id) : null)}
            smsViaName={guest.sms_via_guest_id ? smsViaNameById[guest.sms_via_guest_id] : undefined}
            smsViaGuests={smsViaGuests}
          />
        ))}
      </section>
    </main>
  );
}
