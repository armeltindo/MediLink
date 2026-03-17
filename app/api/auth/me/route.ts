export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const demoSession = cookieStore.get("demo_session");

  if (!demoSession) {
    return NextResponse.json(null, { status: 401 });
  }

  try {
    const session = JSON.parse(demoSession.value);
    return NextResponse.json({
      id: `demo-${session.email}`,
      email: session.email,
      prenom: session.prenom ?? session.name?.split(" ")[0] ?? "",
      nom: session.nom ?? session.name?.split(" ").slice(1).join(" ") ?? "",
      role: session.role,
      etablissement_id: null,
      actif: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(null, { status: 400 });
  }
}
