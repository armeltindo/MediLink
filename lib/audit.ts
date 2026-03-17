import { createServerSupabaseClient } from "./supabase";

export type AuditAction =
  | "view_patient"
  | "create_patient"
  | "update_patient"
  | "create_consultation"
  | "update_consultation"
  | "create_prescription"
  | "dispense_medication"
  | "view_prescription"
  | "create_analyse"
  | "submit_result"
  | "create_vaccination"
  | "create_hospitalisation"
  | "export_pdf"
  | "generate_qr"
  | "break_the_glass"
  | "login"
  | "logout";

export async function logAudit({
  userId,
  patientId,
  action,
  details,
  ipAddress,
  etablissementId,
}: {
  userId: string;
  patientId?: string;
  action: AuditAction;
  details?: Record<string, unknown>;
  ipAddress?: string;
  etablissementId?: string;
}) {
  try {
    const supabase = createServerSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("audit_logs") as any).insert({
      user_id: userId,
      patient_id: patientId,
      action,
      details: details ? JSON.stringify(details) : null,
      ip_address: ipAddress,
      etablissement_id: etablissementId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Audit logging failure should never crash the app
    console.error("Audit log failed:", error);
  }
}
