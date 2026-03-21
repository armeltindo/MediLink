export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      etablissements: {
        Row: {
          id: string;
          nom: string;
          type: "CHU" | "CSP" | "clinique" | "hopital" | "cabinet";
          ville: string;
          region: string;
          pays: string;
          adresse: string | null;
          telephone: string | null;
          email: string | null;
          logo_url: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["etablissements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["etablissements"]["Insert"]>;
      };
      users_profiles: {
        Row: {
          id: string;
          role: "super_admin" | "admin_etablissement" | "medecin" | "infirmier" | "laborantin" | "pharmacien";
          nom: string;
          prenom: string;
          specialite: string | null;
          etablissement_id: string | null;
          telephone: string | null;
          signature_url: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["users_profiles"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["users_profiles"]["Insert"]>;
      };
      patients: {
        Row: {
          id: string;
          imu: string;
          nom: string;
          prenom: string;
          date_naissance: string;
          lieu_naissance: string | null;
          sexe: "M" | "F";
          situation_matrimoniale: string | null;
          nombre_enfants: number | null;
          groupe_sanguin: string | null;
          rhesus: "+" | "-" | null;
          nationalite: string | null;
          ethnie: string | null;
          photo_url: string | null;
          profession: string | null;
          niveau_etudes: string | null;
          langue_preferee: string | null;
          contact_urgence_nom: string | null;
          contact_urgence_lien: string | null;
          contact_urgence_tel: string | null;
          assurance_organisme: string | null;
          assurance_numero: string | null;
          assurance_taux: number | null;
          // Coordonnées
          telephone: string | null;
          email: string | null;
          adresse_quartier: string | null;
          adresse_commune: string | null;
          adresse_departement: string | null;
          // Anthropométrie
          taille: number | null;
          poids: number | null;
          // Informations médicales initiales
          medecin_traitant: string | null;
          note_medicale_initiale: string | null;
          // Tuteur légal (patients mineurs)
          tuteur_nom: string | null;
          tuteur_tel: string | null;
          tuteur_lien: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["patients"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["patients"]["Insert"]>;
      };
      antecedents: {
        Row: {
          id: string;
          patient_id: string;
          categorie: "medical" | "chirurgical" | "obstetrical" | "psychiatrique" | "traumatologique";
          description: string;
          date_debut: string | null;
          date_fin: string | null;
          actif: boolean;
          cim10_code: string | null;
          etablissement: string | null;
          medecin: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["antecedents"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["antecedents"]["Insert"]>;
      };
      antecedents_familiaux: {
        Row: {
          id: string;
          patient_id: string;
          parent: "pere" | "mere" | "frere" | "soeur" | "gp_paternel" | "gm_paternelle" | "gp_maternel" | "gm_maternelle";
          pathologie: string;
          statut_vital: "vivant" | "decede" | "inconnu";
          cause_deces: string | null;
          age_deces: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["antecedents_familiaux"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["antecedents_familiaux"]["Insert"]>;
      };
      habitudes_vie: {
        Row: {
          id: string;
          patient_id: string;
          tabac: "non_fumeur" | "fumeur" | "ex_fumeur" | null;
          tabac_quantite: string | null;
          tabac_duree: string | null;
          alcool: "non" | "occasionnel" | "regulier" | "excessif" | null;
          alcool_unites_semaine: number | null;
          drogues: string | null;
          activite_physique: "sedentaire" | "moderee" | "intense" | null;
          alimentation: string | null;
          eau_potable: boolean | null;
          electricite: boolean | null;
          assainissement: boolean | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["habitudes_vie"]["Row"], "id" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["habitudes_vie"]["Insert"]>;
      };
      allergies: {
        Row: {
          id: string;
          patient_id: string;
          substance: string;
          type: "medicamenteuse" | "alimentaire" | "environnementale";
          severite: "legere" | "moderee" | "anaphylactique";
          reaction: string;
          date_decouverte: string | null;
          actif: boolean;
          created_by: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["allergies"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["allergies"]["Insert"]>;
      };
      consultations: {
        Row: {
          id: string;
          patient_id: string;
          medecin_id: string;
          etablissement_id: string;
          date_consultation: string;
          motif: string;
          anamnese: string | null;
          diagnostic_principal: string | null;
          diagnostic_cim10: string | null;
          diagnostics_differentiels: Json | null;
          plan_prise_en_charge: string | null;
          notes_confidentielles: string | null;
          type_consultation: "externe" | "urgence" | "hospitalisation" | "teleconsultation";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["consultations"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["consultations"]["Insert"]>;
      };
      constantes: {
        Row: {
          id: string;
          consultation_id: string;
          patient_id: string;
          ta_sys: number | null;
          ta_dia: number | null;
          fc: number | null;
          fr: number | null;
          temperature: number | null;
          spo2: number | null;
          poids: number | null;
          taille: number | null;
          imc: number | null;
          glycemie: number | null;
          date_mesure: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["constantes"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["constantes"]["Insert"]>;
      };
      prescriptions: {
        Row: {
          id: string;
          consultation_id: string;
          patient_id: string;
          medecin_id: string;
          medicament_dci: string;
          medicament_commercial: string | null;
          dosage: string;
          forme: string | null;
          posologie: string;
          duree: string;
          instructions: string | null;
          statut: "prescrit" | "dispense" | "en_cours" | "termine" | "annule";
          dispense_par: string | null;
          date_dispensation: string | null;
          substitution_generique: string | null;
          date_prescription: string;
          date_expiration: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["prescriptions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["prescriptions"]["Insert"]>;
      };
      analyses_prescrites: {
        Row: {
          id: string;
          consultation_id: string;
          patient_id: string;
          medecin_id: string;
          type_analyse: string;
          urgence: boolean;
          statut: "prescrit" | "en_attente" | "en_cours" | "rendu" | "annule";
          instructions: string | null;
          date_prescription: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["analyses_prescrites"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["analyses_prescrites"]["Insert"]>;
      };
      resultats_analyse: {
        Row: {
          id: string;
          analyse_id: string;
          patient_id: string;
          laborantin_id: string;
          parametre: string;
          valeur: number | null;
          valeur_texte: string | null;
          unite: string | null;
          valeur_min: number | null;
          valeur_max: number | null;
          interpretation: string | null;
          date_resultat: string;
          pdf_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["resultats_analyse"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["resultats_analyse"]["Insert"]>;
      };
      vaccinations: {
        Row: {
          id: string;
          patient_id: string;
          vaccin: string;
          dose: string | null;
          lot: string | null;
          voie: string | null;
          operateur_id: string;
          etablissement_id: string;
          date_vaccination: string;
          prochain_rappel: string | null;
          statut: "a_jour" | "en_retard" | "contre_indique";
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vaccinations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vaccinations"]["Insert"]>;
      };
      hospitalisations: {
        Row: {
          id: string;
          patient_id: string;
          etablissement_id: string;
          medecin_referent_id: string | null;
          date_entree: string;
          date_sortie: string | null;
          service: string;
          motif: string;
          resume_sejour: string | null;
          mode_sortie: "domicile" | "transfert" | "deces" | "fugue" | null;
          cr_operatoire_url: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["hospitalisations"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["hospitalisations"]["Insert"]>;
      };
      soins_infirmiers: {
        Row: {
          id: string;
          hospitalisation_id: string;
          patient_id: string;
          infirmier_id: string;
          type_soin: string;
          description: string;
          medicament_administre: string | null;
          dose: string | null;
          heure_administration: string | null;
          constantes_json: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["soins_infirmiers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["soins_infirmiers"]["Insert"]>;
      };
      documents: {
        Row: {
          id: string;
          patient_id: string;
          nom: string;
          url: string;
          type: "imagerie" | "compte_rendu" | "ordonnance" | "certificat" | "autre";
          taille: number | null;
          uploaded_by: string;
          etablissement_id: string | null;
          description: string | null;
          uploaded_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["documents"]["Row"], "id" | "uploaded_at">;
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
      };
      consentements: {
        Row: {
          id: string;
          patient_id: string;
          type: string;
          date_consentement: string;
          fichier_url: string | null;
          operateur_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["consentements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["consentements"]["Insert"]>;
      };
      rendez_vous: {
        Row: {
          id: string;
          patient_id: string;
          medecin_id: string;
          etablissement_id: string | null;
          date_rdv: string;
          duree_minutes: number;
          type_rdv: "consultation" | "suivi" | "urgence" | "vaccination" | "analyse" | "chirurgie" | "autre";
          motif: string;
          statut: "planifie" | "confirme" | "annule" | "effectue" | "absent";
          notes: string | null;
          rappel_envoye: boolean;
          cree_par: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["rendez_vous"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["rendez_vous"]["Insert"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          patient_id: string | null;
          action: string;
          details: string | null;
          ip_address: string | null;
          etablissement_id: string | null;
          timestamp: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_logs"]["Row"], "id">;
        Update: never;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
