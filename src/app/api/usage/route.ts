import { getUsageSnapshot } from '@/lib/usage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/usage — shared demo-pool capacity for the usage meter. */
export async function GET() {
  return Response.json(getUsageSnapshot());
}
