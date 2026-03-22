import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { patient, hospitalisation, medecin, etablissement } = await request.json();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const qrBase64 = await QRCode.toDataURL(
    `${baseUrl}/patients/${patient.imu}`,
    { width: 120, margin: 1, color: { dark: "#1E3A5F", light: "#FFFFFF" } }
  );

  const entree = hospitalisation.date_entree
    ? new Date(hospitalisation.date_entree).toLocaleDateString("fr-FR")
    : "—";
  const sortie = hospitalisation.date_sortie
    ? new Date(hospitalisation.date_sortie).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");
  const entreeDate = new Date(hospitalisation.date_entree || new Date());
  const sortieDate = new Date(hospitalisation.date_sortie || new Date());
  const duree = Math.round((sortieDate.getTime() - entreeDate.getTime()) / (1000 * 60 * 60 * 24));

  const modeSortieLabels: Record<string, string> = {
    domicile: "Retour à domicile",
    transfert: "Transfert inter-établissement",
    deces: "Décès",
    fugue: "Fugue / sortie contre avis médical",
  };

  const modeSortieColors: Record<string, string> = {
    domicile: "#065F46",
    transfert: "#1E3A5F",
    deces: "#7F1D1D",
    fugue: "#78350F",
  };

  const medecinNom = medecin
    ? `${medecin.titre ? medecin.titre + " " : "Dr. "}${medecin.prenom} ${medecin.nom}`
    : "________________";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Lettre de Sortie — ${patient.prenom} ${patient.nom}</title>
  <style>
    @page { size: A4; margin: 12mm 16mm 16mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, Arial, sans-serif;
      font-size: 11pt;
      color: #1E293B;
      background: #fff;
      line-height: 1.6;
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
    }
    .header-left { color: white; }
    .header-etab { font-size: 13pt; font-weight: 700; font-family: Georgia, serif; margin-bottom: 3px; }
    .header-addr { font-size: 9pt; color: rgba(255,255,255,0.7); line-height: 1.45; }
    .header-right { text-align: right; }

    /* ── BADGE TITRE ─────────────────────────────────── */
    .doc-badge {
      text-align: center;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 2px solid #1E3A5F;
    }
    .doc-badge h1 { font-size: 13pt; font-weight: 700; color: #1E3A5F; text-transform: uppercase; letter-spacing: 2px; }
    .doc-badge p { font-size: 9.5pt; color: #64748B; margin-top: 4px; }

    /* ── RÉSUMÉ SÉJOUR (KPIS) ────────────────────────── */
    .stay-kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-top: 3px solid #1E3A5F;
      border-radius: 0 0 8px 8px;
      padding: 10px 12px;
      text-align: center;
    }
    .kpi-label { font-size: 8pt; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px; }
    .kpi-value { font-size: 13pt; font-weight: 700; color: #1E3A5F; line-height: 1.1; }
    .kpi-sub { font-size: 8pt; color: #64748B; margin-top: 2px; }

    /* ── IDENTITÉS ───────────────────────────────────── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }
    .info-block {
      border: 1px solid #E2E8F0;
      border-left: 4px solid #1E3A5F;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
    }
    .info-block h3 {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1E3A5F;
      font-weight: 700;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E2E8F0;
    }
    .info-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 9.5pt; }
    .info-label { color: #64748B; min-width: 110px; flex-shrink: 0; }
    .info-value { font-weight: 600; color: #1E293B; }
    .info-value.mono { font-family: 'Courier New', monospace; font-size: 9pt; }

    /* ── SECTIONS MÉDICALES ──────────────────────────── */
    .medical-section { margin-bottom: 14px; }
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      border-left: 4px solid #1E3A5F;
      padding-left: 10px;
      margin-bottom: 8px;
    }
    .section-header h2 { font-size: 10pt; font-weight: 700; color: #1E3A5F; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-content {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 0 8px 8px 8px;
      padding: 12px 16px;
      font-size: 10.5pt;
      color: #334155;
      white-space: pre-wrap;
      min-height: 40px;
    }
    .section-empty { font-style: italic; color: #94A3B8; }

    /* ── DIAGNOSTIC SORTIE ───────────────────────────── */
    .diag-box {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-left: 4px solid #3B82F6;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .diag-cim { font-family: 'Courier New', monospace; font-size: 12pt; font-weight: 700; color: #3B82F6; flex-shrink: 0; }
    .diag-text { font-size: 10.5pt; font-weight: 600; color: #1E293B; }

    /* ── RECOMMANDATIONS ─────────────────────────────── */
    .reco-box {
      background: #FFFBEB;
      border: 1.5px solid #FCD34D;
      border-left: 5px solid #D97706;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      min-height: 80px;
    }
    .reco-box h2 {
      font-size: 10pt;
      font-weight: 700;
      color: #D97706;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .reco-placeholder { font-style: italic; color: #92400E; font-size: 10pt; }

    /* ── SIGNATURE ───────────────────────────────────── */
    .sig-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 28px;
    }
    .sig-block { text-align: center; }
    .sig-block p { font-size: 10.5pt; font-weight: 700; }
    .sig-block .sig-sub { font-size: 9.5pt; color: #64748B; font-weight: 400; margin-top: 2px; }
    .sig-area {
      height: 65px;
      width: 200px;
      margin: 8px auto;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      background: repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,0.015) 8px, rgba(0,0,0,0.015) 9px);
    }
    .sig-label { font-size: 8pt; color: #94A3B8; }

    /* ── PIED PAGE ───────────────────────────────────── */
    .doc-footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94A3B8;
    }
    .confidential-badge {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 7.5pt;
      color: #64748B;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    @media print { body { print-color-adjust: exact; } }
  </style>
</head>
<body>

  <!-- En-tête -->
  <div class="header">
    <div class="header-left">
      <div class="header-etab">${etablissement?.nom || "Établissement de Santé"}</div>
      ${etablissement?.adresse ? `<div class="header-addr">${etablissement.adresse}${etablissement.ville ? ", " + etablissement.ville : ""}</div>` : ""}
      ${etablissement?.telephone ? `<div class="header-addr">Tél : ${etablissement.telephone}</div>` : ""}
    </div>
    <div class="header-right" style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
      ${LOGO_LIGHT}
      <div style="text-align:center;">
        <div style="background:white;border-radius:6px;padding:3px;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
          <img src="${qrBase64}" width="70" height="70" alt="QR Patient" style="display:block;"/>
        </div>
        <div style="font-size:6.5pt;color:rgba(255,255,255,0.55);margin-top:3px;letter-spacing:0.3px;">Scan · Vérifier</div>
      </div>
    </div>
  </div>

  <!-- Titre -->
  <div class="doc-badge">
    <h1>Lettre de Sortie d'Hospitalisation</h1>
    <p>Document médical confidentiel — à conserver avec le dossier du patient</p>
  </div>

  <!-- KPIs séjour -->
  <div class="stay-kpis">
    <div class="kpi">
      <div class="kpi-label">Service</div>
      <div class="kpi-value" style="font-size:11pt;">${hospitalisation.service}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Entrée</div>
      <div class="kpi-value" style="font-size:11pt;">${entree}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Sortie</div>
      <div class="kpi-value" style="font-size:11pt;">${sortie}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Durée du séjour</div>
      <div class="kpi-value">${duree}<span style="font-size:9pt;font-weight:400;"> j</span></div>
      ${hospitalisation.mode_sortie ? `<div class="kpi-sub" style="color:${modeSortieColors[hospitalisation.mode_sortie] || "#64748B"};font-weight:600;">${modeSortieLabels[hospitalisation.mode_sortie] || hospitalisation.mode_sortie}</div>` : ""}
    </div>
  </div>

  <!-- Infos patient + séjour -->
  <div class="info-grid">
    <div class="info-block">
      <h3>Identité du patient</h3>
      <div class="info-row"><span class="info-label">Nom complet</span><span class="info-value">${patient.prenom} ${patient.nom.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">IMU</span><span class="info-value mono">${patient.imu}</span></div>
      <div class="info-row"><span class="info-label">Date de naissance</span><span class="info-value">${patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString("fr-FR") : "—"}</span></div>
      <div class="info-row"><span class="info-label">Sexe</span><span class="info-value">${patient.sexe === "M" ? "Masculin" : "Féminin"}</span></div>
      ${patient.groupe_sanguin ? `<div class="info-row"><span class="info-label">Groupe sanguin</span><span class="info-value">${patient.groupe_sanguin}${patient.rhesus || ""}</span></div>` : ""}
    </div>
    <div class="info-block">
      <h3>Séjour hospitalier</h3>
      <div class="info-row"><span class="info-label">Service</span><span class="info-value">${hospitalisation.service}</span></div>
      ${hospitalisation.chambre ? `<div class="info-row"><span class="info-label">Chambre / Lit</span><span class="info-value">${hospitalisation.chambre}${hospitalisation.lit ? " — Lit " + hospitalisation.lit : ""}</span></div>` : ""}
      <div class="info-row"><span class="info-label">Date d'entrée</span><span class="info-value">${entree}</span></div>
      <div class="info-row"><span class="info-label">Date de sortie</span><span class="info-value">${sortie}</span></div>
      <div class="info-row"><span class="info-label">Durée</span><span class="info-value">${duree} jour${duree > 1 ? "s" : ""}</span></div>
      ${hospitalisation.mode_sortie ? `<div class="info-row"><span class="info-label">Mode de sortie</span><span class="info-value" style="color:${modeSortieColors[hospitalisation.mode_sortie] || "#1E293B"};">${modeSortieLabels[hospitalisation.mode_sortie] || hospitalisation.mode_sortie}</span></div>` : ""}
    </div>
  </div>

  <!-- Motif -->
  <div class="medical-section">
    <div class="section-header"><h2>Motif d'hospitalisation</h2></div>
    <div class="section-content">${hospitalisation.motif || '<span class="section-empty">Non renseigné</span>'}</div>
  </div>

  <!-- Diagnostic entrée -->
  ${hospitalisation.diagnostic_entree ? `
  <div class="medical-section">
    <div class="section-header"><h2>Diagnostic d'entrée</h2></div>
    <div class="section-content">${hospitalisation.diagnostic_entree}</div>
  </div>` : ""}

  <!-- Diagnostic sortie -->
  ${hospitalisation.diagnostic_sortie ? `
  <div class="medical-section">
    <div class="section-header"><h2>Diagnostic de sortie</h2></div>
    <div class="diag-box">
      ${hospitalisation.diagnostic_sortie_cim10 ? `<span class="diag-cim">${hospitalisation.diagnostic_sortie_cim10}</span>` : ""}
      <span class="diag-text">${hospitalisation.diagnostic_sortie}</span>
    </div>
  </div>` : ""}

  <!-- Résumé séjour -->
  <div class="medical-section">
    <div class="section-header"><h2>Résumé du séjour et évolution clinique</h2></div>
    <div class="section-content">${hospitalisation.resume_sejour || '<span class="section-empty">Aucun résumé saisi.</span>'}</div>
  </div>

  <!-- Recommandations -->
  <div class="reco-box">
    <h2>Recommandations et conduite à tenir à la sortie</h2>
    <p class="reco-placeholder">
      Traitements de sortie, surveillance, rendez-vous de suivi, restrictions d'activité, régime alimentaire, rééducation…
      (à compléter par le médecin responsable avant remise au patient)
    </p>
  </div>

  <!-- Signatures -->
  <div class="sig-section">
    <div class="sig-block">
      <p>${medecinNom}</p>
      ${medecin?.specialite ? `<p class="sig-sub">${medecin.specialite}</p>` : ""}
      ${medecin?.numero_ordre ? `<p class="sig-sub" style="font-family:'Courier New',monospace;font-size:8.5pt;">N° Ordre : ${medecin.numero_ordre}</p>` : ""}
      <div class="sig-area"></div>
      <p class="sig-label">Signature et cachet — Médecin responsable</p>
    </div>
    <div class="sig-block">
      <p>Chef de service</p>
      <p class="sig-sub">${hospitalisation.service}</p>
      <div class="sig-area"></div>
      <p class="sig-label">Signature et cachet — Chef de service</p>
    </div>
  </div>

  <!-- Pied de page -->
  <div class="doc-footer">
    <span>MediLink — IMU : ${patient.imu} — Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
    <span class="confidential-badge">Document médical confidentiel</span>
    <span>${etablissement?.nom || ""}</span>
  </div>

<script>window.onload = () => window.print();</script>
</body>
</html>`;

  // Sauvegarde dans l'espace documents du patient
  if (!user || !patient?.id) {
    console.error("[lettre-sortie] save skipped: user or patient.id missing");
  } else {
    try {
      const ts = Date.now();
      const storageKey = `${patient.id}/generated/${ts}_lettre-sortie.html`;
      const htmlBuffer = Buffer.from(html, "utf-8");
      const { error: storageError } = await supabase.storage
        .from("documents")
        .upload(storageKey, htmlBuffer, { contentType: "text/html; charset=utf-8" });
      if (storageError) {
        console.error("[lettre-sortie] storage upload failed:", storageError.message);
      } else {
        const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(storageKey);
        const { error: insertError } = await supabase.from("documents").insert({
          patient_id: patient.id,
          nom: `Lettre de sortie — ${hospitalisation?.service || "Hospitalisation"} — ${sortie}`,
          url: publicUrl,
          type: "compte_rendu",
          taille: htmlBuffer.length,
          uploaded_by: user.id,
          description: `Sortie : ${modeSortieLabels[hospitalisation?.mode_sortie] || hospitalisation?.mode_sortie || "—"}`,
        });
        if (insertError) console.error("[lettre-sortie] documents insert failed:", insertError.message);
      }
    } catch (err) {
      console.error("[lettre-sortie] document save error:", err);
    }
  }

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
