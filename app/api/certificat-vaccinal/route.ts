import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

interface VaccinRow {
  vaccin: string;
  dose?: string;
  lot?: string;
  date_vaccination: string;
  voie?: string;
  notes?: string;
  etablissement?: { nom: string };
}

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
  const { patient, vaccinations, etablissement } = await request.json();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const qrBase64 = await QRCode.toDataURL(
    `${baseUrl}/patients/${patient.imu}`,
    { width: 120, margin: 1, color: { dark: "#065F46", light: "#FFFFFF" } }
  );

  const vaccinRows = (vaccinations as VaccinRow[])
    .map((v, i) => `
      <tr style="${i % 2 === 1 ? "background:#F0FDF4;" : "background:#fff;"}">
        <td class="td-main">${v.vaccin}</td>
        <td class="td">${v.dose || "—"}</td>
        <td class="td">${new Date(v.date_vaccination).toLocaleDateString("fr-FR")}</td>
        <td class="td td-mono">${v.lot || "—"}</td>
        <td class="td">${v.voie || "—"}</td>
        <td class="td">${(v.etablissement as { nom: string } | null | undefined)?.nom || etablissement || "—"}</td>
      </tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Certificat de Vaccination — ${patient.prenom} ${patient.nom}</title>
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
      background: linear-gradient(135deg, #065F46 0%, #0D7A5F 60%, #1E3A5F 100%);
      border-radius: 10px;
      padding: 20px 24px 16px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { color: white; }
    .header-left h2 { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
    .header-left p { font-size: 9pt; color: rgba(255,255,255,0.7); line-height: 1.4; }
    .header-ministry { text-align: right; color: rgba(255,255,255,0.8); font-size: 9pt; }
    .header-ministry strong { display: block; color: white; font-size: 9.5pt; margin-bottom: 2px; }

    /* ── BADGE TITRE ─────────────────────────────────── */
    .doc-title {
      text-align: center;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 3px solid #0D7A5F;
    }
    .doc-title h1 { font-size: 14pt; font-weight: 700; color: #065F46; text-transform: uppercase; letter-spacing: 2px; }
    .doc-title p { font-size: 9.5pt; color: #64748B; margin-top: 4px; }
    .pev-badge {
      display: inline-block;
      background: #D1FAE5;
      color: #065F46;
      font-size: 8.5pt;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      border: 1px solid #6EE7B7;
      margin-top: 6px;
      letter-spacing: 0.5px;
    }

    /* ── CARTE PATIENT ───────────────────────────────── */
    .patient-card {
      background: #F0FDF4;
      border: 1px solid #6EE7B7;
      border-left: 4px solid #0D7A5F;
      border-radius: 0 10px 10px 0;
      padding: 14px 18px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px 20px;
    }
    .field-label { font-size: 8pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
    .field-value { font-size: 10.5pt; font-weight: 600; color: #1E293B; }
    .imu-value { font-family: 'Courier New', monospace; font-size: 12pt; font-weight: 700; color: #0D7A5F; }

    /* ── TABLEAU VACCINS ─────────────────────────────── */
    .table-wrapper { margin-bottom: 20px; border-radius: 10px; overflow: hidden; border: 1px solid #D1FAE5; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    table { width: 100%; border-collapse: collapse; }
    thead { background: linear-gradient(to right, #065F46, #0D7A5F); }
    thead th { padding: 10px 10px; text-align: left; font-size: 9.5pt; font-weight: 700; color: white; letter-spacing: 0.3px; }
    .td { padding: 8px 10px; font-size: 9.5pt; border-bottom: 1px solid #D1FAE5; vertical-align: top; }
    .td-main { padding: 8px 10px; font-size: 10pt; font-weight: 600; color: #065F46; border-bottom: 1px solid #D1FAE5; vertical-align: top; }
    .td-mono { font-family: 'Courier New', monospace; font-size: 9pt; }
    .no-data { text-align: center; padding: 24px; color: #94A3B8; font-style: italic; font-size: 10pt; }

    /* ── PIED SIGNATURE ──────────────────────────────── */
    .sig-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 24px;
    }
    .sig-block { text-align: center; }
    .sig-block p { font-size: 10pt; font-weight: 600; margin-bottom: 4px; }
    .sig-area {
      height: 60px;
      width: 200px;
      margin: 6px auto;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      background: repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(0,0,0,0.015) 8px, rgba(0,0,0,0.015) 9px);
    }
    .stamp-circle {
      height: 80px;
      width: 80px;
      border: 2px solid #0D7A5F;
      border-radius: 50%;
      margin: 4px auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stamp-text { font-size: 7pt; color: #0D7A5F; font-weight: 700; text-transform: uppercase; text-align: center; letter-spacing: 0.5px; }
    .sig-label { font-size: 8pt; color: #94A3B8; margin-top: 3px; }

    /* ── NOTE LÉGALE ─────────────────────────────────── */
    .legal-note {
      margin-top: 18px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 8.5pt;
      color: #64748B;
      line-height: 1.5;
    }

    /* ── PIED PAGE ───────────────────────────────────── */
    .doc-footer {
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #94A3B8;
    }
    .official-badge {
      background: #D1FAE5;
      border: 1px solid #6EE7B7;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 7.5pt;
      color: #065F46;
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
      ${LOGO_LIGHT}
      <p style="margin-top:6px;">Dossier Médical Électronique Unifié</p>
      ${etablissement ? `<p>${etablissement}</p>` : ""}
    </div>
    <div style="text-align:center;flex-shrink:0;">
      <div style="background:white;border-radius:6px;padding:3px;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
        <img src="${qrBase64}" width="70" height="70" alt="QR Patient" style="display:block;"/>
      </div>
      <div style="font-size:6.5pt;color:rgba(255,255,255,0.55);margin-top:3px;letter-spacing:0.3px;">Scan · Vérifier</div>
    </div>
    <div class="header-ministry">
      <strong>MINISTÈRE DE LA SANTÉ</strong>
      <span>République du Bénin</span>
      <span style="display:block;margin-top:2px;">Programme Élargi de Vaccination</span>
      <span style="display:block;margin-top:4px;font-size:8.5pt;">Émis le ${new Date().toLocaleDateString("fr-FR")}</span>
    </div>
  </div>

  <!-- Titre -->
  <div class="doc-title">
    <h1>Carnet de Vaccination</h1>
    <p>Certificat International de Vaccination — conforme aux exigences OMS/MSPRSS</p>
    <span class="pev-badge">Programme Élargi de Vaccination — Bénin</span>
  </div>

  <!-- Patient -->
  <div class="patient-card">
    <div>
      <div class="field-label">Nom et prénom</div>
      <div class="field-value">${patient.nom.toUpperCase()} ${patient.prenom}</div>
    </div>
    <div>
      <div class="field-label">Identifiant IMU</div>
      <div class="imu-value">${patient.imu}</div>
    </div>
    <div>
      <div class="field-label">Date de naissance</div>
      <div class="field-value">${patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString("fr-FR") : "—"}</div>
    </div>
    <div>
      <div class="field-label">Sexe</div>
      <div class="field-value">${patient.sexe === "M" ? "Masculin" : "Féminin"}</div>
    </div>
    <div>
      <div class="field-label">Nationalité</div>
      <div class="field-value">${patient.nationalite || "Béninoise"}</div>
    </div>
    <div>
      <div class="field-label">Groupe sanguin</div>
      <div class="field-value">${patient.groupe_sanguin ? `${patient.groupe_sanguin}${patient.rhesus || ""}` : "Non renseigné"}</div>
    </div>
  </div>

  <!-- Tableau vaccinations -->
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th style="width:28%">Vaccin</th>
          <th style="width:10%">Dose</th>
          <th style="width:14%">Date</th>
          <th style="width:14%">N° Lot</th>
          <th style="width:10%">Voie</th>
          <th>Établissement</th>
        </tr>
      </thead>
      <tbody>
        ${vaccinRows || `<tr><td colspan="6" class="no-data">Aucune vaccination enregistrée</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- Signatures -->
  <div class="sig-section">
    <div class="sig-block">
      <p>Médecin responsable</p>
      <div class="sig-area"></div>
      <p class="sig-label">Signature et cachet</p>
    </div>
    <div class="sig-block">
      <p>Sceau officiel</p>
      <div class="stamp-circle">
        <div class="stamp-text">CERTIFICAT<br>OFFICIEL<br>PEV BÉNIN</div>
      </div>
      <p class="sig-label">Tampon de l'établissement</p>
    </div>
  </div>

  <!-- Note légale -->
  <div class="legal-note">
    <strong>Document officiel :</strong> Ce carnet de vaccination a été généré électroniquement par le système MediLink
    à partir du dossier médical certifié de l'établissement.
    IMU patient : <strong>${patient.imu}</strong> —
    Généré le ${new Date().toLocaleString("fr-FR")}.
    Ce document est authentique et peut être présenté aux autorités sanitaires.
  </div>

  <!-- Pied de page -->
  <div class="doc-footer">
    <span>MediLink DME — République du Bénin</span>
    <span class="official-badge">Document officiel</span>
    <span>IMU : ${patient.imu}</span>
  </div>

<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
