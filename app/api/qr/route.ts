export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const npi = request.nextUrl.searchParams.get("npi");
    if (!npi) return NextResponse.json({ error: "NPI requis" }, { status: 400 });

    const { data: patient } = await supabase
      .from("patients")
      .select("id, npi, nom, prenom")
      .eq("npi", npi)
      .single();

    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    // Create temporary secure token (24h)
    const token = Buffer.from(JSON.stringify({
      npi: patient.npi,
      expires: Date.now() + 24 * 60 * 60 * 1000,
      userId: user.id,
    })).toString("base64");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const url = `${baseUrl}/patients/${patient.npi}?token=${token}`;

    const qrBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: 300,
      margin: 2,
      color: { dark: "#1E293B", light: "#FFFFFF" },
    });

    // Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patient.id,
      action: "generate_qr",
      details: `QR Code généré pour ${patient.npi}`,
      timestamp: new Date().toISOString(),
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="qr-${patient.npi}.png"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
