// Development diagnostics: errors from a test phone, printed to this server's
// log. Off unless NEXT_PUBLIC_REMOTE_DIAGNOSTICS=1 (see src/lib/remoteDiag.ts).
export async function POST(request: Request): Promise<Response> {
  if (process.env.NEXT_PUBLIC_REMOTE_DIAGNOSTICS !== '1') return new Response(null, { status: 404 });
  const body = (await request.text()).slice(0, 8_000);
  console.log(`[diag] ${new Date().toISOString()} ${body}`);
  return new Response(null, { status: 204 });
}
