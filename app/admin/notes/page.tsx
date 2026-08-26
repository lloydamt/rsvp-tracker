import { getSupabaseAdmin, Guest } from "@/lib/supabase";
import { AdminNav } from "../admin-nav";

export const dynamic = "force-dynamic";

function statusLabel(status: Guest["status"]) {
  if (status === "pending") return "Awaiting reply";
  if (status === "declined") return "Declined";
  return "Attending";
}

function respondedAtMs(guest: Guest) {
  return guest.responded_at ? Date.parse(guest.responded_at) : 0;
}

export default async function NotesPage() {
  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: storedGroups, error: groupsError }] = await Promise.all([
    supabase.from("guests").select("*").order("name", { ascending: true }),
    supabase.from("guest_groups").select("id,name"),
  ]);
  if (error) throw new Error(error.message);
  if (groupsError) throw new Error(groupsError.message);

  const guests = (data ?? []) as Guest[];
  const groupNameById = Object.fromEntries((storedGroups ?? []).map((group) => [group.id, group.name]));
  const membersByGroupId = new Map<string, Guest[]>();
  for (const guest of guests) {
    if (!guest.group_id) continue;
    const members = membersByGroupId.get(guest.group_id) ?? [];
    members.push(guest);
    membersByGroupId.set(guest.group_id, members);
  }

  const notedGuests = guests
    .filter((guest) => Boolean(guest.notes?.trim()))
    .sort((a, b) => respondedAtMs(b) - respondedAtMs(a) || a.name.localeCompare(b.name));

  return (
    <main className="container">
      <header className="pageHeader">
        <div><p className="eyebrow">Organizer view</p><h1>Notes</h1></div>
        <div className="summary"><strong>{notedGuests.length}</strong> {notedGuests.length === 1 ? "note" : "notes"}</div>
      </header>
      <AdminNav active="notes" />

      <section className="noteList" aria-label="Guest notes">
        {notedGuests.length === 0 && <div className="card empty">No guest notes yet.</div>}
        {notedGuests.map((guest) => {
          const fellows = guest.group_id
            ? (membersByGroupId.get(guest.group_id) ?? [])
              .filter((member) => member.id !== guest.id)
              .sort((a, b) => a.name.localeCompare(b.name))
            : [];
          return (
            <article className="noteCard" key={guest.id}>
              <header className="noteCardHeader">
                <strong>{guest.name}</strong>
                <span className={`statusLabel ${guest.status}`}><i aria-hidden="true" />{statusLabel(guest.status)}</span>
              </header>
              <p className="noteCardBody">{guest.notes}</p>
              {guest.group_id ? (
                <div className="noteCardGroup">
                  <p className="noteCardGroupName">{groupNameById[guest.group_id] ?? "Group"}</p>
                  {fellows.length > 0 ? (
                    <ul>
                      {fellows.map((member) => (
                        <li key={member.id}>
                          <span>{member.name}</span>
                          <span className={`statusLabel ${member.status}`}><i aria-hidden="true" />{statusLabel(member.status)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="noteCardGroupEmpty">No other members in this group.</p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </main>
  );
}
