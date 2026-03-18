#!/usr/bin/env tsx
/**
 * seed-documents.ts
 *
 * Upload les 5 documents de démo dans Supabase Storage
 * puis upsert les enregistrements dans la table `documents`.
 *
 * Utilise curl (proxy-aware) pour les appels HTTP.
 *
 * Utilisation :
 *   npx tsx scripts/seed-documents.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
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

function curlJson(method: string, url: string, body?: object): { ok: boolean; status: number; data: unknown } {
  const bodyArg = body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : "";
  const cmd = `curl -s -w "\\n%{http_code}" -X ${method} "${url}" \\
    -H "apikey: ${SERVICE_KEY}" \\
    -H "Authorization: Bearer ${SERVICE_KEY}" \\
    -H "Content-Type: application/json" \\
    ${bodyArg}`;
  const raw = execSync(cmd, { encoding: "utf-8" });
  const lines = raw.trim().split("\n");
  const status = parseInt(lines.pop()!, 10);
  const body_text = lines.join("\n");
  let data: unknown = null;
  try { data = JSON.parse(body_text); } catch { data = body_text; }
  return { ok: status >= 200 && status < 300, status, data };
}

function curlUpload(url: string, filePath: string): { ok: boolean; status: number; data: unknown } {
  const cmd = `curl -s -w "\\n%{http_code}" -X POST "${url}" \\
    -H "apikey: ${SERVICE_KEY}" \\
    -H "Authorization: Bearer ${SERVICE_KEY}" \\
    -H "Content-Type: application/pdf" \\
    -H "x-upsert: true" \\
    --data-binary "@${filePath}"`;
  const raw = execSync(cmd, { encoding: "utf-8" });
  const lines = raw.trim().split("\n");
  const status = parseInt(lines.pop()!, 10);
  const body_text = lines.join("\n");
  let data: unknown = null;
  try { data = JSON.parse(body_text); } catch { data = body_text; }
  return { ok: status >= 200 && status < 300, status, data };
}

function dbUpsert(rows: object[]): { ok: boolean; status: number; data: unknown } {
  const bodyArg = JSON.stringify(rows).replace(/'/g, "'\\''");
  const cmd = `curl -s -w "\\n%{http_code}" -X POST "${SUPABASE_URL}/rest/v1/documents?on_conflict=id" \\
    -H "apikey: ${SERVICE_KEY}" \\
    -H "Authorization: Bearer ${SERVICE_KEY}" \\
    -H "Content-Type: application/json" \\
    -H "Prefer: resolution=merge-duplicates,return=minimal" \\
    -d '${bodyArg}'`;
  const raw = execSync(cmd, { encoding: "utf-8" });
  const lines = raw.trim().split("\n");
  const status = parseInt(lines.pop()!, 10);
  const body_text = lines.join("\n");
  let data: unknown = null;
  try { data = JSON.parse(body_text); } catch { data = body_text; }
  return { ok: status >= 200 && status < 300, status, data };
}

function getPublicUrl(storagePath: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/documents/${storagePath}`;
}

// ── Génération PDF minimal valide ──────────────────────────────────────────────

function makePdf(titre: string, contenu: string): Buffer {
  const esc = (s: string) => s.replace(/[()\\]/g, "\\$&");
  const body = `BT /F1 14 Tf 40 780 Td (${esc(titre)}) Tj 0 -30 Td /F1 11 Tf (${esc(contenu)}) Tj ET`;
  const resources = "<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>";
  const streamContent = `<</Length ${body.length}>>\nstream\n${body}\nendstream`;
  const objs = [
    `1 0 obj\n<</Type/Catalog/Pages 3 0 R>>\nendobj`,
    `2 0 obj\n<</Type/Page/Parent 3 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources ${resources}>>\nendobj`,
    `3 0 obj\n<</Type/Pages/Kids[2 0 R]/Count 1>>\nendobj`,
    `4 0 obj\n${streamContent}\nendobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj + "\n";
  }
  const xrefPos = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += String(off).padStart(10, "0") + " 00000 n \n";
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf-8");
}

// ── Documents de démo ──────────────────────────────────────────────────────────

const DOCUMENTS = [
  {
    id: "dc000000-0000-0000-0000-000000000001",
    patientId: "b1000000-0000-0000-0000-000000000001",
    nom: "Ordonnance_Kodjovi_15012026.pdf",
    storagePath: "b1000000-0000-0000-0000-000000000001/ordonnance_kodjovi_15012026.pdf",
    titre: "Ordonnance - ADANNOU Kodjovi",
    contenu: "Amlodipine 10mg 1cp/j  Metformine 1000mg 1cp matin et soir",
    type: "ordonnance",
    taille: 512,
    description: "Ordonnance HTA + Diabète — Janvier 2026",
    uploadedBy: "a1000000-0000-0000-0000-000000000003",
    etablissementId: "e1000000-0000-0000-0000-000000000001",
  },
  {
    id: "dc000000-0000-0000-0000-000000000002",
    patientId: "b1000000-0000-0000-0000-000000000001",
    nom: "ECG_Kodjovi_2025.pdf",
    storagePath: "b1000000-0000-0000-0000-000000000001/ecg_kodjovi_2025.pdf",
    titre: "ECG - ADANNOU Kodjovi - Octobre 2025",
    contenu: "Rythme sinusal regulier  FC 74 bpm  PR 160ms  QRS 88ms  Axe normal",
    type: "compte_rendu",
    taille: 512,
    description: "ECG octobre 2025 — rythme sinusal normal",
    uploadedBy: "a1000000-0000-0000-0000-000000000003",
    etablissementId: "e1000000-0000-0000-0000-000000000001",
  },
  {
    id: "dc000000-0000-0000-0000-000000000003",
    patientId: "b1000000-0000-0000-0000-000000000002",
    nom: "Echo_Morphologique_Akossiwa_20SA.pdf",
    storagePath: "b1000000-0000-0000-0000-000000000002/echo_morphologique_akossiwa_20sa.pdf",
    titre: "Echographie morphologique 20 SA - MENSAH Akossiwa",
    contenu: "Grossesse 20 SA  Morphologie foetale normale  Biometries concordantes  Placenta posterieur",
    type: "imagerie",
    taille: 1240000,
    description: "Échographie morphologique 20 SA — morphologie normale",
    uploadedBy: "a1000000-0000-0000-0000-000000000003",
    etablissementId: "e1000000-0000-0000-0000-000000000001",
  },
  {
    id: "dc000000-0000-0000-0000-000000000004",
    patientId: "b1000000-0000-0000-0000-000000000002",
    nom: "Certificat_grossesse_Akossiwa.pdf",
    storagePath: "b1000000-0000-0000-0000-000000000002/certificat_grossesse_akossiwa.pdf",
    titre: "Certificat de grossesse - MENSAH Akossiwa",
    contenu: "Je certifie que Mme MENSAH Akossiwa est enceinte de 20 semaines d amenorrhee.",
    type: "certificat",
    taille: 180000,
    description: "Certificat de grossesse pour employeur",
    uploadedBy: "a1000000-0000-0000-0000-000000000003",
    etablissementId: "e1000000-0000-0000-0000-000000000001",
  },
  {
    id: "dc000000-0000-0000-0000-000000000005",
    patientId: "b1000000-0000-0000-0000-000000000003",
    nom: "CR_Operatoire_Hounsou.pdf",
    storagePath: "b1000000-0000-0000-0000-000000000003/cr_operatoire_hounsou.pdf",
    titre: "Compte-rendu operatoire - HOUNSOU Medesset",
    contenu: "Appendicectomie par laparoscopie le 11/02/2026. Appendicite aigue non perforee. Suites simples.",
    type: "compte_rendu",
    taille: 380000,
    description: "Compte-rendu appendicectomie laparoscopique 11/02/2026",
    uploadedBy: "a1000000-0000-0000-0000-000000000003",
    etablissementId: "e1000000-0000-0000-0000-000000000001",
  },
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  console.log("🏥  MediLink — Seed documents de démo\n");

  // 1. Vérifier/créer le bucket
  const checkRes = curlJson("GET", `${SUPABASE_URL}/storage/v1/bucket/documents`);
  if (!checkRes.ok) {
    console.log("  ℹ️  Bucket 'documents' absent — création...");
    const createRes = curlJson("POST", `${SUPABASE_URL}/storage/v1/bucket`, {
      id: "documents",
      name: "documents",
      public: true,
      file_size_limit: 52428800,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    });
    if (!createRes.ok) {
      console.error("❌  Création bucket échouée:", JSON.stringify(createRes.data));
      process.exit(1);
    }
    console.log("  ✅  Bucket créé (public).\n");
  } else {
    const bkt = checkRes.data as { public?: boolean };
    if (!bkt?.public) {
      console.log("  ℹ️  Bucket existant mais privé — passage en public...");
      curlJson("PUT", `${SUPABASE_URL}/storage/v1/bucket/documents`, { public: true });
      console.log("  ✅  Bucket passé en public.\n");
    } else {
      console.log("  ✅  Bucket 'documents' OK (public).\n");
    }
  }

  const tmpDir = os.tmpdir();
  let success = 0;
  let errors = 0;

  for (const doc of DOCUMENTS) {
    process.stdout.write(`  📄 ${doc.nom} ... `);

    // Écrire le PDF dans un fichier temporaire
    const pdfBuffer = makePdf(doc.titre, doc.contenu);
    const tmpFile = path.join(tmpDir, `medilink_${doc.id}.pdf`);
    fs.writeFileSync(tmpFile, pdfBuffer);

    try {
      // Upload dans Supabase Storage
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/documents/${doc.storagePath}`;
      const uploadRes = curlUpload(uploadUrl, tmpFile);
      if (!uploadRes.ok) {
        console.log(`❌  Upload (${uploadRes.status}): ${JSON.stringify(uploadRes.data)}`);
        errors++;
        continue;
      }

      const publicUrl = getPublicUrl(doc.storagePath);

      // Upsert en base
      const dbRes = dbUpsert([{
        id: doc.id,
        patient_id: doc.patientId,
        nom: doc.nom,
        url: publicUrl,
        type: doc.type,
        taille: doc.taille,
        uploaded_by: doc.uploadedBy,
        etablissement_id: doc.etablissementId,
        description: doc.description,
      }]);

      if (!dbRes.ok) {
        console.log(`❌  DB (${dbRes.status}): ${JSON.stringify(dbRes.data)}`);
        errors++;
        continue;
      }

      console.log(`✅`);
      success++;
    } finally {
      fs.unlinkSync(tmpFile);
    }
  }

  console.log(`\n✨  Terminé — ${success} document(s) seedé(s), ${errors} erreur(s).`);
  if (success > 0) {
    console.log(`\n🔗  Exemple : ${getPublicUrl(DOCUMENTS[0].storagePath)}`);
  }
}

run().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
