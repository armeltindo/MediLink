export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const DEMO_ACCOUNTS: Record<string, { role: string; name: string; prenom: string; nom: string; password: string }> = {
  "dr.agossou@medilink.bj": { role: "medecin",              name: "Dr. Agossou Romuald", prenom: "Romuald", nom: "Agossou",  password: "demo123"  },
  "admin@medilink.bj":      { role: "admin_etablissement",  name: "Admin MediLink",      prenom: "Clarisse", nom: "Dossou",   password: "demo123"  },
  "pharma@medilink.bj":     { role: "pharmacien",           name: "Garba Moussa",        prenom: "Moussa",   nom: "Garba",    password: "demo123"  },
  "armeltindo@gmail.com":   { role: "super_admin",          name: "Armeltindo",          prenom: "Armel",    nom: "Tindo",    password: "admin123" },
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
