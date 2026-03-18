#!/usr/bin/env tsx
/**
 * seed-documents.ts
 *
 * Upload les 5 documents de démo dans Supabase Storage
 * puis met à jour la table `documents` avec les vraies publicUrl.
 *
 * Pré-requis :
 *   - .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 008 appliquée (bucket documents public = TRUE)
 *
 * Utilisation :
 *   npx tsx scripts/seed-documents.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Charger .env.local manuellement (Next.js n'est pas disponible ici)
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌  Fichier .env.local introuvable — copiez .env.example vers .env.local et remplissez les valeurs.");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// PDF minimal valide (~500 octets) — contient du texte lisible dans tout viewer PDF
function makePdf(titre: string, contenu: string): Buffer {
  const body = `BT /F1 14 Tf 40 780 Td (${titre}) Tj 0 -30 Td /F1 11 Tf (${contenu}) Tj ET`;
  const resources = "<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>";
  const contents = `<</Length ${body.length}>>\nstream\n${body}\nendstream`;
  const page = `<</Type/Page/Parent 3 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources ${resources}>>`;
  const pages = `<</Type/Pages/Kids[2 0 R]/Count 1>>`;
  const catalog = `<</Type/Catalog/Pages 3 0 R>>`;

  const objs = [
    `1 0 obj\n${catalog}\nendobj`,
    `2 0 obj\n${page}\nendobj`,
    `3 0 obj\n${pages}\nendobj`,
    `4 0 obj\n${contents}\nendobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const obj of objs) {
    offsets.push(pdf.length);
    pdf += obj + "\n";
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += String(off).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf-8");
}

// Définition des 5 documents de démo
const DOCUMENTS: Array<{
  id: string;
  patientId: string;
  nom: string;
  storagePath: string;
  titre: string;
  contenu: string;
  type: string;
  taille: number;
  description: string;
  uploadedBy: string;
  etablissementId: string;
}> = [
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
    contenu: "Je soussigne certifie que Mme MENSAH Akossiwa est enceinte de 20 semaines d amenorrhee.",
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
    titre: "Compte-rendu opératoire - HOUNSOU Medesset",
    contenu: "Appendicectomie par laparoscopie le 11/02/2026  Indication: appendicite aigue non perforee  Suites simples.",
    type: "compte_rendu",
    taille: 380000,
    description: "Compte-rendu appendicectomie laparoscopique 11/02/2026",
    uploadedBy: "a1000000-0000-0000-0000-000000000003",
    etablissementId: "e1000000-0000-0000-0000-000000000001",
  },
];

async function run() {
  console.log("🏥  MediLink — Seed documents de démo\n");

  // Vérifier que le bucket existe et est public
  const { data: bucket, error: bucketErr } = await supabase.storage.getBucket("documents");
  if (bucketErr || !bucket) {
    console.error("❌  Bucket 'documents' introuvable:", bucketErr?.message);
    console.error("   → Assurez-vous d'avoir appliqué les migrations Supabase.");
    process.exit(1);
  }
  if (!bucket.public) {
    console.warn("⚠️   Bucket 'documents' est privé. Appliquez la migration 008 pour le rendre public.");
    console.warn("   → La seed continuera mais les URLs générées ne seront pas accessibles publiquement.\n");
  }

  let success = 0;
  let errors = 0;

  for (const doc of DOCUMENTS) {
    process.stdout.write(`  📄 ${doc.nom} ... `);

    // Générer le PDF minimal
    const pdfBuffer = makePdf(doc.titre, doc.contenu);

    // Upload dans Supabase Storage (upsert pour idempotence)
    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(doc.storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.log(`❌  Upload échoué: ${uploadErr.message}`);
      errors++;
      continue;
    }

    // Récupérer la publicUrl
    const { data: { publicUrl } } = supabase.storage
      .from("documents")
      .getPublicUrl(doc.storagePath);

    // Upsert dans la table documents
    const { error: dbErr } = await supabase.from("documents").upsert(
      {
        id: doc.id,
        patient_id: doc.patientId,
        nom: doc.nom,
        url: publicUrl,
        type: doc.type,
        taille: doc.taille,
        uploaded_by: doc.uploadedBy,
        etablissement_id: doc.etablissementId,
        description: doc.description,
      },
      { onConflict: "id" }
    );

    if (dbErr) {
      console.log(`❌  DB insert échoué: ${dbErr.message}`);
      errors++;
      continue;
    }

    console.log(`✅  ${publicUrl.slice(0, 80)}...`);
    success++;
  }

  console.log(`\n✨  Terminé — ${success} document(s) seedé(s), ${errors} erreur(s).`);

  if (errors > 0) {
    console.log("\n💡 En cas d'erreur d'UUID (uploaded_by / etablissement_id), vérifiez que");
    console.log("   les utilisateurs et établissements de démo sont bien insérés en base.");
  }
}

run().catch((err) => {
  console.error("Erreur fatale:", err);
  process.exit(1);
});
