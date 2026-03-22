export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatDate, formatAge } from "@/lib/utils";
import QRCode from "qrcode";

const LOGO_LIGHT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 44" height="38">
  <path d="M20 3 L34 8 L34 22 Q34 30 20 36 Q6 30 6 22 L6 8 Z" fill="white" fill-opacity="0.2"/>
  <path d="M20 8 L20 30" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M20 10 Q15 8 14 11 Q15 13 20 12 Z" fill="white"/>
  <path d="M20 10 Q25 8 26 11 Q25 13 20 12 Z" fill="white"/>
  <path d="M20 14 Q16.5 17 20 20 Q23.5 23 20 26" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M20 14 Q23.5 17 20 20 Q16.5 23 20 26" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <text x="42" y="24" font-family="Georgia,serif" font-weight="700" font-size="17" fill="white">MediLink</text>
  <text x="43" y="35" font-family="Arial,sans-serif" font-size="8" fill="rgba(255,255,255,0.65)" letter-spacing="0.4">DME Unifié · Bénin</text>
</svg>`;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const consultationId = request.nextUrl.searchParams.get("consultationId");
    const analyseId      = request.nextUrl.searchParams.get("analyseId");

    if (!consultationId && !analyseId)
      return NextResponse.json({ error: "consultationId ou analyseId requis" }, { status: 400 });

    // ── Récupération des analyses prescrites ──────────────────────────────────
    let analysesQuery = supabase
      .from("analyses_prescrites")
      .select("*")
      .is("deleted_at", null)
      .order("urgence", { ascending: false })
      .order("created_at", { ascending: true });

    if (analyseId)      analysesQuery = analysesQuery.eq("id", analyseId);
    else                analysesQuery = analysesQuery.eq("consultation_id", consultationId!);

    const { data: analyses, error: aErr } = await analysesQuery;
    if (aErr || !analyses?.length)
      return NextResponse.json({ error: "Aucune analyse trouvée" }, { status: 404 });

    const firstAnalyse = analyses[0];

    // ── Patient + médecin ─────────────────────────────────────────────────────
    const [patientRes, profileRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", firstAnalyse.patient_id).single(),
      supabase.from("users_profiles")
        .select("*, etablissements(nom, adresse, ville, telephone)")
        .eq("id", firstAnalyse.medecin_id)
        .single(),
    ]);

    const patient = patientRes.data;
    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const medecin = profileRes.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const etablissement = (medecin as any)?.etablissements;

    // ── Audit ─────────────────────────────────────────────────────────────────
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patient.id,
      action: "export_pdf",
      details: JSON.stringify({
        type: "bon_analyse",
        consultation_id: consultationId,
        analyse_ids: analyses.map(a => a.id),
      }),
      timestamp: new Date().toISOString(),
    });

    // ── QR code ───────────────────────────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const qrBase64 = await QRCode.toDataURL(
      `${baseUrl}/patients/${patient.imu}`,
      { width: 120, margin: 1, color: { dark: "#1E3A5F", light: "#FFFFFF" } }
    );

    const dateDoc      = formatDate(firstAnalyse.date_prescription);
    const agePatient   = formatAge(patient.date_naissance);
    const medecinNom   = medecin ? `${medecin.titre ? medecin.titre + " " : "Dr. "}${medecin.prenom} ${medecin.nom}` : "Médecin";
    const medecinSpec  = medecin?.specialite || "";
    const medecinOrdre = medecin?.numero_ordre || "";
    const etabNom      = etablissement?.nom || "Établissement de santé";
    const etabAdresse  = etablissement ? [etablissement.adresse, etablissement.ville].filter(Boolean).join(", ") : "";
    const etabTel      = etablissement?.telephone || "";
    const refDoc       = firstAnalyse.id.slice(0, 8).toUpperCase();
    const hasUrgent    = analyses.some(a => a.urgence);

    // ── HTML ──────────────────────────────────────────────────────────────────
    const analysesHtml = analyses.map((a) => `
      <div class="analyse-card ${a.urgence ? "urgente" : ""}">
        <div class="analyse-top">
          <div class="analyse-nom">${a.type_analyse}</div>
          ${a.urgence ? `<span class="badge-urgent">⚡ URGENT</span>` : ""}
        </div>
        ${a.instructions ? `<div class="analyse-instructions">${a.instructions}</div>` : ""}
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon d'analyses — ${patient.prenom} ${patient.nom}</title>
  <style>
    @page { size: A4; margin: 12mm 16mm 16mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      font-size: 11pt;
      color: #1E293B;
      background: #fff;
      line-height: 1.55;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* ── EN-TÊTE ─────────────────────────────────────── */
    .header {
      background: linear-gradient(135deg, #1E3A5F 0%, #1a3550 60%, #0f2a1e 100%);
      border-radius: 10px;
      padding: 20px 24px 16px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .header-left { flex: 1; }
    .header-medecin { color: white; font-size: 14pt; font-weight: 700; font-family: Georgia, serif; margin-bottom: 2px; }
    .header-spec    { color: rgba(255,255,255,0.75); font-size: 9.5pt; margin-bottom: 6px; }
    .header-etab    { color: rgba(255,255,255,0.6);  font-size: 9pt; }
    .header-right   { text-align: right; display: flex; align-items: center; gap: 14px; }

    /* ── BADGE DOCUMENT ──────────────────────────────── */
    .doc-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 0 0 18px;
      padding: 10px 0;
      border-top: 1px solid #E2E8F0;
      border-bottom: 3px solid #2563EB;
    }
    .doc-badge-icon  { font-size: 20pt; }
    .doc-badge-title {
      font-size: 14pt; font-weight: 700; color: #1E3A5F;
      letter-spacing: 1.5px; text-transform: uppercase;
    }
    .doc-badge-ref {
      font-family: 'Courier New', monospace; font-size: 8pt;
      color: #94A3B8; background: #F1F5F9;
      padding: 2px 7px; border-radius: 4px; margin-left: auto;
    }

    /* ── ALERTE URGENT ───────────────────────────────── */
    .urgent-banner {
      background: #FEF2F2; border: 1px solid #FECACA;
      border-radius: 8px; padding: 10px 14px;
      margin-bottom: 14px;
      display: flex; align-items: center; gap: 8px;
      font-size: 10pt; font-weight: 600; color: #B91C1C;
    }

    /* ── META ────────────────────────────────────────── */
    .meta-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px; font-size: 9.5pt; color: #64748B;
    }
    .meta-row strong { color: #1E293B; }

    /* ── PATIENT ─────────────────────────────────────── */
    .patient-card {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-left: 4px solid #3B82F6;
      border-radius: 0 8px 8px 0;
      padding: 13px 16px; margin-bottom: 18px;
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px;
    }
    .field-label { font-size: 8.5pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
    .field-value { font-size: 10.5pt; font-weight: 600; color: #1E293B; }
    .field-value.imu { font-family: 'Courier New', monospace; color: #1E3A5F; font-size: 11pt; }

    /* ── LISTE ANALYSES ──────────────────────────────── */
    .section-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 12px; color: #2563EB;
      border-left: 4px solid #2563EB; padding-left: 10px;
    }
    .section-header h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

    .analyse-card {
      border: 1.5px solid #E2E8F0; border-radius: 8px;
      overflow: hidden; margin-bottom: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .analyse-card.urgente { border-color: #FECACA; }
    .analyse-top {
      background: linear-gradient(to right, #EFF6FF, #fff);
      border-bottom: 1px solid #DBEAFE;
      padding: 10px 14px;
      display: flex; align-items: center; gap: 10px;
    }
    .analyse-card.urgente .analyse-top {
      background: linear-gradient(to right, #FEF2F2, #fff);
      border-bottom-color: #FECACA;
    }
    .analyse-nom { font-size: 12pt; font-weight: 700; color: #1E3A5F; flex: 1; }
    .badge-urgent {
      background: #FEF2F2; border: 1px solid #FECACA;
      color: #B91C1C; font-size: 8.5pt; font-weight: 700;
      padding: 2px 8px; border-radius: 4px;
    }
    .analyse-instructions {
      padding: 8px 14px; background: #FFFBEB;
      border-top: 1px dashed #FCD34D;
      font-size: 9pt; color: #78350F;
    }

    /* ── PIED ────────────────────────────────────────── */
    .lab-note {
      margin-top: 16px;
      background: #F0F9FF; border: 1px solid #BAE6FD;
      border-radius: 8px; padding: 10px 14px;
      font-size: 9pt; color: #0C4A6E;
    }
    .sig-section {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-top: 28px; gap: 20px;
    }
    .sig-note {
      flex: 1; background: #F8FAFC; border: 1px solid #E2E8F0;
      border-radius: 8px; padding: 10px 14px;
      font-size: 9pt; color: #64748B;
    }
    .sig-block { text-align: center; flex: 0 0 220px; }
    .sig-area {
      height: 70px; border: 1px solid #CBD5E1; border-radius: 6px;
      margin-bottom: 6px;
      background: repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,0.015) 8px, rgba(0,0,0,0.015) 9px);
    }
    .sig-name  { font-size: 10pt; font-weight: 700; color: #1E293B; }
    .sig-ordre { font-size: 8pt; color: #94A3B8; font-family: 'Courier New', monospace; margin-top: 2px; }

    .doc-footer {
      margin-top: 24px; padding-top: 10px; border-top: 1px solid #E2E8F0;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 7.5pt; color: #94A3B8;
    }
    .confidential-badge {
      background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 4px;
      padding: 2px 8px; font-size: 7.5pt; color: #64748B;
      font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;
    }
    .no-print { margin-bottom: 20px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>

  <!-- Barre impression -->
  <div class="no-print" style="display:flex;align-items:center;justify-content:space-between;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 16px;font-family:sans-serif;font-size:10pt;">
    <span style="color:#1E3A5F;font-weight:600;">Bon de prescription d'analyses</span>
    <button onclick="window.print()" style="background:#1E3A5F;color:white;border:none;padding:7px 18px;border-radius:6px;cursor:pointer;font-size:10pt;font-family:sans-serif;font-weight:600;">Imprimer / Enregistrer PDF</button>
  </div>

  <!-- En-tête -->
  <div class="header">
    <div class="header-left">
      <div class="header-medecin">${medecinNom}</div>
      ${medecinSpec ? `<div class="header-spec">${medecinSpec}</div>` : ""}
      <div class="header-etab">${etabNom}${etabAdresse ? " — " + etabAdresse : ""}${etabTel ? " — Tél : " + etabTel : ""}</div>
    </div>
    <div class="header-right">
      ${LOGO_LIGHT}
      <div style="text-align:center;flex-shrink:0;">
        <div style="background:white;border-radius:6px;padding:3px;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
          <img src="${qrBase64}" width="70" height="70" alt="QR Patient" style="display:block;"/>
        </div>
        <div style="font-size:6.5pt;color:rgba(255,255,255,0.55);margin-top:3px;letter-spacing:0.3px;">Scan · Vérifier</div>
      </div>
    </div>
  </div>

  <!-- Badge -->
  <div class="doc-badge">
    <span class="doc-badge-icon">🔬</span>
    <span class="doc-badge-title">Bon de Prescription d'Analyses</span>
    <span class="doc-badge-ref">Réf. ${refDoc}</span>
  </div>

  ${hasUrgent ? `
  <div class="urgent-banner">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    Ce bon contient des analyses urgentes — traitement prioritaire demandé
  </div>` : ""}

  <!-- Date -->
  <div class="meta-row">
    <span>Date de prescription : <strong>${dateDoc}</strong></span>
    <span>Nombre d'analyses : <strong>${analyses.length}</strong></span>
    <span>IMU patient : <strong style="font-family:'Courier New',monospace;">${patient.imu}</strong></span>
  </div>

  <!-- Patient -->
  <div class="patient-card">
    <div>
      <div class="field-label">Nom complet</div>
      <div class="field-value">${patient.prenom} ${patient.nom.toUpperCase()}</div>
    </div>
    <div>
      <div class="field-label">Date de naissance</div>
      <div class="field-value">${formatDate(patient.date_naissance)} (${agePatient})</div>
    </div>
    <div>
      <div class="field-label">Identifiant IMU</div>
      <div class="field-value imu">${patient.imu}</div>
    </div>
    ${patient.sexe ? `<div><div class="field-label">Sexe</div><div class="field-value">${patient.sexe === "M" ? "Masculin" : "Féminin"}</div></div>` : ""}
    ${patient.groupe_sanguin ? `<div><div class="field-label">Groupe sanguin</div><div class="field-value">${patient.groupe_sanguin}${patient.rhesus || ""}</div></div>` : ""}
    ${patient.assurance_organisme ? `<div><div class="field-label">Assurance</div><div class="field-value">${patient.assurance_organisme}${patient.assurance_numero ? " – " + patient.assurance_numero : ""}</div></div>` : ""}
  </div>

  <!-- Analyses -->
  <div class="section-header">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>
    <h2>Analyses prescrites</h2>
  </div>
  ${analysesHtml}

  <!-- Note laboratoire -->
  <div class="lab-note">
    <strong>À l'attention du laboratoire :</strong> Les résultats devront être transmis au médecin prescripteur et saisis dans le système MediLink via l'IMU du patient.
    Les analyses urgentes (⚡) sont à traiter en priorité absolue.
  </div>

  <!-- Signature -->
  <div class="sig-section">
    <div class="sig-note">
      <strong>Conditions de prélèvement :</strong><br>
      Respecter les instructions spécifiées pour chaque analyse. En cas de doute, contacter le médecin prescripteur avant le prélèvement.
    </div>
    <div class="sig-block">
      <div class="sig-area"></div>
      <div class="sig-name">${medecinNom}</div>
      ${medecinSpec ? `<div style="font-size:9pt;color:#64748B;">${medecinSpec}</div>` : ""}
      ${medecinOrdre ? `<div class="sig-ordre">N° Ordre : ${medecinOrdre}</div>` : ""}
    </div>
  </div>

  <!-- Pied de page -->
  <div class="doc-footer">
    <span>Généré par MediLink le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
    <span class="confidential-badge">Document confidentiel</span>
    <span>Réf. ${refDoc}</span>
  </div>

</body>
</html>`;

    // ── Sauvegarde dans le storage ────────────────────────────────────────────
    try {
      const ts = Date.now();
      const storageKey = `${patient.id}/generated/${ts}_bon_analyse.html`;
      const htmlBuffer = Buffer.from(html, "utf-8");
      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(storageKey, htmlBuffer, { contentType: "text/html; charset=utf-8" });
      if (!storageError) {
        const typesListe = analyses.map(a => a.type_analyse).join(", ");
        await supabase.from("documents").insert({
          patient_id: patient.id,
          nom: `Bon d'analyses — ${typesListe.slice(0, 60)}${typesListe.length > 60 ? "…" : ""} — ${dateDoc}`,
          url: `/api/bon-analyse-pdf?${consultationId ? `consultationId=${consultationId}` : `analyseId=${analyseId}`}`,
          type: "ordonnance",
          taille: htmlBuffer.length,
          uploaded_by: user.id,
          description: `${analyses.length} analyse(s) prescrite(s)${hasUrgent ? " dont urgente(s)" : ""}`,
        });
      }
    } catch { /* ne pas bloquer la réponse */ }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("bon-analyse-pdf error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
