import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const CLINICAL_SYSTEM_PROMPT = `Tu es un assistant médical clinique expert pour le système MediLink, un Dossier Médical Électronique (DME) utilisé en Afrique.
Tu analyses les données médicales des patients et fournis des résumés cliniques structurés et des alertes pertinentes.
Réponds TOUJOURS en français. Sois précis, clinique, et concis.
IMPORTANT : Tes réponses sont affichées comme aide à la décision médicale, pas comme diagnostic définitif.
Rappelle toujours que le médecin doit valider tes suggestions.`;

export function getGeminiModel(maxOutputTokens: number = 1024) {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: CLINICAL_SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens },
  });
}

export interface ClinicalSummaryRequest {
  patient: {
    nom: string;
    prenom: string;
    age: string;
    sexe: string;
    bloodGroup: string;
  };
  antecedents: Array<{ categorie: string; description: string; actif: boolean }>;
  allergies: Array<{ substance: string; severite: string; reaction: string }>;
  consultations: Array<{ date: string; motif: string; diagnostic: string }>;
  prescriptions: Array<{ medicament: string; posologie: string; statut: string }>;
  constantes: Array<{ date: string; ta_sys?: number; ta_dia?: number; fc?: number; poids?: number }>;
  vaccins: Array<{ vaccin: string; statut: string }>;
}

export interface AlertRequest {
  prescriptions: Array<{ medicament_dci: string; dosage: string }>;
  allergies: Array<{ substance: string; type: string }>;
  analyses: Array<{ parametre: string; valeur: number; valeur_min: number; valeur_max: number; date: string }>;
  constantes: Array<{ ta_sys?: number; ta_dia?: number; fc?: number; date: string }>;
  dernierHbA1c?: { date: string; valeur: number };
  vaccinsManquants: string[];
  patientAge: number;
}
