import { NextResponse } from "next/server";

const DEMO_ACCOUNTS: Record<string, { role: string; name: string; prenom: string; nom: string; password: string }> = {
  "dr.konan@medilink.ci":   { role: "medecin",              name: "Dr. Konan Kouassi",  prenom: "Kouassi",  nom: "Konan",      password: "demo123"  },
  "admin@medilink.ci":      { role: "admin_etablissement",  name: "Admin MediLink",     prenom: "Admin",    nom: "MediLink",   password: "demo123"  },
  "pharma@medilink.ci":     { role: "pharmacien",           name: "Diallo Mamadou",     prenom: "Mamadou",  nom: "Diallo",     password: "demo123"  },
  "armeltindo@gmail.com":   { role: "super_admin",          name: "Armeltindo",         prenom: "Armel",    nom: "Tindo",      password: "admin123" },
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
