import { createClient } from "@supabase/supabase-js";

export type RsvpStatus = "pending" | "attending" | "declined";
export type InvitationCategory = "ceremony_reception" | "reception_only";

export type Guest = {
  id: string;
  name: string;
  phone: string;
  token: string;
  group_id: string | null;
  invitation_category: InvitationCategory;
  status: RsvpStatus;
  party_size: number;
  notes: string | null;
  message_sent_at: string | null;
  responded_at: string | null;
  created_at: string;
};

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
