import { NextRequest, NextResponse } from "next/server";
import { checkAlerts } from "@/lib/alertasCheck.server";

export const dynamic = "force-dynamic";

// Sweeps every active alert (all devices), not just the one making the
// request. Meant to be called by an external scheduler (e.g. a cron-job.org
// hit or a GitHub Actions schedule) every 15-30 min, so an alert can be
// waiting for the user next time they open the app instead of only being
// checked exactly when they open the Alerts screen.
export async function POST(request: NextRequest) {
  const secret = process.env.ALERTAS_CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  await checkAlerts();
  return NextResponse.json({ ok: true });
}
