import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { anthropic, CLINICAL_SYSTEM_PROMPT } from "@/lib/anthropic";
import { formatAge, formatDate } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { patientId } = await request.json();
    if (!patientId) return NextResponse.json({ error: "patientId requis" }, { status: 400 });

    // Load all patient data
    const [
      patientRes, allergiesRes, antecedentsRes,
      consultationsRes, prescriptionsRes, constRes, vaccinsRes,
    ] = await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).single(),
      supabase.from("allergies").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("antecedents").select("*").eq("patient_id", patientId).eq("actif", true),
      supabase.from("consultations").select("*").eq("patient_id", patientId).order("date_consultation", { ascending: false }).limit(5),
      supabase.from("prescriptions").select("*").eq("patient_id", patientId).in("statut", ["prescrit", "en_cours", "dispense"]),
      supabase.from("constantes").select("*").eq("patient_id", patientId).order("date_mesure", { ascending: false }).limit(5),
      supabase.from("vaccinations").select("*").eq("patient_id", patientId).order("date_vaccination", { ascending: false }),
    ]);

    const patient = patientRes.data;
    if (!patient) return NextResponse.json({ error: "Patient non trouvé" }, { status: 404 });

    const allergies = allergiesRes.data || [];
    const antecedents = antecedentsRes.data || [];
    const consultations = consultationsRes.data || [];
    const prescriptions = prescriptionsRes.data || [];
    const constantes = constRes.data || [];
    const vaccins = vaccinsRes.data || [];

    const lastConstante = constantes[0];

    const prompt = `Génère un résumé clinique structuré pour ce patient :

**Patient :** ${patient.prenom} ${patient.nom}, ${formatAge(patient.date_naissance)}, ${patient.sexe === "M" ? "Homme" : "Femme"}
**Groupe sanguin :** ${patient.groupe_sanguin || "Non renseigné"}${patient.rhesus || ""}

**ALLERGIES ACTIVES (${allergies.length}) :**
${allergies.map((a) => `- ${a.substance} (${a.type}, ${a.severite}) : ${a.reaction}`).join("\n") || "Aucune allergie connue"}

**ANTÉCÉDENTS ACTIFS (${antecedents.length}) :**
${antecedents.map((a) => `- [${a.cim10_code || "?"}] ${a.description} (depuis ${formatDate(a.date_debut)})`).join("\n") || "Aucun antécédent actif"}

**TRAITEMENTS EN COURS (${prescriptions.length}) :**
${prescriptions.map((p) => `- ${p.medicament_dci} ${p.dosage} — ${p.posologie}`).join("\n") || "Aucun traitement actif"}

**DERNIÈRES CONSTANTES :**
${lastConstante ? `TA: ${lastConstante.ta_sys}/${lastConstante.ta_dia} mmHg, FC: ${lastConstante.fc} bpm, T°: ${lastConstante.temperature}°C, SpO2: ${lastConstante.spo2}%, Poids: ${lastConstante.poids} kg` : "Non disponibles"}

**DERNIÈRES CONSULTATIONS :**
${consultations.slice(0, 3).map((c) => `- ${formatDate(c.date_consultation)} : ${c.motif} ${c.diagnostic_cim10 ? `[${c.diagnostic_cim10}]` : ""}`).join("\n") || "Aucune consultation récente"}

**VACCINS :** ${vaccins.length} vaccination(s) enregistrée(s)

---
Génère un résumé clinique synthétique en français, structuré en sections :
1. **Profil clinique** (pathologies principales, risques)
2. **Traitements actifs** (liste concise + points d'attention)
3. **Points de vigilance** (interactions, suivis à prévoir, risques)
4. **Recommandations** (ce que le médecin devrait vérifier)

Sois concis, clinique, et utilise le vocabulaire médical approprié. Maximum 300 mots.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: CLINICAL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const summary = (message.content[0] as { type: string; text: string }).text;

    // Log audit
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      patient_id: patientId,
      action: "view_patient",
      details: "Génération résumé IA",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("AI Summary error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
