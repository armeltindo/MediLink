// Base CIM-10 locale — codes fréquents en contexte africain
// En production, cette liste serait chargée depuis Supabase ou une API
export interface CIM10Code {
  code: string;
  libelle: string;
  categorie: string;
}

export const CIM10_CODES: CIM10Code[] = [
  // Maladies infectieuses
  { code: "A00", libelle: "Choléra", categorie: "Maladies infectieuses" },
  { code: "A01", libelle: "Fièvres typhoïde et paratyphoïde", categorie: "Maladies infectieuses" },
  { code: "A06", libelle: "Amibiase", categorie: "Maladies infectieuses" },
  { code: "A09", libelle: "Diarrhée et gastro-entérite d'origine infectieuse présumée", categorie: "Maladies infectieuses" },
  { code: "A15", libelle: "Tuberculose respiratoire", categorie: "Maladies infectieuses" },
  { code: "A16", libelle: "Tuberculose respiratoire, sans confirmation bactériologique", categorie: "Maladies infectieuses" },
  { code: "A17", libelle: "Tuberculose du système nerveux", categorie: "Maladies infectieuses" },
  { code: "A20", libelle: "Peste", categorie: "Maladies infectieuses" },
  { code: "A33", libelle: "Tétanos néonatal", categorie: "Maladies infectieuses" },
  { code: "A34", libelle: "Tétanos obstétrical", categorie: "Maladies infectieuses" },
  { code: "A35", libelle: "Autres tétanos", categorie: "Maladies infectieuses" },
  { code: "A36", libelle: "Diphtérie", categorie: "Maladies infectieuses" },
  { code: "A37", libelle: "Coqueluche", categorie: "Maladies infectieuses" },
  { code: "A50", libelle: "Syphilis congénitale", categorie: "Maladies infectieuses" },
  { code: "A51", libelle: "Syphilis précoce", categorie: "Maladies infectieuses" },
  { code: "A63", libelle: "Autres maladies à transmission essentiellement sexuelle", categorie: "Maladies infectieuses" },
  { code: "A80", libelle: "Poliomyélite aiguë", categorie: "Maladies infectieuses" },
  { code: "A90", libelle: "Dengue", categorie: "Maladies infectieuses" },
  { code: "A91", libelle: "Fièvre hémorragique due au virus de la dengue", categorie: "Maladies infectieuses" },
  { code: "A95", libelle: "Fièvre jaune", categorie: "Maladies infectieuses" },
  { code: "A96", libelle: "Fièvre hémorragique à Arénavirus", categorie: "Maladies infectieuses" },

  // VIH
  { code: "B20", libelle: "Maladie due au VIH, se manifestant par des infections bactériennes", categorie: "VIH" },
  { code: "B21", libelle: "Maladie due au VIH, se manifestant par des tumeurs malignes", categorie: "VIH" },
  { code: "B24", libelle: "Maladie due au VIH, sans précision (SIDA)", categorie: "VIH" },
  { code: "Z21", libelle: "État infectieux asymptomatique par le VIH", categorie: "VIH" },

  // Paludisme
  { code: "B50", libelle: "Paludisme à Plasmodium falciparum", categorie: "Parasitoses" },
  { code: "B51", libelle: "Paludisme à Plasmodium vivax", categorie: "Parasitoses" },
  { code: "B54", libelle: "Paludisme, sans précision", categorie: "Parasitoses" },
  { code: "B55", libelle: "Leishmaniose", categorie: "Parasitoses" },
  { code: "B56", libelle: "Trypanosomiase africaine", categorie: "Parasitoses" },
  { code: "B65", libelle: "Schistosomiase (bilharziose)", categorie: "Parasitoses" },
  { code: "B76", libelle: "Ankylostomiase et nécatoriose", categorie: "Parasitoses" },

  // Maladies endocriniennes
  { code: "E10", libelle: "Diabète sucré de type 1", categorie: "Endocrinologie" },
  { code: "E11", libelle: "Diabète sucré de type 2", categorie: "Endocrinologie" },
  { code: "E14", libelle: "Diabète sucré, sans précision", categorie: "Endocrinologie" },
  { code: "E03", libelle: "Autres formes d'hypothyroïdie", categorie: "Endocrinologie" },
  { code: "E05", libelle: "Thyrotoxicose (hyperthyroïdie)", categorie: "Endocrinologie" },
  { code: "E40", libelle: "Kwashiorkor", categorie: "Endocrinologie" },
  { code: "E41", libelle: "Marasme nutritionnel", categorie: "Endocrinologie" },
  { code: "E46", libelle: "Malnutrition protéino-énergétique, sans précision", categorie: "Endocrinologie" },
  { code: "E50", libelle: "Carence en vitamine A", categorie: "Endocrinologie" },
  { code: "E55", libelle: "Carence en vitamine D (rachitisme)", categorie: "Endocrinologie" },

  // Maladies cardiovasculaires
  { code: "I10", libelle: "Hypertension artérielle essentielle (primitive)", categorie: "Cardiologie" },
  { code: "I11", libelle: "Cardiopathie hypertensive", categorie: "Cardiologie" },
  { code: "I20", libelle: "Angine de poitrine", categorie: "Cardiologie" },
  { code: "I21", libelle: "Infarctus aigu du myocarde", categorie: "Cardiologie" },
  { code: "I25", libelle: "Cardiopathie ischémique chronique", categorie: "Cardiologie" },
  { code: "I26", libelle: "Embolie pulmonaire", categorie: "Cardiologie" },
  { code: "I48", libelle: "Fibrillation et flutter auriculaires", categorie: "Cardiologie" },
  { code: "I50", libelle: "Insuffisance cardiaque", categorie: "Cardiologie" },
  { code: "I63", libelle: "Infarctus cérébral (AVC ischémique)", categorie: "Cardiologie" },
  { code: "I64", libelle: "Accident vasculaire cérébral, non précisé", categorie: "Cardiologie" },

  // Maladies respiratoires
  { code: "J00", libelle: "Rhinopharyngite aiguë (rhume)", categorie: "Pneumologie" },
  { code: "J02", libelle: "Pharyngite aiguë", categorie: "Pneumologie" },
  { code: "J03", libelle: "Amygdalite aiguë", categorie: "Pneumologie" },
  { code: "J06", libelle: "Infections aiguës des voies respiratoires supérieures", categorie: "Pneumologie" },
  { code: "J10", libelle: "Grippe due à un virus grippal identifié", categorie: "Pneumologie" },
  { code: "J11", libelle: "Grippe, virus non identifié", categorie: "Pneumologie" },
  { code: "J12", libelle: "Pneumonie virale, non classée ailleurs", categorie: "Pneumologie" },
  { code: "J13", libelle: "Pneumonie à Streptococcus pneumoniae", categorie: "Pneumologie" },
  { code: "J18", libelle: "Pneumonie, agent non précisé", categorie: "Pneumologie" },
  { code: "J45", libelle: "Asthme", categorie: "Pneumologie" },
  { code: "J47", libelle: "Bronchectasie", categorie: "Pneumologie" },

  // Maladies digestives
  { code: "K21", libelle: "Maladie de reflux gastro-œsophagien", categorie: "Gastroentérologie" },
  { code: "K25", libelle: "Ulcère de l'estomac", categorie: "Gastroentérologie" },
  { code: "K26", libelle: "Ulcère du duodénum", categorie: "Gastroentérologie" },
  { code: "K35", libelle: "Appendicite aiguë", categorie: "Gastroentérologie" },
  { code: "K70", libelle: "Maladie alcoolique du foie", categorie: "Gastroentérologie" },
  { code: "K72", libelle: "Insuffisance hépatique", categorie: "Gastroentérologie" },
  { code: "K74", libelle: "Fibrose et cirrhose du foie", categorie: "Gastroentérologie" },
  { code: "K80", libelle: "Lithiase biliaire", categorie: "Gastroentérologie" },
  { code: "K85", libelle: "Pancréatite aiguë", categorie: "Gastroentérologie" },

  // Maladies rénales
  { code: "N00", libelle: "Syndrome néphritique aigu", categorie: "Néphrologie" },
  { code: "N18", libelle: "Maladie rénale chronique", categorie: "Néphrologie" },
  { code: "N30", libelle: "Cystite", categorie: "Néphrologie" },
  { code: "N39", libelle: "Autres affections de l'appareil urinaire", categorie: "Néphrologie" },

  // Drépanocytose et hématologie
  { code: "D57", libelle: "Drépanocytose", categorie: "Hématologie" },
  { code: "D50", libelle: "Anémie par carence en fer", categorie: "Hématologie" },
  { code: "D51", libelle: "Anémie par carence en vitamine B12", categorie: "Hématologie" },
  { code: "D55", libelle: "Anémie due à des enzymopathies", categorie: "Hématologie" },
  { code: "D56", libelle: "Thalassémie", categorie: "Hématologie" },
  { code: "C91", libelle: "Leucémie lymphoïde", categorie: "Hématologie" },

  // Grossesse / obstétrique
  { code: "O10", libelle: "Hypertension préexistante compliquant la grossesse", categorie: "Obstétrique" },
  { code: "O14", libelle: "Hypertension gestationnelle avec protéinurie significative", categorie: "Obstétrique" },
  { code: "O24", libelle: "Diabète sucré survenant pendant la grossesse", categorie: "Obstétrique" },
  { code: "O30", libelle: "Grossesse multiple", categorie: "Obstétrique" },
  { code: "O60", libelle: "Travail prématuré", categorie: "Obstétrique" },
  { code: "O80", libelle: "Accouchement normal", categorie: "Obstétrique" },
  { code: "O82", libelle: "Accouchement par césarienne", categorie: "Obstétrique" },

  // Pédiatrie
  { code: "P00", libelle: "Fœtus et nouveau-né, affectés par des affections maternelles", categorie: "Pédiatrie" },
  { code: "P07", libelle: "Affections liées à la courte durée de gestation", categorie: "Pédiatrie" },
  { code: "P22", libelle: "Détresse respiratoire du nouveau-né", categorie: "Pédiatrie" },
  { code: "P36", libelle: "Septicémie bactérienne du nouveau-né", categorie: "Pédiatrie" },

  // Troubles mentaux
  { code: "F10", libelle: "Troubles mentaux et du comportement liés à l'utilisation d'alcool", categorie: "Psychiatrie" },
  { code: "F20", libelle: "Schizophrénie", categorie: "Psychiatrie" },
  { code: "F31", libelle: "Trouble affectif bipolaire", categorie: "Psychiatrie" },
  { code: "F32", libelle: "Épisode dépressif", categorie: "Psychiatrie" },
  { code: "F40", libelle: "Troubles anxieux phobiques", categorie: "Psychiatrie" },
  { code: "F41", libelle: "Autres troubles anxieux", categorie: "Psychiatrie" },
  { code: "F70", libelle: "Retard mental léger", categorie: "Psychiatrie" },

  // Traumatologie
  { code: "S00", libelle: "Traumatismes superficiels de la tête", categorie: "Traumatologie" },
  { code: "S06", libelle: "Traumatismes intracrâniens", categorie: "Traumatologie" },
  { code: "S42", libelle: "Fracture de l'épaule et du bras", categorie: "Traumatologie" },
  { code: "S52", libelle: "Fracture de l'avant-bras", categorie: "Traumatologie" },
  { code: "S72", libelle: "Fracture du fémur", categorie: "Traumatologie" },
  { code: "S82", libelle: "Fracture de la jambe", categorie: "Traumatologie" },

  // Cancers
  { code: "C00", libelle: "Tumeur maligne de la lèvre", categorie: "Oncologie" },
  { code: "C15", libelle: "Tumeur maligne de l'œsophage", categorie: "Oncologie" },
  { code: "C16", libelle: "Tumeur maligne de l'estomac", categorie: "Oncologie" },
  { code: "C18", libelle: "Tumeur maligne du côlon", categorie: "Oncologie" },
  { code: "C22", libelle: "Tumeur maligne du foie (hépatocarcinome)", categorie: "Oncologie" },
  { code: "C34", libelle: "Tumeur maligne des bronches et du poumon", categorie: "Oncologie" },
  { code: "C50", libelle: "Tumeur maligne du sein", categorie: "Oncologie" },
  { code: "C53", libelle: "Tumeur maligne du col de l'utérus", categorie: "Oncologie" },
  { code: "C61", libelle: "Tumeur maligne de la prostate", categorie: "Oncologie" },

  // Maladies ophtalmologiques
  { code: "H40", libelle: "Glaucome", categorie: "Ophtalmologie" },
  { code: "H26", libelle: "Autres cataractes", categorie: "Ophtalmologie" },
  { code: "H35", libelle: "Autres affections de la rétine", categorie: "Ophtalmologie" },

  // Autres
  { code: "R00", libelle: "Anomalies du rythme cardiaque", categorie: "Symptômes" },
  { code: "R05", libelle: "Toux", categorie: "Symptômes" },
  { code: "R06", libelle: "Anomalies de la respiration", categorie: "Symptômes" },
  { code: "R07", libelle: "Douleur thoracique", categorie: "Symptômes" },
  { code: "R10", libelle: "Douleurs abdominales et pelviennes", categorie: "Symptômes" },
  { code: "R50", libelle: "Fièvre d'origine inconnue", categorie: "Symptômes" },
  { code: "R51", libelle: "Céphalée", categorie: "Symptômes" },
  { code: "R55", libelle: "Syncope et collapsus", categorie: "Symptômes" },
  { code: "Z00", libelle: "Examen médical général", categorie: "Contact avec services de santé" },
  { code: "Z30", libelle: "Surveillance de la contraception", categorie: "Contact avec services de santé" },
  { code: "Z34", libelle: "Surveillance de grossesse normale", categorie: "Contact avec services de santé" },
];

export function searchCIM10(query: string, limit = 10): CIM10Code[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return CIM10_CODES.filter(
    (c) =>
      c.code.toLowerCase().includes(q) ||
      c.libelle.toLowerCase().includes(q) ||
      c.categorie.toLowerCase().includes(q)
  ).slice(0, limit);
}

export function getCIM10ByCode(code: string): CIM10Code | undefined {
  return CIM10_CODES.find((c) => c.code === code);
}
