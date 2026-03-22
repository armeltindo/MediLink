export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// GET /api/cr-operatoire?id=<documentId>
// Génère un CR opératoire HTML imprimable à partir du document enregistré.
// Utilisé comme URL stockée dans documents.url pour les CRs opératoires.
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non authentifié", { status: 401 });

  const documentId = request.nextUrl.searchParams.get("id");
  if (!documentId) return new NextResponse("Paramètre id requis", { status: 400 });

  const { data: doc } = await supabase
    .from("documents")
    .select("id, nom, description, uploaded_at, etablissement_id, patient_id, patients(nom, prenom, imu, date_naissance, sexe), etablissements(nom, adresse, ville, telephone)")
    .eq("id", documentId)
    .single();

  if (!doc) return new NextResponse("Document introuvable", { status: 404 });

  let cr: {
    type_intervention?: string;
    chirurgien?: string;
    anesthesiste?: string;
    duree_minutes?: number | null;
    complications?: string | null;
    notes?: string | null;
  } = {};
  try {
    cr = JSON.parse(doc.description ?? "{}");
  } catch {
    return new NextResponse("Description invalide", { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patient   = Array.isArray(doc.patients)     ? (doc.patients as any[])[0]     : doc.patients;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const etab      = Array.isArray(doc.etablissements) ? (doc.etablissements as any[])[0] : doc.etablissements;

  const dateDoc   = doc.uploaded_at
    ? new Date(doc.uploaded_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const dateNaiss = patient?.date_naissance
    ? new Date(patient.date_naissance).toLocaleDateString("fr-FR")
    : "—";

  const dureeStr = cr.duree_minutes != null
    ? `${Math.floor(cr.duree_minutes / 60)}h${String(cr.duree_minutes % 60).padStart(2, "0")}`
    : "—";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>CR Opératoire — ${cr.type_intervention ?? "Intervention"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 3px solid #1E3A5F; margin-bottom: 20px; }
    .logo-block svg { height: 36px; }
    .etab-info { text-align: right; font-size: 11px; color: #555; line-height: 1.5; }
    .etab-info strong { font-size: 13px; color: #1E3A5F; }

    /* Title */
    .doc-title { text-align: center; margin-bottom: 20px; }
    .doc-title h1 { font-size: 18px; font-weight: 700; color: #1E3A5F; letter-spacing: 0.3px; }
    .doc-title .subtitle { font-size: 12px; color: #666; margin-top: 3px; }

    /* Patient card */
    .patient-card { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; gap: 24px; flex-wrap: wrap; }
    .patient-card .field { min-width: 140px; }
    .patient-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6366f1; font-weight: 600; }
    .patient-card .value { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-top: 1px; }

    /* Section */
    .section { margin-bottom: 18px; }
    .section h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #1E3A5F; font-weight: 700; border-bottom: 1px solid #dde3f0; padding-bottom: 5px; margin-bottom: 10px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field-row { margin-bottom: 8px; }
    .field-row .label { font-size: 11px; color: #555; font-weight: 600; margin-bottom: 2px; }
    .field-row .value { font-size: 13px; color: #1a1a2e; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 6px 10px; min-height: 30px; }
    .value.empty { color: #9ca3af; font-style: italic; }

    /* Footer */
    .footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer .date-info { font-size: 11px; color: #777; }
    .signature-block { text-align: center; }
    .signature-box { width: 160px; height: 60px; border: 1px dashed #aaa; border-radius: 4px; margin-bottom: 4px; }
    .signature-block .label { font-size: 10px; color: #777; }

    @media print {
      body { background: #fff; }
      .page { padding: 10px 16px; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-block">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 44" height="36">
        <path d="M20 3 L34 8 L34 22 Q34 30 20 36 Q6 30 6 22 L6 8 Z" fill="#1E3A5F"/>
        <path d="M20 8 L20 30" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M20 10 Q15 8 14 11 Q15 13 20 12 Z" fill="white"/>
        <path d="M20 10 Q25 8 26 11 Q25 13 20 12 Z" fill="white"/>
        <path d="M20 14 Q16.5 17 20 20 Q23.5 23 20 26" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <path d="M20 14 Q23.5 17 20 20 Q16.5 23 20 26" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <text x="42" y="24" font-family="Georgia,serif" font-weight="700" font-size="17" fill="#1E3A5F">MediLink</text>
        <text x="43" y="35" font-family="Arial,sans-serif" font-size="8" fill="#6b7280" letter-spacing="0.4">DME Unifié · Bénin</text>
      </svg>
    </div>
    <div class="etab-info">
      <strong>${etab?.nom ?? "Établissement"}</strong><br/>
      ${etab?.adresse ? etab.adresse + "<br/>" : ""}
      ${etab?.ville ?? ""}${etab?.telephone ? " · " + etab.telephone : ""}
    </div>
  </div>

  <!-- Title -->
  <div class="doc-title">
    <h1>Compte-Rendu Opératoire</h1>
    <div class="subtitle">Établi le ${dateDoc}</div>
  </div>

  <!-- Patient -->
  <div class="patient-card">
    <div class="field">
      <div class="label">Patient</div>
      <div class="value">${patient ? `${patient.prenom} ${patient.nom}` : "—"}</div>
    </div>
    <div class="field">
      <div class="label">N° IMU</div>
      <div class="value">${patient?.imu ?? "—"}</div>
    </div>
    <div class="field">
      <div class="label">Date de naissance</div>
      <div class="value">${dateNaiss}</div>
    </div>
    <div class="field">
      <div class="label">Sexe</div>
      <div class="value">${patient?.sexe === "M" ? "Masculin" : patient?.sexe === "F" ? "Féminin" : "—"}</div>
    </div>
  </div>

  <!-- Intervention -->
  <div class="section">
    <h2>Détails de l&apos;intervention</h2>
    <div class="field-row">
      <div class="label">Type d&apos;intervention</div>
      <div class="value">${cr.type_intervention || '<span class="empty">Non précisé</span>'}</div>
    </div>
    <div class="grid2">
      <div class="field-row">
        <div class="label">Chirurgien</div>
        <div class="value">${cr.chirurgien || '<span class="empty">—</span>'}</div>
      </div>
      <div class="field-row">
        <div class="label">Anesthésiste</div>
        <div class="value">${cr.anesthesiste || '<span class="empty">—</span>'}</div>
      </div>
    </div>
    <div class="field-row">
      <div class="label">Durée de l&apos;intervention</div>
      <div class="value">${dureeStr}</div>
    </div>
  </div>

  <!-- Complications -->
  <div class="section">
    <h2>Complications per-opératoires</h2>
    <div class="field-row">
      <div class="value${cr.complications ? "" : " empty"}">${cr.complications || "Aucune complication signalée"}</div>
    </div>
  </div>

  <!-- Notes -->
  <div class="section">
    <h2>Notes et observations</h2>
    <div class="field-row">
      <div class="value${cr.notes ? "" : " empty"}" style="min-height:60px; white-space:pre-wrap">${cr.notes || "—"}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="date-info">
      Document généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}<br/>
      MediLink — DME Unifié Bénin
    </div>
    <div class="signature-block">
      <div class="signature-box"></div>
      <div class="label">Signature du chirurgien</div>
    </div>
  </div>

  <!-- Print button -->
  <div class="no-print" style="text-align:center; margin-top:24px;">
    <button onclick="window.print()"
      style="background:#1E3A5F;color:#fff;border:none;border-radius:6px;padding:10px 28px;font-size:14px;cursor:pointer;font-weight:600;">
      Imprimer
    </button>
  </div>

</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
