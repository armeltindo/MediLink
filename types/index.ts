import { Database } from "./database";

// Convenience type aliases
export type Etablissement = Database["public"]["Tables"]["etablissements"]["Row"];
export type UserProfile = Database["public"]["Tables"]["users_profiles"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type Antecedent = Database["public"]["Tables"]["antecedents"]["Row"];
export type AntecedentFamilial = Database["public"]["Tables"]["antecedents_familiaux"]["Row"];
export type HabitudesVie = Database["public"]["Tables"]["habitudes_vie"]["Row"];
export type Allergie = Database["public"]["Tables"]["allergies"]["Row"];
export type Consultation = Database["public"]["Tables"]["consultations"]["Row"];
export type Constante = Database["public"]["Tables"]["constantes"]["Row"];
export type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];
export type AnalysePrescrite = Database["public"]["Tables"]["analyses_prescrites"]["Row"];
export type ResultatAnalyse = Database["public"]["Tables"]["resultats_analyse"]["Row"];
export type Vaccination = Database["public"]["Tables"]["vaccinations"]["Row"];
export type Hospitalisation = Database["public"]["Tables"]["hospitalisations"]["Row"];
export type SoinInfirmier = Database["public"]["Tables"]["soins_infirmiers"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Consentement = Database["public"]["Tables"]["consentements"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

// Extended types with joins
export type PatientComplet = Patient & {
  allergies?: Allergie[];
  antecedents?: Antecedent[];
};

export type ConsultationComplete = Consultation & {
  constantes?: Constante[];
  prescriptions?: Prescription[];
  analyses?: AnalysePrescrite[];
  medecin?: UserProfile;
  etablissement?: Etablissement;
};

export type PrescriptionComplete = Prescription & {
  medecin?: UserProfile;
};

export type Role =
  | "super_admin"
  | "admin_etablissement"
  | "medecin"
  | "infirmier"
  | "laborantin"
  | "pharmacien";

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  badge?: number;
}

export interface AlerteClinique {
  type: "danger" | "warning" | "info";
  titre: string;
  message: string;
  action?: string;
}
