export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const imu = request.nextUrl.searchParams.get("imu");
    if (!imu) return NextResponse.json({ error: "IMU requis" }, { status: 400 });

    const { data: patient } = await supabase
      .from("patients")
      .select("id, imu, nom, prenom")
      .eq("imu", imu)
      .single();

    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    // Create temporary secure token (24h)
    const token = Buffer.from(JSON.stringify({
      imu: patient.imu,
      expires: Date.now() + 24 * 60 * 60 * 1000,
      userId: user.id,
    })).toString("base64");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const url = `${baseUrl}/patients/${patient.imu}?token=${token}`;

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
      details: `QR Code généré pour ${patient.imu}`,
      timestamp: new Date().toISOString(),
    });

    // Save QR code to patient's document space
    try {
      const ts = Date.now();
      const storageKey = `${patient.id}/generated/${ts}_qr-${patient.imu}.png`;
      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(storageKey, new Uint8Array(qrBuffer), { contentType: "image/png" });
      if (!storageError) {
        const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(storageKey);
        await supabase.from("documents").insert({
          patient_id: patient.id,
          nom: `QR Code — ${patient.imu}`,
          url: publicUrl,
          type: "autre",
          taille: qrBuffer.length,
          uploaded_by: user.id,
          description: "QR Code d'identification patient — généré automatiquement",
        });
      }
    } catch { /* ne pas bloquer la réponse si la sauvegarde échoue */ }

    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="qr-${patient.imu}.png"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
