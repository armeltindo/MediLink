export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatDate, formatAge } from "@/lib/utils";

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

    const patientId = request.nextUrl.searchParams.get("patientId");
    if (!patientId) return NextResponse.json({ error: "patientId requis" }, { status: 400 });

    const [patientRes, profileRes, allergiesRes, antecedentsRes, prescriptionsRes, consultationsRes] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).single(),
      supabase.from("users_profiles").select("*, etablissements(nom, adresse, ville, telephone)").eq("id", user.id).single(),
      supabase.from("allergies").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("antecedents").select("*").eq("patient_id", patientId).eq("actif", true).is("deleted_at", null),
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).in("statut", ["prescrit", "en_cours", "dispense"]).is("deleted_at", null),
      supabase.from("consultations").select("*").eq("patient_id", patientId).is("deleted_at", null).order("date_consultation", { ascending: false }).limit(1),
    ]);

    const patient = patientRes.data;
    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const medecin       = profileRes.data;
    const allergies     = allergiesRes.data || [];
    const antecedents   = antecedentsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const lastConsult   = consultationsRes.data?.[0] || null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const etablissement = (medecin as any)?.etablissements;

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patientId,
      action: "export_pdf",
      details: JSON.stringify({ type: "lettre_reference" }),
      timestamp: new Date().toISOString(),
    });

    const medecinNom   = medecin ? `${medecin.titre ? medecin.titre + " " : "Dr. "}${medecin.prenom} ${medecin.nom}` : "________________";
    const medecinSpec  = medecin?.specialite || "";
    const medecinOrdre = medecin?.numero_ordre || "";
    const dateAujourd  = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
    const civPatient   = patient.sexe === "M" ? "M." : "Mme";
    const refDoc       = patientId.slice(0, 8).toUpperCase();

    const severiteLabel: Record<string, string> = {
      legere: "Légère",
      moderee: "Modérée",
      anaphylactique: "ANAPHYLACTIQUE",
    };

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Lettre de Référence — ${patient.prenom} ${patient.nom}</title>
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

    /* ── EN-TÊTE BANDEAU ─────────────────────────────── */
    .header {
      background: linear-gradient(135deg, #1E3A5F 0%, #1a3550 60%, #0f2a1e 100%);
      border-radius: 10px;
      padding: 20px 24px 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-sender { color: white; }
    .header-sender h2 { font-size: 14pt; font-family: Georgia, serif; font-weight: 700; margin-bottom: 2px; }
    .header-sender p { font-size: 9pt; color: rgba(255,255,255,0.7); line-height: 1.45; }

    /* ── BADGE DOCUMENT ──────────────────────────────── */
    .doc-badge {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 2px solid #1E3A5F;
    }
    .doc-badge h1 { font-size: 13pt; font-weight: 700; color: #1E3A5F; text-transform: uppercase; letter-spacing: 2px; }
    .doc-badge sub { font-size: 9pt; color: #64748B; font-weight: 400; text-transform: none; letter-spacing: 0; }

    /* ── DATE + DESTINATAIRE ─────────────────────────── */
    .date-line { text-align: right; font-size: 10pt; color: #64748B; margin-bottom: 18px; }
    .destinataire { margin-bottom: 16px; }
    .destinataire p { font-size: 10.5pt; }
    .objet-line { background: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 0 6px 6px 0; padding: 10px 14px; margin-bottom: 20px; font-size: 10.5pt; }
    .objet-line strong { color: #1E3A5F; }
    .objet-npi { font-family: 'Courier New', monospace; font-size: 10pt; color: #3B82F6; font-weight: 700; }

    /* ── PATIENT ─────────────────────────────────────── */
    .patient-card {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-left: 4px solid #3B82F6;
      border-radius: 0 8px 8px 0;
      padding: 13px 16px;
      margin-bottom: 18px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px 16px;
    }
    .field-label { font-size: 8pt; color: #64748B; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 1px; }
    .field-value { font-size: 10pt; font-weight: 600; color: #1E293B; }

    /* ── CORPS LETTRE ────────────────────────────────── */
    .letter-body { font-size: 10.5pt; margin-bottom: 14px; text-align: justify; }

    /* ── SECTION ─────────────────────────────────────── */
    .section { margin: 14px 0; }
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      border-left: 4px solid #1E3A5F;
      padding-left: 10px;
      margin-bottom: 8px;
    }
    .section-header h3 { font-size: 10pt; font-weight: 700; color: #1E3A5F; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── ALLERGIES ───────────────────────────────────── */
    .allergy-banner {
      background: #FEF2F2;
      border: 1.5px solid #FCA5A5;
      border-left: 5px solid #DC2626;
      border-radius: 0 8px 8px 0;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .allergy-banner-title {
      background: #DC2626;
      color: white;
      font-size: 9.5pt;
      font-weight: 700;
      padding: 5px 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .allergy-item {
      padding: 6px 12px;
      border-bottom: 1px solid #FCA5A5;
      font-size: 10pt;
    }
    .allergy-item:last-child { border-bottom: none; }
    .allergy-anaphylactique { color: #991B1B; font-weight: 700; }

    /* ── LISTE ITEMS ─────────────────────────────────── */
    .item-list { list-style: none; }
    .item-list li {
      padding: 5px 0 5px 14px;
      border-bottom: 1px solid #F1F5F9;
      font-size: 10pt;
      position: relative;
    }
    .item-list li::before { content: "•"; position: absolute; left: 0; color: #1E3A5F; font-weight: 700; }
    .cim10 {
      font-family: 'Courier New', monospace;
      font-size: 8.5pt;
      background: #E2E8F0;
      color: #475569;
      padding: 1px 5px;
      border-radius: 3px;
      margin-left: 4px;
    }

    /* ── MOTIF ENCADRÉ ───────────────────────────────── */
    .motif-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #0D7A5F;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      font-size: 10.5pt;
      font-style: italic;
      color: #334155;
    }

    /* ── SIGNATURE ───────────────────────────────────── */
    .sig-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 32px;
    }
    .sig-block { text-align: center; }
    .sig-area {
      height: 70px;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      margin: 8px auto;
      width: 200px;
      background: repeating-linear-gradient(
        -45deg, transparent, transparent 8px,
        rgba(0,0,0,0.015) 8px, rgba(0,0,0,0.015) 9px
      );
    }
    .sig-label { font-size: 8.5pt; color: #94A3B8; }
    .stamp-area {
      height: 80px;
      width: 100px;
      border: 1.5px dashed #CBD5E1;
      border-radius: 50%;
      margin: 8px auto;
    }

    /* ── PIED PAGE ───────────────────────────────────── */
    .doc-footer {
      margin-top: 20px;
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
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .no-print { margin-bottom: 18px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>

  <!-- Barre impression -->
  <div class="no-print" style="display:flex;align-items:center;justify-content:space-between;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 16px;font-family:sans-serif;font-size:10pt;">
    <span style="color:#1E3A5F;font-weight:600;">Lettre de référence médicale</span>
    <button onclick="window.print()" style="background:#1E3A5F;color:white;border:none;padding:7px 18px;border-radius:6px;cursor:pointer;font-size:10pt;font-family:sans-serif;font-weight:600;">Imprimer / Enregistrer PDF</button>
  </div>

  <!-- En-tête -->
  <div class="header">
    <div class="header-sender">
      <h2>${medecinNom}</h2>
      ${medecinSpec ? `<p>${medecinSpec}</p>` : ""}
      ${etablissement?.nom ? `<p>${etablissement.nom}</p>` : ""}
      ${etablissement?.adresse ? `<p>${etablissement.adresse}${etablissement.ville ? ", " + etablissement.ville : ""}</p>` : ""}
      ${etablissement?.telephone ? `<p>Tél : ${etablissement.telephone}</p>` : ""}
    </div>
    <div>${LOGO_LIGHT}</div>
  </div>

  <!-- Titre document -->
  <div class="doc-badge">
    <h1>Lettre de Référence Médicale</h1>
    <sub>Document confidentiel — à remettre au médecin destinataire</sub>
  </div>

  <!-- Date -->
  <div class="date-line">${etablissement?.ville || "_________________"}, le ${dateAujourd}</div>

  <!-- Destinataire -->
  <div class="destinataire">
    <p><strong>À l'attention du Médecin traitant / Spécialiste</strong></p>
    <p style="color:#64748B;font-size:9.5pt;">Confrère(s) compétent(s)</p>
  </div>

  <!-- Objet -->
  <div class="objet-line">
    <strong>Objet :</strong> Référence de ${civPatient} <strong>${patient.prenom} ${patient.nom.toUpperCase()}</strong>
    &nbsp;&nbsp;|&nbsp;&nbsp; NPI : <span class="objet-npi">${patient.npi}</span>
  </div>

  <!-- Patient -->
  <div class="patient-card">
    <div>
      <div class="field-label">Nom complet</div>
      <div class="field-value">${patient.prenom} ${patient.nom.toUpperCase()}</div>
    </div>
    <div>
      <div class="field-label">Date de naissance</div>
      <div class="field-value">${formatDate(patient.date_naissance)} (${formatAge(patient.date_naissance)})</div>
    </div>
    <div>
      <div class="field-label">Sexe</div>
      <div class="field-value">${patient.sexe === "M" ? "Masculin" : "Féminin"}</div>
    </div>
    <div>
      <div class="field-label">Groupe sanguin</div>
      <div class="field-value">${patient.groupe_sanguin ? patient.groupe_sanguin + (patient.rhesus || "") : "Non renseigné"}</div>
    </div>
    <div>
      <div class="field-label">Nationalité</div>
      <div class="field-value">${patient.nationalite || "—"}</div>
    </div>
    <div>
      <div class="field-label">Assurance maladie</div>
      <div class="field-value">${patient.assurance_organisme || "Non assuré"}${patient.assurance_numero ? " – " + patient.assurance_numero : ""}</div>
    </div>
  </div>

  <!-- Corps -->
  <p class="letter-body">Cher confrère / chère consœur,</p>
  <p class="letter-body">
    Je me permets de vous adresser ${civPatient} <strong>${patient.prenom} ${patient.nom.toUpperCase()}</strong>,
    âgé(e) de ${formatAge(patient.date_naissance)}, que je suis en consultation,
    pour ${lastConsult ? `évaluation spécialisée suite à : <em>${lastConsult.motif}</em>` : "avis et prise en charge spécialisée"}.
  </p>

  <!-- Allergies -->
  ${allergies.length > 0 ? `
  <div class="allergy-banner">
    <div class="allergy-banner-title">Allergies connues — Signalement obligatoire avant tout acte</div>
    ${allergies.map(a => `
    <div class="allergy-item">
      <strong>${a.substance}</strong>
      — Type : ${a.type}
      — Sévérité : <span class="${a.severite === "anaphylactique" ? "allergy-anaphylactique" : ""}">${severiteLabel[a.severite] || a.severite}</span>
      — Réaction : ${a.reaction}
    </div>`).join("")}
  </div>` : ""}

  <!-- Antécédents -->
  ${antecedents.length > 0 ? `
  <div class="section">
    <div class="section-header"><h3>Antécédents médicaux significatifs</h3></div>
    <ul class="item-list">
      ${antecedents.map(a => `
      <li>${a.description}${a.cim10_code ? `<span class="cim10">${a.cim10_code}</span>` : ""}${a.date_debut ? ` <span style="color:#94A3B8;font-size:9pt;">(depuis ${formatDate(a.date_debut)})</span>` : ""}</li>`).join("")}
    </ul>
  </div>` : ""}

  <!-- Traitements -->
  ${prescriptions.length > 0 ? `
  <div class="section">
    <div class="section-header"><h3>Traitement en cours</h3></div>
    <ul class="item-list">
      ${prescriptions.map(p => `
      <li><strong>${p.medicament_dci} ${p.dosage}</strong> — ${p.posologie} — Durée : ${p.duree}</li>`).join("")}
    </ul>
  </div>` : ""}

  <!-- Motif référence -->
  ${lastConsult ? `
  <div class="section">
    <div class="section-header"><h3>Motif de la référence</h3></div>
    <div class="motif-box">
      ${lastConsult.diagnostic_principal || lastConsult.motif}
      ${lastConsult.plan_prise_en_charge ? `<br><br><span style="font-style:normal;"><strong>Plan initial :</strong> ${lastConsult.plan_prise_en_charge}</span>` : ""}
    </div>
  </div>` : ""}

  <!-- Clôture -->
  <p class="letter-body" style="margin-top:18px;">
    Je reste à votre disposition pour tout complément d'information clinique ou paraclinique.
    Dans l'attente de votre retour, veuillez agréer, cher confrère / chère consœur, l'expression de mes sentiments confraternels.
  </p>

  <!-- Signature -->
  <div class="sig-section">
    <div class="sig-block">
      <p style="font-size:10.5pt;font-weight:700;">${medecinNom}</p>
      ${medecinSpec ? `<p style="font-size:9.5pt;color:#64748B;">${medecinSpec}</p>` : ""}
      ${medecinOrdre ? `<p style="font-size:9pt;color:#94A3B8;font-family:'Courier New',monospace;">N° Ordre : ${medecinOrdre}</p>` : ""}
      <div class="sig-area"></div>
      <p class="sig-label">Signature et cachet du médecin</p>
    </div>
    <div class="sig-block">
      <p style="font-size:10pt;font-weight:600;color:#64748B;">Cachet de l'établissement</p>
      <div class="stamp-area"></div>
      <p class="sig-label">${etablissement?.nom || ""}</p>
    </div>
  </div>

  <!-- Pied de page -->
  <div class="doc-footer">
    <span>Généré par MediLink — NPI : ${patient.npi} — ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
    <span class="confidential-badge">Confidentiel — médecin destinataire</span>
    <span>Réf. ${refDoc}</span>
  </div>

</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="lettre-reference-${patient.npi}.html"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
