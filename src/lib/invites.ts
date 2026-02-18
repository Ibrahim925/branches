import { createClient } from '@/lib/supabase/server';

export type InvitePreview = {
  invite_id: string;
  graph_id: string;
  graph_name: string;
  role: 'admin' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  is_expired: boolean;
  invite_claimed_by: string | null;
  node_id: string | null;
  node_first_name: string | null;
  node_last_name: string | null;
  node_claimed_by: string | null;
};

export async function getInvitePreviewByToken(
  token: string
): Promise<InvitePreview | null> {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_invite_preview', {
    _token: normalizedToken,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0] as InvitePreview;
}

export function formatInviteeName(preview: InvitePreview | null): string | null {
  if (!preview?.node_first_name) return null;
  const full = `${preview.node_first_name} ${preview.node_last_name ?? ''}`.trim();
  return full || null;
}
