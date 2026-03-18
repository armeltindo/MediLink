export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const DEMO_ACCOUNTS: Record<string, { role: string; name: string; prenom: string; nom: string; password: string }> = {
  "dr.agossou@medilink.bj": { role: "medecin",              name: "Dr. Agossou Romuald", prenom: "Romuald", nom: "Agossou",  password: "demo123"  },
  "admin@medilink.bj":      { role: "admin_etablissement",  name: "Admin MediLink",      prenom: "Clarisse", nom: "Dossou",   password: "demo123"  },
  "pharma@medilink.bj":     { role: "pharmacien",           name: "Garba Moussa",        prenom: "Moussa",   nom: "Garba",    password: "demo123"  },
  "armeltindo@gmail.com":   { role: "super_admin",          name: "Armeltindo",          prenom: "Armel",    nom: "Tindo",    password: "admin123" },
};

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const account = DEMO_ACCOUNTS[email];
  if (!account || password !== account.password) {
    return NextResponse.json(
      { error: "Identifiants invalides." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    "demo_session",
    JSON.stringify({ email, ...account }),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 }
  );
  return response;
}
