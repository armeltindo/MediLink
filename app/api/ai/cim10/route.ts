export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getGeminiModel } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { texte } = await request.json();
    if (!texte) return NextResponse.json({ suggestions: [] });

    const model = getGeminiModel(256);
    const result = await model.generateContent(
      `Pour le diagnostic clinique suivant : "${texte}"
Suggère les 3 codes CIM-10 les plus pertinents.
Réponds UNIQUEMENT en JSON : [{"code": "E11", "libelle": "Diabète sucré de type 2"}]`
    );
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*?\]/);
    const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ suggestions: [], error: message });
  }
}
