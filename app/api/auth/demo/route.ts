export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const DEMO_ACCOUNTS: Record<string, { role: string; name: string; prenom: string; nom: string; password: string }> = {
  // ── Comptes legacy ────────────────────────────────────────────────────────
  "dr.agossou@medilink.bj": { role: "medecin",             name: "Dr. Agossou Romuald", prenom: "Romuald",    nom: "Agossou",     password: "demo123"  },
  "admin@medilink.bj":      { role: "admin_etablissement", name: "Admin MediLink",      prenom: "Clarisse",   nom: "Dossou",      password: "demo123"  },
  "pharma@medilink.bj":     { role: "pharmacien",          name: "Garba Moussa",        prenom: "Moussa",     nom: "Garba",       password: "demo123"  },
  "armeltindo@gmail.com":   { role: "super_admin",         name: "Armeltindo",          prenom: "Armel",      nom: "Tindo",       password: "admin123" },

  // ── Seed 9a — CNHU + établissements initiaux ──────────────────────────────
  "aristide.kpossou@medilink.bj":   { role: "medecin",             name: "Dr. Kpossou Aristide",    prenom: "Aristide",   nom: "Kpossou",     password: "admin123" },
  "clarisse.amoussou@medilink.bj":  { role: "medecin",             name: "Dr. Amoussou Clarisse",   prenom: "Clarisse",   nom: "Amoussou",    password: "admin123" },
  "gerard.dohou@medilink.bj":       { role: "super_admin",         name: "Dohou Gérard",            prenom: "Gérard",     nom: "Dohou",       password: "admin123" },
  "sophie.zannou@medilink.bj":      { role: "infirmier",           name: "Zannou Sophie",           prenom: "Sophie",     nom: "Zannou",      password: "admin123" },
  "maxime.hounkanrin@medilink.bj":  { role: "laborantin",          name: "Hounkanrin Maxime",       prenom: "Maxime",     nom: "Hounkanrin",  password: "admin123" },
  "nadege.adjovi@medilink.bj":      { role: "pharmacien",          name: "Adjovi Nadège",           prenom: "Nadège",     nom: "Adjovi",      password: "admin123" },
  "romuald.glele@medilink.bj":      { role: "admin_etablissement", name: "Glele Romuald",           prenom: "Romuald",    nom: "Glele",       password: "admin123" },

  // ── Seed 9b — Polycliniques / Cliniques / Hôpital ─────────────────────────
  // Polyclinique Atinkanmey
  "romaric.ahossou@medilink.bj":    { role: "admin_etablissement", name: "Ahossou Romaric",         prenom: "Romaric",    nom: "Ahossou",     password: "admin123" },
  "marguerite.keke@medilink.bj":    { role: "medecin",             name: "Mme Keke Marguerite",     prenom: "Marguerite", nom: "Keke",        password: "admin123" },
  "thierry.sossou@medilink.bj":     { role: "infirmier",           name: "Sossou Thierry",          prenom: "Thierry",    nom: "Sossou",      password: "admin123" },
  "aida.noukpo@medilink.bj":        { role: "pharmacien",          name: "Noukpo Aïda",             prenom: "Aïda",       nom: "Noukpo",      password: "admin123" },
  // Clinique Sevi
  "florian.dossa@medilink.bj":      { role: "admin_etablissement", name: "Dossa Florian",           prenom: "Florian",    nom: "Dossa",       password: "admin123" },
  "chantal.adjou@medilink.bj":      { role: "medecin",             name: "Dr. Adjou Chantal",       prenom: "Chantal",    nom: "Adjou",       password: "admin123" },
  "patrick.ahouandji@medilink.bj":  { role: "infirmier",           name: "Ahouandji Patrick",       prenom: "Patrick",    nom: "Ahouandji",   password: "admin123" },
  // Polyclinique Le Phœnix
  "rodrigue.comlan@medilink.bj":    { role: "admin_etablissement", name: "Comlan Rodrigue",         prenom: "Rodrigue",   nom: "Comlan",      password: "admin123" },
  "mounirou.tchamdja@medilink.bj":  { role: "medecin",             name: "Dr. Tchamdja Mounirou",   prenom: "Mounirou",   nom: "Tchamdja",    password: "admin123" },
  "ariane.houekpetchi@medilink.bj": { role: "infirmier",           name: "Houekpetchi Ariane",      prenom: "Ariane",     nom: "Houekpetchi", password: "admin123" },
  "sandra.biao@medilink.bj":        { role: "pharmacien",          name: "Biao Sandra",             prenom: "Sandra",     nom: "Biao",        password: "admin123" },
  // Clinique de l'Union
  "leontine.guezo@medilink.bj":     { role: "admin_etablissement", name: "Guezo Léontine",          prenom: "Léontine",   nom: "Guezo",       password: "admin123" },
  "sylvain.ogouma@medilink.bj":     { role: "medecin",             name: "Dr. Ogouma Sylvain",      prenom: "Sylvain",    nom: "Ogouma",      password: "admin123" },
  "regine.teka@medilink.bj":        { role: "infirmier",           name: "Teka Régine",             prenom: "Régine",     nom: "Teka",        password: "admin123" },
  // Clinique Pédiatrique Lumière d'Anges
  "rodrigue.alapini@medilink.bj":   { role: "admin_etablissement", name: "Alapini Rodrigue",        prenom: "Rodrigue",   nom: "Alapini",     password: "admin123" },
  "miriam.akogbeto@medilink.bj":    { role: "medecin",             name: "Dr. Akogbeto Miriam",     prenom: "Miriam",     nom: "Akogbeto",    password: "admin123" },
  "kokou.gbaguidi@medilink.bj":     { role: "medecin",             name: "Dr. Gbaguidi Kokou",      prenom: "Kokou",      nom: "Gbaguidi",    password: "admin123" },
  "annemarie.degla@medilink.bj":    { role: "infirmier",           name: "Degla Anne-Marie",        prenom: "Anne-Marie", nom: "Degla",       password: "admin123" },
  // Clinique Rapha
  "cyrille.oketcho@medilink.bj":    { role: "admin_etablissement", name: "Oketcho Cyrille",         prenom: "Cyrille",    nom: "Oketcho",     password: "admin123" },
  "jeanluc.padonou@medilink.bj":    { role: "medecin",             name: "Dr. Padonou Jean-Luc",    prenom: "Jean-Luc",   nom: "Padonou",     password: "admin123" },
  "honore.azondekon@medilink.bj":   { role: "medecin",             name: "Dr. Azondekon Honoré",    prenom: "Honoré",     nom: "Azondekon",   password: "admin123" },
  "esther.gninan@medilink.bj":      { role: "infirmier",           name: "Gninan Esther",           prenom: "Esther",     nom: "Gninan",      password: "admin123" },
  // Clinique de la Vue
  "brice.quenum@medilink.bj":       { role: "admin_etablissement", name: "Quenum Brice",            prenom: "Brice",      nom: "Quenum",      password: "admin123" },
  "dorcas.adjati@medilink.bj":      { role: "medecin",             name: "Dr. Adjati Dorcas",       prenom: "Dorcas",     nom: "Adjati",      password: "admin123" },
  "fabrice.lokossou@medilink.bj":   { role: "infirmier",           name: "Lokossou Fabrice",        prenom: "Fabrice",    nom: "Lokossou",    password: "admin123" },
  // CHIC
  "romaric.dansou@medilink.bj":     { role: "admin_etablissement", name: "Dansou Romaric",          prenom: "Romaric",    nom: "Dansou",      password: "admin123" },
  "arnaud.sogbossi@medilink.bj":    { role: "medecin",             name: "Dr. Sogbossi Arnaud",     prenom: "Arnaud",     nom: "Sogbossi",    password: "admin123" },
  "fabien.zinsou@medilink.bj":      { role: "medecin",             name: "Pr. Zinsou Fabien",       prenom: "Fabien",     nom: "Zinsou",      password: "admin123" },
  "estelle.tovedji@medilink.bj":    { role: "medecin",             name: "Dr. Tovedji Estelle",     prenom: "Estelle",    nom: "Tovedji",     password: "admin123" },
  "maurice.gansallo@medilink.bj":   { role: "infirmier",           name: "Gansallo Maurice",        prenom: "Maurice",    nom: "Gansallo",    password: "admin123" },
  "clarisse.hounsou@medilink.bj":   { role: "laborantin",          name: "Hounsou Clarisse",        prenom: "Clarisse",   nom: "Hounsou",     password: "admin123" },
  "theophile.medenou@medilink.bj":  { role: "pharmacien",          name: "Medenou Théophile",       prenom: "Théophile",  nom: "Medenou",     password: "admin123" },

  // ── Seed 9c — Pharmacies indépendantes ────────────────────────────────────
  // Pharmacie du Port
  "martial.azonnou@medilink.bj":    { role: "admin_etablissement", name: "Azonnou Martial",         prenom: "Martial",    nom: "Azonnou",     password: "admin123" },
  "yvette.gbenou@medilink.bj":      { role: "pharmacien",          name: "Gbenou Yvette",           prenom: "Yvette",     nom: "Gbenou",      password: "admin123" },
  "rodrigue.bossou@medilink.bj":    { role: "pharmacien",          name: "Bossou Rodrigue",         prenom: "Rodrigue",   nom: "Bossou",      password: "admin123" },
  // Pharmacie Placodji
  "fatimah.chabi@medilink.bj":      { role: "pharmacien",          name: "Chabi Fatimah",           prenom: "Fatimah",    nom: "Chabi",       password: "admin123" },
  // Pharmacie Fidjrossè
  "lionel.agbossou@medilink.bj":    { role: "pharmacien",          name: "Agbossou Lionel",         prenom: "Lionel",     nom: "Agbossou",    password: "admin123" },
  // Pharmacie Cadjehoun
  "prudence.degan@medilink.bj":     { role: "admin_etablissement", name: "Degan Prudence",          prenom: "Prudence",   nom: "Degan",       password: "admin123" },
  "irene.koutchade@medilink.bj":    { role: "pharmacien",          name: "Koutchade Irène",         prenom: "Irène",      nom: "Koutchade",   password: "admin123" },
  // Pharmacie Akpakpa Centre
  "marcel.houeto@medilink.bj":      { role: "pharmacien",          name: "Houeto Marcel",           prenom: "Marcel",     nom: "Houeto",      password: "admin123" },
  // Pharmacie de la Paix
  "berthe.azondekon@medilink.bj":   { role: "admin_etablissement", name: "Azondekon Berthe",        prenom: "Berthe",     nom: "Azondekon",   password: "admin123" },
  "franck.loko@medilink.bj":        { role: "pharmacien",          name: "Loko Franck",             prenom: "Franck",     nom: "Loko",        password: "admin123" },
  // Pharmacie Sainte-Rita
  "abimbola.saizonou@medilink.bj":  { role: "pharmacien",          name: "Saizonou Abimbola",       prenom: "Abimbola",   nom: "Saizonou",    password: "admin123" },
  // Pharmacie Dantokpa
  "romain.gnimassou@medilink.bj":   { role: "admin_etablissement", name: "Gnimassou Romain",        prenom: "Romain",     nom: "Gnimassou",   password: "admin123" },
  "christelle.aplogan@medilink.bj": { role: "pharmacien",          name: "Aplogan Christelle",      prenom: "Christelle", nom: "Aplogan",     password: "admin123" },
  "augustin.fandohan@medilink.bj":  { role: "pharmacien",          name: "Fandohan Augustin",       prenom: "Augustin",   nom: "Fandohan",    password: "admin123" },
  // Pharmacie Centrale Parakou
  "oumarou.guidi@medilink.bj":      { role: "admin_etablissement", name: "Guidi Oumarou",           prenom: "Oumarou",    nom: "Guidi",       password: "admin123" },
  "aissatou.mama@medilink.bj":      { role: "pharmacien",          name: "Mama Aïssatou",           prenom: "Aïssatou",   nom: "Mama",        password: "admin123" },
  // Pharmacie de l'Espoir
  "fidele.winsou@medilink.bj":      { role: "pharmacien",          name: "Winsou Fidèle",           prenom: "Fidèle",     nom: "Winsou",      password: "admin123" },
};

// Derive a signing secret from env — falls back to a build-time constant
const DEMO_SECRET = process.env.NEXTAUTH_SECRET ?? process.env.NEXT_PUBLIC_APP_URL ?? "medilink-demo-2026";

/** HMAC-SHA256 via WebCrypto (available in Node.js 18+ and Edge runtime) */
async function signPayload(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(DEMO_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const account = DEMO_ACCOUNTS[email];
  if (!account || password !== account.password) {
    return NextResponse.json(
      { error: "Identifiants invalides." },
      { status: 401 }
    );
  }

  const payload = JSON.stringify({ email, role: account.role, prenom: account.prenom, nom: account.nom });
  const sig = await signPayload(payload);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    "demo_session",
    JSON.stringify({ email, ...account, _sig: sig }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 }
  );
  return response;
}
