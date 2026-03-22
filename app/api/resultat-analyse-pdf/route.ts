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

/** Détermine si une valeur numérique est hors normes */
function getAnomalyLevel(valeur: number | null, min: number | null, max: number | null): "bas" | "haut" | "normal" | "inconnu" {
  if (valeur === null) return "inconnu";
  if (min === null && max === null) return "inconnu";
  if (min !== null && valeur < min) return "bas";
  if (max !== null && valeur > max) return "haut";
  return "normal";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const analyseId = request.nextUrl.searchParams.get("analyseId");
    if (!analyseId)
      return NextResponse.json({ error: "analyseId requis" }, { status: 400 });

    // ── Analyse prescrite ─────────────────────────────────────────────────────
    const { data: analyse, error: aErr } = await supabase
      .from("analyses_prescrites")
      .select("*")
      .eq("id", analyseId)
      .single();

    if (aErr || !analyse)
      return NextResponse.json({ error: "Analyse non trouvée" }, { status: 404 });

    // ── Résultats ─────────────────────────────────────────────────────────────
    const { data: resultats, error: rErr } = await supabase
      .from("resultats_analyse")
      .select("*")
      .eq("analyse_id", analyseId)
      .order("created_at", { ascending: true });

    if (rErr || !resultats?.length)
      return NextResponse.json({ error: "Aucun résultat disponible pour cette analyse" }, { status: 404 });

    // ── Patient + médecin prescripteur + laborantin ───────────────────────────
    const [patientRes, medecinRes, labRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", analyse.patient_id).single(),
      supabase.from("users_profiles")
        .select("*, etablissements(nom, adresse, ville, telephone)")
        .eq("id", analyse.medecin_id)
        .single(),
      supabase.from("users_profiles")
        .select("*, etablissements(nom, adresse, ville, telephone)")
        .eq("id", resultats[0].laborantin_id)
        .single(),
    ]);

    const patient = patientRes.data;
    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const medecin = medecinRes.data;
    const laborantin = labRes.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labEtab = (laborantin as any)?.etablissements;

    // ── Audit ─────────────────────────────────────────────────────────────────
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patient.id,
      action: "export_pdf",
      details: JSON.stringify({ type: "resultat_analyse", analyse_id: analyseId }),
      timestamp: new Date().toISOString(),
    });

    // ── QR code ───────────────────────────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const qrBase64 = await QRCode.toDataURL(
      `${baseUrl}/patients/${patient.imu}`,
      { width: 120, margin: 1, color: { dark: "#1E3A5F", light: "#FFFFFF" } }
    );

    const dateResultat   = formatDate(resultats[0].date_resultat);
    const datePrescrit   = formatDate(analyse.date_prescription);
    const agePatient     = formatAge(patient.date_naissance);
    const medecinNom     = medecin ? `${medecin.titre ? medecin.titre + " " : "Dr. "}${medecin.prenom} ${medecin.nom}` : "Médecin prescripteur";
    const labNom         = laborantin ? `${laborantin.prenom} ${laborantin.nom}` : "Laborantin";
    const labSpec        = laborantin?.specialite || "Biologiste médical";
    const labOrdre       = laborantin?.numero_ordre || "";
    const labEtabNom     = labEtab?.nom || "Laboratoire d'analyses médicales";
    const labEtabAdresse = labEtab ? [labEtab.adresse, labEtab.ville].filter(Boolean).join(", ") : "";
    const labEtabTel     = labEtab?.telephone || "";
    const refDoc         = analyseId.slice(0, 8).toUpperCase();

    const hasAnomaly = resultats.some(r => {
      const lvl = getAnomalyLevel(r.valeur !== null ? Number(r.valeur) : null, r.valeur_min !== null ? Number(r.valeur_min) : null, r.valeur_max !== null ? Number(r.valeur_max) : null);
      return lvl === "bas" || lvl === "haut";
    });

    // ── Lignes du tableau ─────────────────────────────────────────────────────
    const rowsHtml = resultats.map((r) => {
      const val    = r.valeur !== null ? Number(r.valeur) : null;
      const vmin   = r.valeur_min !== null ? Number(r.valeur_min) : null;
      const vmax   = r.valeur_max !== null ? Number(r.valeur_max) : null;
      const anomaly = getAnomalyLevel(val, vmin, vmax);
      const displayVal = r.valeur_texte ?? (val !== null ? `${val}` : "—");
      const norme = (vmin !== null || vmax !== null)
        ? `${vmin ?? ""}${vmin !== null && vmax !== null ? " – " : ""}${vmax ?? ""} ${r.unite ?? ""}`.trim()
        : "—";

      const rowClass = anomaly === "bas" ? "row-bas" : anomaly === "haut" ? "row-haut" : "";
      const flagHtml = anomaly === "bas"
        ? `<span class="flag flag-bas">↓ Bas</span>`
        : anomaly === "haut"
        ? `<span class="flag flag-haut">↑ Élevé</span>`
        : "";

      return `
        <tr class="${rowClass}">
          <td class="td-parametre">${r.parametre}${flagHtml}</td>
          <td class="td-valeur">${displayVal}</td>
          <td class="td-unite">${r.unite ?? "—"}</td>
          <td class="td-norme">${norme}</td>
          <td class="td-interpretation">${r.interpretation ?? ""}</td>
        </tr>
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Résultats d'analyses — ${patient.prenom} ${patient.nom}</title>
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
      background: linear-gradient(135deg, #312E81 0%, #1e1b4b 60%, #0f172a 100%);
      border-radius: 10px;
      padding: 20px 24px 16px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .header-left  { flex: 1; }
    .header-lab   { color: white; font-size: 14pt; font-weight: 700; font-family: Georgia, serif; margin-bottom: 2px; }
    .header-spec  { color: rgba(255,255,255,0.75); font-size: 9.5pt; margin-bottom: 6px; }
    .header-etab  { color: rgba(255,255,255,0.6);  font-size: 9pt; }
    .header-right { text-align: right; display: flex; align-items: center; gap: 14px; }

    /* ── BADGE ───────────────────────────────────────── */
    .doc-badge {
      display: flex; align-items: center; justify-content: center;
      gap: 10px; margin: 0 0 18px; padding: 10px 0;
      border-top: 1px solid #E2E8F0;
      border-bottom: 3px solid #7C3AED;
    }
    .doc-badge-icon  { font-size: 20pt; }
    .doc-badge-title { font-size: 14pt; font-weight: 700; color: #1E293B; letter-spacing: 1.5px; text-transform: uppercase; }
    .doc-badge-ref   { font-family: 'Courier New', monospace; font-size: 8pt; color: #94A3B8; background: #F1F5F9; padding: 2px 7px; border-radius: 4px; margin-left: auto; }

    /* ── ALERTE ANOMALIE ─────────────────────────────── */
    .anomaly-banner {
      background: #FFF7ED; border: 1px solid #FED7AA;
      border-radius: 8px; padding: 10px 14px; margin-bottom: 14px;
      display: flex; align-items: center; gap: 8px;
      font-size: 10pt; font-weight: 600; color: #C2410C;
    }

    /* ── META ────────────────────────────────────────── */
    .meta-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 14px; font-size: 9.5pt; color: #64748B;
    }
    .meta-row strong { color: #1E293B; }

    /* ── PATIENT ─────────────────────────────────────── */
    .patient-card {
      background: #F5F3FF; border: 1px solid #DDD6FE;
      border-left: 4px solid #7C3AED;
      border-radius: 0 8px 8px 0;
      padding: 13px 16px; margin-bottom: 18px;
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px;
    }
    .field-label { font-size: 8.5pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
    .field-value { font-size: 10.5pt; font-weight: 600; color: #1E293B; }
    .field-value.imu { font-family: 'Courier New', monospace; color: #312E81; font-size: 11pt; }

    /* ── CONTEXTE CLINIQUE ───────────────────────────── */
    .context-row {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      margin-bottom: 16px;
    }
    .context-card {
      background: #F8FAFC; border: 1px solid #E2E8F0;
      border-radius: 8px; padding: 9px 13px;
      font-size: 9pt;
    }
    .context-label { color: #94A3B8; text-transform: uppercase; font-size: 7.5pt; letter-spacing: 0.4px; margin-bottom: 3px; }
    .context-value { color: #1E293B; font-weight: 600; }

    /* ── TABLE RÉSULTATS ─────────────────────────────── */
    .section-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 10px; color: #7C3AED;
      border-left: 4px solid #7C3AED; padding-left: 10px;
    }
    .section-header h2 { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 14px; }
    thead th {
      background: #312E81; color: white;
      padding: 8px 10px; text-align: left;
      font-size: 9pt; font-weight: 600; letter-spacing: 0.3px;
    }
    thead th:first-child  { border-radius: 6px 0 0 0; }
    thead th:last-child   { border-radius: 0 6px 0 0; }
    tbody tr { border-bottom: 1px solid #F1F5F9; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 8px 10px; vertical-align: top; }
    tbody tr:nth-child(even) { background: #FAFAFA; }

    .row-bas  { background: #EFF6FF !important; }
    .row-haut { background: #FFF7ED !important; }

    .td-parametre { font-weight: 600; color: #1E293B; }
    .td-valeur    { font-weight: 700; font-size: 11pt; color: #1E293B; white-space: nowrap; }
    .td-unite     { color: #64748B; font-size: 9.5pt; }
    .td-norme     { color: #64748B; font-size: 9.5pt; font-family: 'Courier New', monospace; }
    .td-interpretation { font-size: 9pt; color: #475569; font-style: italic; }

    .flag {
      display: inline-block; margin-left: 6px;
      padding: 1px 6px; border-radius: 4px;
      font-size: 8pt; font-weight: 700; vertical-align: middle;
    }
    .flag-bas  { background: #DBEAFE; color: #1D4ED8; }
    .flag-haut { background: #FED7AA; color: #C2410C; }
    .row-bas  .td-valeur { color: #1D4ED8; }
    .row-haut .td-valeur { color: #C2410C; }

    /* ── SIGNATURE ───────────────────────────────────── */
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
      height: 70px; border: 1px solid #CBD5E1; border-radius: 6px; margin-bottom: 6px;
      background: repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,0.015) 8px, rgba(0,0,0,0.015) 9px);
    }
    .sig-name  { font-size: 10pt; font-weight: 700; color: #1E293B; }
    .sig-role  { font-size: 9pt; color: #64748B; }
    .sig-ordre { font-size: 8pt; color: #94A3B8; font-family: 'Courier New', monospace; margin-top: 2px; }

    /* ── PIED ────────────────────────────────────────── */
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
  <div class="no-print" style="display:flex;align-items:center;justify-content:space-between;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:8px;padding:10px 16px;font-family:sans-serif;font-size:10pt;">
    <span style="color:#312E81;font-weight:600;">Résultats d'analyses médicales</span>
    <button onclick="window.print()" style="background:#312E81;color:white;border:none;padding:7px 18px;border-radius:6px;cursor:pointer;font-size:10pt;font-family:sans-serif;font-weight:600;">Imprimer / Enregistrer PDF</button>
  </div>

  <!-- En-tête -->
  <div class="header">
    <div class="header-left">
      <div class="header-lab">${labEtabNom}</div>
      <div class="header-spec">Biologiste : ${labNom}${labSpec ? " — " + labSpec : ""}</div>
      <div class="header-etab">${labEtabAdresse ? labEtabAdresse + (labEtabTel ? " — Tél : " + labEtabTel : "") : labEtabTel ? "Tél : " + labEtabTel : ""}</div>
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
    <span class="doc-badge-icon">📋</span>
    <span class="doc-badge-title">Résultats d'Analyses Médicales</span>
    <span class="doc-badge-ref">Réf. ${refDoc}</span>
  </div>

  ${hasAnomaly ? `
  <div class="anomaly-banner">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C2410C" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    Ce bilan contient des valeurs hors normes — interprétation médicale requise
  </div>` : ""}

  <!-- Meta -->
  <div class="meta-row">
    <span>Date des résultats : <strong>${dateResultat}</strong></span>
    <span>Prescrit le : <strong>${datePrescrit}</strong></span>
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

  <!-- Contexte clinique -->
  <div class="context-row">
    <div class="context-card">
      <div class="context-label">Analyse prescrite</div>
      <div class="context-value">${analyse.type_analyse}${analyse.urgence ? " ⚡ URGENT" : ""}</div>
    </div>
    <div class="context-card">
      <div class="context-label">Médecin prescripteur</div>
      <div class="context-value">${medecinNom}</div>
    </div>
  </div>

  <!-- Tableau résultats -->
  <div class="section-header">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    <h2>Résultats (${resultats.length} paramètre${resultats.length > 1 ? "s" : ""})</h2>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:30%;">Paramètre</th>
        <th style="width:15%;">Valeur</th>
        <th style="width:10%;">Unité</th>
        <th style="width:20%;">Norme</th>
        <th>Interprétation</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <!-- Signature laborantin -->
  <div class="sig-section">
    <div class="sig-note">
      <strong>Remarque :</strong> Ces résultats doivent être interprétés par un médecin dans le contexte clinique du patient.
      Les valeurs de référence peuvent varier selon les techniques analytiques utilisées.
    </div>
    <div class="sig-block">
      <div class="sig-area"></div>
      <div class="sig-name">${labNom}</div>
      <div class="sig-role">${labSpec}</div>
      ${labOrdre ? `<div class="sig-ordre">N° Ordre : ${labOrdre}</div>` : ""}
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

    // ── Sauvegarde dans le storage + mise à jour pdf_url ─────────────────────
    try {
      const ts = Date.now();
      const storageKey = `${patient.id}/generated/${ts}_resultat_${analyseId.slice(0, 8)}.html`;
      const htmlBuffer = Buffer.from(html, "utf-8");
      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(storageKey, htmlBuffer, { contentType: "text/html; charset=utf-8" });
      if (!storageError) {
        const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(storageKey);
        await Promise.all([
          supabase.from("documents").insert({
            patient_id: patient.id,
            nom: `Résultats — ${analyse.type_analyse} — ${dateResultat}`,
            url: `/api/resultat-analyse-pdf?analyseId=${analyseId}`,
            type: "compte_rendu",
            taille: htmlBuffer.length,
            uploaded_by: user.id,
            description: `${resultats.length} paramètre(s)${hasAnomaly ? " — valeurs anormales détectées" : ""}`,
          }),
          // Met à jour le pdf_url sur chaque résultat
          supabase.from("resultats_analyse")
            .update({ pdf_url: `/api/resultat-analyse-pdf?analyseId=${analyseId}` })
            .eq("analyse_id", analyseId),
        ]);
      }
    } catch { /* ne pas bloquer la réponse */ }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("resultat-analyse-pdf error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
