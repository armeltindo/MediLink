import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { patient, hospitalisation, medecin, etablissement } = await request.json();

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

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Lettre de Sortie — ${patient.prenom} ${patient.nom}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Inter, Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; line-height: 1.6; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #0D7A5F; padding-bottom: 20px; }
    .logo { font-size: 22px; font-weight: 700; color: #0D7A5F; }
    .logo span { font-weight: 300; }
    .etab-info { text-align: right; font-size: 10px; color: #666; }
    .doc-title { text-align: center; margin: 20px 0; }
    .doc-title h1 { font-size: 16px; font-weight: 700; color: #0D7A5F; text-transform: uppercase; letter-spacing: 1px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    .meta-block { background: #f8f9fa; border-left: 3px solid #0D7A5F; padding: 12px; border-radius: 0 4px 4px 0; }
    .meta-block h3 { font-size: 10px; text-transform: uppercase; color: #0D7A5F; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
    .meta-row { display: flex; gap: 8px; margin-bottom: 4px; }
    .meta-label { font-weight: 600; min-width: 120px; font-size: 11px; }
    .meta-value { font-size: 11px; color: #333; }
    .section { margin: 20px 0; }
    .section h2 { font-size: 12px; font-weight: 700; color: #0D7A5F; text-transform: uppercase; border-bottom: 1px solid #dee2e6; padding-bottom: 4px; margin-bottom: 10px; letter-spacing: 0.5px; }
    .section p { font-size: 12px; color: #333; white-space: pre-wrap; }
    .section-empty { font-style: italic; color: #999; }
    .recommendations { background: #fff8e7; border: 1px solid #ffc107; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .recommendations h2 { color: #d97706; border-bottom-color: #ffc107; }
    .footer-signature { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
    .sig-block { text-align: center; }
    .sig-line { border-top: 1px solid #333; width: 200px; margin: 50px auto 8px; }
    .legal { margin-top: 30px; padding: 10px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; font-size: 9px; color: #888; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">Medi<span>Link</span></div>
      <p style="font-size:10px;color:#666;">Dossier Médical Électronique Unifié</p>
    </div>
    <div class="etab-info">
      <p><strong>${etablissement?.nom || "Établissement de Santé"}</strong></p>
      ${etablissement?.adresse ? `<p>${etablissement.adresse}</p>` : ""}
      ${etablissement?.ville ? `<p>${etablissement.ville}</p>` : ""}
      ${etablissement?.telephone ? `<p>Tél : ${etablissement.telephone}</p>` : ""}
      <p>Date : ${new Date().toLocaleDateString("fr-FR")}</p>
    </div>
  </div>

  <div class="doc-title">
    <h1>Lettre de Sortie d'Hospitalisation</h1>
    <p style="font-size:11px;color:#666;margin-top:4px;">Document médical confidentiel</p>
  </div>

  <div class="meta-grid">
    <div class="meta-block">
      <h3>Identité du patient</h3>
      <div class="meta-row"><span class="meta-label">Nom :</span><span class="meta-value">${patient.prenom} ${patient.nom}</span></div>
      <div class="meta-row"><span class="meta-label">NPI :</span><span class="meta-value" style="font-family:monospace;font-weight:600;">${patient.npi}</span></div>
      <div class="meta-row"><span class="meta-label">Date de naissance :</span><span class="meta-value">${patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString("fr-FR") : "—"}</span></div>
      <div class="meta-row"><span class="meta-label">Sexe :</span><span class="meta-value">${patient.sexe === "M" ? "Masculin" : "Féminin"}</span></div>
      ${patient.groupe_sanguin ? `<div class="meta-row"><span class="meta-label">Groupe sanguin :</span><span class="meta-value">${patient.groupe_sanguin}${patient.rhesus || ""}</span></div>` : ""}
    </div>
    <div class="meta-block">
      <h3>Séjour hospitalier</h3>
      <div class="meta-row"><span class="meta-label">Service :</span><span class="meta-value">${hospitalisation.service}</span></div>
      <div class="meta-row"><span class="meta-label">Date d'entrée :</span><span class="meta-value">${entree}</span></div>
      <div class="meta-row"><span class="meta-label">Date de sortie :</span><span class="meta-value">${sortie}</span></div>
      <div class="meta-row"><span class="meta-label">Durée :</span><span class="meta-value">${duree} jour${duree > 1 ? "s" : ""}</span></div>
      ${hospitalisation.mode_sortie ? `<div class="meta-row"><span class="meta-label">Mode de sortie :</span><span class="meta-value">${modeSortieLabels[hospitalisation.mode_sortie] || hospitalisation.mode_sortie}</span></div>` : ""}
      ${hospitalisation.chambre ? `<div class="meta-row"><span class="meta-label">Chambre/Lit :</span><span class="meta-value">${hospitalisation.chambre}${hospitalisation.lit ? ` — Lit ${hospitalisation.lit}` : ""}</span></div>` : ""}
    </div>
  </div>

  <div class="section">
    <h2>Motif d'hospitalisation</h2>
    <p>${hospitalisation.motif || '<span class="section-empty">Non renseigné</span>'}</p>
  </div>

  ${hospitalisation.diagnostic_entree ? `
  <div class="section">
    <h2>Diagnostic d'entrée</h2>
    <p>${hospitalisation.diagnostic_entree}</p>
  </div>` : ""}

  ${hospitalisation.diagnostic_sortie ? `
  <div class="section">
    <h2>Diagnostic de sortie${hospitalisation.diagnostic_sortie_cim10 ? ` (CIM-10 : ${hospitalisation.diagnostic_sortie_cim10})` : ""}</h2>
    <p>${hospitalisation.diagnostic_sortie}</p>
  </div>` : ""}

  <div class="section">
    <h2>Résumé du séjour et évolution clinique</h2>
    <p>${hospitalisation.resume_sejour || '<span class="section-empty">Aucun résumé saisi.</span>'}</p>
  </div>

  <div class="recommendations">
    <h2>Recommandations et conduite à tenir</h2>
    <p style="font-style:italic;color:#92400e;">
      [À compléter par le médecin responsable : traitements de sortie, surveillance, rendez-vous de suivi, restriction d'activité, etc.]
    </p>
  </div>

  <div class="footer-signature">
    <div class="sig-block">
      <p style="font-size:11px;font-weight:600;">Médecin responsable</p>
      ${medecin ? `<p style="font-size:11px;margin-top:4px;">${medecin.titre ? `${medecin.titre} ` : ""}${medecin.prenom} ${medecin.nom}</p>` : ""}
      ${medecin?.specialite ? `<p style="font-size:10px;color:#666;">${medecin.specialite}</p>` : ""}
      ${medecin?.numero_ordre ? `<p style="font-size:10px;color:#666;">N° Ordre : ${medecin.numero_ordre}</p>` : ""}
      <div class="sig-line"></div>
      <p style="font-size:10px;color:#666;">Signature et cachet</p>
    </div>
    <div class="sig-block">
      <p style="font-size:11px;font-weight:600;">Chef de service</p>
      <div class="sig-line"></div>
      <p style="font-size:10px;color:#666;">Signature et cachet</p>
    </div>
  </div>

  <div class="legal">
    Document généré par MediLink — NPI : ${patient.npi} — ${new Date().toLocaleString("fr-FR")}.
    Ce document est confidentiel et réservé aux professionnels de santé et au patient concerné.
    Toute reproduction ou divulgation non autorisée est interdite.
  </div>
</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
