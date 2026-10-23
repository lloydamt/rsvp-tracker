import { buildAttendingGuestsPdf } from "@/lib/attending-guests-pdf";
import { getSupabaseAdmin, Guest } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("guests")
    .select("name,invitation_category")
    .eq("status", "attending");
  if (error) throw new Error(error.message);

  const guests = ((data ?? []) as Pick<Guest, "name" | "invitation_category">[])
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const generatedAt = new Date();
  const pdf = await buildAttendingGuestsPdf(guests, generatedAt);

  return new Response(pdf as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attending-guests-${generatedAt.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
