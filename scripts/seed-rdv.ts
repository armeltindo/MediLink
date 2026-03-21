#!/usr/bin/env tsx
/**
 * seed-rdv.ts
 *
 * Insère 6 rendez-vous de démo en utilisant les vrais UUIDs
 * présents dans la base (users_profiles, patients, etablissements).
 *
 * Utilise curl (proxy-aware) pour les appels HTTP.
 *
 * Utilisation :
 *   npx tsx scripts/seed-rdv.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ── Charger .env.local ─────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌  .env.local introuvable.");
    process.exit(1);
  }
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Helpers curl ───────────────────────────────────────────────────────────────

function curlGet(path: string): unknown[] {
  const cmd = `curl -s "${SUPABASE_URL}/rest/v1/${path}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Accept: application/json"`;
  const raw = execSync(cmd, { encoding: "utf-8" }).trim();
  try { return JSON.parse(raw); } catch { return []; }
}

function curlPost(endpoint: string, rows: object[]): { ok: boolean; status: number; body: string } {
  const bodyArg = JSON.stringify(rows).replace(/'/g, "'\\''");
  const cmd = `curl -s -w "\\n%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/${endpoint}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: resolution=merge-duplicates,return=minimal" \
    -d '${bodyArg}'`;
  const raw = execSync(cmd, { encoding: "utf-8" });
  const lines = raw.trim().split("\n");
  const status = parseInt(lines.pop()!, 10);
  return { ok: status >= 200 && status < 300, status, body: lines.join("\n") };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log("🏥  MediLink — Seed rendez-vous de démo\n");

  // 1. Récupérer un médecin réel
  const medecins = curlGet("users_profiles?role=eq.medecin&limit=1&select=id,nom,prenom") as Array<{ id: string; nom: string; prenom: string }>;
  if (!medecins.length) {
    console.error("❌  Aucun utilisateur avec role='medecin' dans users_profiles.");
    console.error("   → Créez d'abord un compte médecin dans l'application.");
    process.exit(1);
  }
  const medecin = medecins[0];
  console.log(`  👨‍⚕️  Médecin : ${medecin.prenom} ${medecin.nom} (${medecin.id})`);

  // 2. Récupérer les patients de démo
  const patients = curlGet("patients?limit=3&select=id,nom,prenom,nip&order=created_at.asc") as Array<{ id: string; nom: string; prenom: string; nip: string }>;
  if (patients.length < 1) {
    console.error("❌  Aucun patient trouvé dans la base.");
    console.error("   → Exécutez d'abord le seed SQL principal.");
    process.exit(1);
  }
  patients.forEach((p) => console.log(`  🧑  Patient : ${p.prenom} ${p.nom} (${p.nip})`));

  // 3. Récupérer l'établissement
  const etablissements = curlGet("etablissements?limit=1&select=id,nom") as Array<{ id: string; nom: string }>;
  if (!etablissements.length) {
    console.error("❌  Aucun établissement trouvé.");
    process.exit(1);
  }
  const etab = etablissements[0];
  console.log(`  🏥  Établissement : ${etab.nom} (${etab.id})\n`);

  // 4. Construire les 6 RDV de démo
  const now = new Date();
  const past = (daysAgo: number, hour: string) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const [h, m] = hour.split(":");
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d.toISOString();
  };
  const future = (daysAhead: number, hour: string) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    const [h, m] = hour.split(":");
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d.toISOString();
  };

  const p0 = patients[0]?.id;
  const p1 = patients[1]?.id;
  const p2 = patients[2]?.id;

  const rdvs = [
    // Patient 0 : passé (effectué) + futur (confirmé)
    p0 && {
      id: "da000000-0000-0000-0000-000000000001",
      patient_id: p0, medecin_id: medecin.id, etablissement_id: etab.id,
      date_rdv: past(62, "09:00"), duree_minutes: 30, type_rdv: "suivi",
      motif: "Suivi HTA et diabète de type 2", statut: "effectue",
      cree_par: medecin.id,
    },
    p0 && {
      id: "da000000-0000-0000-0000-000000000002",
      patient_id: p0, medecin_id: medecin.id, etablissement_id: etab.id,
      date_rdv: future(23, "09:00"), duree_minutes: 30, type_rdv: "suivi",
      motif: "Contrôle glycémie et TA — bilan trimestriel", statut: "confirme",
      cree_par: medecin.id,
    },
    // Patient 1 : passé (effectué) + futur (planifié)
    p1 && {
      id: "da000000-0000-0000-0000-000000000003",
      patient_id: p1, medecin_id: medecin.id, etablissement_id: etab.id,
      date_rdv: past(43, "10:30"), duree_minutes: 45, type_rdv: "consultation",
      motif: "Consultation prénatale 2e trimestre", statut: "effectue",
      cree_par: medecin.id,
    },
    p1 && {
      id: "da000000-0000-0000-0000-000000000004",
      patient_id: p1, medecin_id: medecin.id, etablissement_id: etab.id,
      date_rdv: future(28, "11:00"), duree_minutes: 45, type_rdv: "consultation",
      motif: "Consultation prénatale 3e trimestre", statut: "planifie",
      cree_par: medecin.id,
    },
    // Patient 2 : urgence passée (effectuée) + suivi post-op futur (planifié)
    p2 && {
      id: "da000000-0000-0000-0000-000000000005",
      patient_id: p2, medecin_id: medecin.id, etablissement_id: etab.id,
      date_rdv: past(36, "22:15"), duree_minutes: 60, type_rdv: "urgence",
      motif: "Douleurs abdominales aiguës FID", statut: "effectue",
      cree_par: medecin.id,
    },
    p2 && {
      id: "da000000-0000-0000-0000-000000000006",
      patient_id: p2, medecin_id: medecin.id, etablissement_id: etab.id,
      date_rdv: future(7, "08:30"), duree_minutes: 30, type_rdv: "suivi",
      motif: "Contrôle post-opératoire appendicectomie", statut: "planifie",
      cree_par: medecin.id,
    },
  ].filter(Boolean) as object[];

  // 5. Insérer (upsert)
  process.stdout.write(`  📅 Insertion de ${rdvs.length} rendez-vous ... `);
  const res = curlPost("rendez_vous?on_conflict=id", rdvs);
  if (!res.ok) {
    console.log(`❌  HTTP ${res.status}: ${res.body}`);
    process.exit(1);
  }
  console.log(`✅`);

  console.log(`\n✨  Terminé — ${rdvs.length} rendez-vous de démo insérés.`);
  console.log(`   Ouvrez la fiche d'un patient → onglet "Rendez-vous" pour vérifier.`);
}

run().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
