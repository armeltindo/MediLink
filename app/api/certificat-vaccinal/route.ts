import { NextRequest, NextResponse } from "next/server";

interface VaccinRow {
  vaccin: string;
  dose?: string;
  lot?: string;
  date_vaccination: string;
  voie?: string;
  notes?: string;
  etablissement?: { nom: string };
}

export async function POST(request: NextRequest) {
  const { patient, vaccinations, etablissement } = await request.json();

  const vaccinRows = (vaccinations as VaccinRow[])
    .map((v) => `
      <tr>
        <td style="border:1px solid #dee2e6;padding:8px;">${v.vaccin}</td>
        <td style="border:1px solid #dee2e6;padding:8px;">${v.dose || "—"}</td>
        <td style="border:1px solid #dee2e6;padding:8px;">${new Date(v.date_vaccination).toLocaleDateString("fr-FR")}</td>
        <td style="border:1px solid #dee2e6;padding:8px;">${v.lot || "—"}</td>
        <td style="border:1px solid #dee2e6;padding:8px;">${v.voie || "—"}</td>
        <td style="border:1px solid #dee2e6;padding:8px;">${(v.etablissement as { nom: string } | null | undefined)?.nom || etablissement || "—"}</td>
      </tr>
    `)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Certificat de Vaccination — ${patient.prenom} ${patient.nom}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #0D7A5F; padding-bottom: 20px; }
    .logo-svg { display: block; }
    .ministry { text-align: right; font-size: 10px; color: #666; }
    .title { text-align: center; margin: 24px 0 20px; }
    .title h1 { font-size: 18px; font-weight: 700; color: #0D7A5F; letter-spacing: 0.5px; }
    .title p { font-size: 11px; color: #666; margin-top: 4px; }
    .patient-card { background: #f0f9f6; border: 1px solid #0D7A5F; border-radius: 8px; padding: 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .patient-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .patient-card .value { font-weight: 600; font-size: 13px; }
    .npi { font-family: monospace; font-size: 16px; font-weight: 700; color: #0D7A5F; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead { background: #0D7A5F; color: white; }
    thead th { padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    td { font-size: 11px; }
    .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .signature-block { text-align: center; }
    .signature-line { border-top: 1px solid #333; width: 200px; margin: 40px auto 8px; }
    .legal { margin-top: 24px; padding: 12px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; font-size: 10px; color: #666; }
    .stamp { border: 2px solid #0D7A5F; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; text-align: center; color: #0D7A5F; font-size: 8px; font-weight: 700; margin: 10px auto; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <svg class="logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 44" height="44">
        <path d="M22 4 L38 10 L38 24 Q38 33 22 39 Q6 33 6 24 L6 10 Z" fill="#1E3A5F"/>
        <polyline points="6,24 10,24 12,18 14,30 16,21 18,24 22,24" fill="none" stroke="#60A5FA" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="28" cy="15" r="1.3" fill="#60A5FA" opacity="0.8"/><circle cx="33" cy="11" r="1.1" fill="#60A5FA" opacity="0.7"/>
        <circle cx="37" cy="17" r="1.1" fill="#60A5FA" opacity="0.7"/><circle cx="34" cy="23" r="1.3" fill="#60A5FA" opacity="0.8"/>
        <line x1="28" y1="15" x2="33" y2="11" stroke="#60A5FA" stroke-width="0.8" opacity="0.5"/>
        <line x1="33" y1="11" x2="37" y2="17" stroke="#60A5FA" stroke-width="0.8" opacity="0.5"/>
        <line x1="37" y1="17" x2="34" y2="23" stroke="#60A5FA" stroke-width="0.8" opacity="0.5"/>
        <line x1="28" y1="15" x2="34" y2="23" stroke="#60A5FA" stroke-width="0.8" opacity="0.4"/>
        <line x1="22" y1="10" x2="22" y2="35" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M22 12 Q17 9 16 12 Q17 15 22 14 Z" fill="white" opacity="0.9"/>
        <path d="M22 12 Q27 9 28 12 Q27 15 22 14 Z" fill="white" opacity="0.9"/>
        <path d="M22 17 Q19 20 22 23 Q25 26 22 29 Q19 32 22 35" fill="none" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
        <path d="M22 17 Q25 20 22 23 Q19 26 22 29 Q25 32 22 35" fill="none" stroke="white" stroke-width="1.1" stroke-linecap="round"/>
        <text x="50" y="27" font-family="Georgia,serif" font-weight="700" font-size="20" fill="#1E293B">MediLink</text>
        <text x="51" y="38" font-family="Arial,sans-serif" font-size="9" fill="#64748B" letter-spacing="0.5">DME Unifié · Bénin</text>
      </svg>
      <p style="font-size:10px;color:#666;">Dossier Médical Électronique Unifié</p>
      <p style="font-size:10px;color:#666;">${etablissement || "République du Bénin"}</p>
    </div>
    <div class="ministry">
      <p><strong>MINISTÈRE DE LA SANTÉ</strong></p>
      <p>République du Bénin</p>
      <p>Programme Élargi de Vaccination</p>
      <p style="margin-top:4px;">Émis le : ${new Date().toLocaleDateString("fr-FR")}</p>
    </div>
  </div>

  <div class="title">
    <h1>CARNET DE VACCINATION</h1>
    <p>Certificat International de Vaccination — conforme aux exigences OMS</p>
  </div>

  <div class="patient-card">
    <div>
      <p class="label">Nom et prénom</p>
      <p class="value">${patient.nom} ${patient.prenom}</p>
    </div>
    <div>
      <p class="label">NPI — Identifiant national</p>
      <p class="npi">${patient.npi}</p>
    </div>
    <div>
      <p class="label">Date de naissance</p>
      <p class="value">${patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString("fr-FR") : "—"}</p>
    </div>
    <div>
      <p class="label">Sexe</p>
      <p class="value">${patient.sexe === "M" ? "Masculin" : "Féminin"}</p>
    </div>
    <div>
      <p class="label">Nationalité</p>
      <p class="value">${patient.nationalite || "Béninoise"}</p>
    </div>
    <div>
      <p class="label">Groupe sanguin</p>
      <p class="value">${patient.groupe_sanguin ? `${patient.groupe_sanguin}${patient.rhesus || ""}` : "Non renseigné"}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Vaccin</th>
        <th>Dose</th>
        <th>Date</th>
        <th>N° Lot</th>
        <th>Voie</th>
        <th>Établissement</th>
      </tr>
    </thead>
    <tbody>
      ${vaccinRows || '<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">Aucune vaccination enregistrée</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <div class="signature-block">
      <p style="font-size:11px;font-weight:600;margin-bottom:4px;">Médecin responsable</p>
      <div class="signature-line"></div>
      <p style="font-size:10px;color:#666;">Signature et cachet</p>
    </div>
    <div class="signature-block">
      <div class="stamp">OFFICIAL<br>STAMP</div>
      <p style="font-size:10px;color:#666;">Cachet officiel</p>
    </div>
  </div>

  <div class="legal">
    <p><strong>Document officiel :</strong> Ce certificat de vaccination a été généré électroniquement par le système MediLink.
    Les données proviennent du dossier médical électronique certifié de l'établissement.
    NPI patient : <strong>${patient.npi}</strong> — Généré le ${new Date().toLocaleString("fr-FR")}.</p>
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
