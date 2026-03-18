"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Patient, Allergie, Antecedent, AntecedentFamilial, HabitudesVie, Consultation, Prescription, AnalysePrescrite, Vaccination, Hospitalisation, RendezVous } from "@/types";
import { Header } from "@/components/layout/header";
import { PatientHeader } from "@/components/patient/patient-header";
import { AIAlertsBanner } from "@/components/patient/ai-alerts-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { OverviewTab } from "./tabs/overview";
import { ConsultationsTab } from "./tabs/consultations";
import { PrescriptionsTab } from "./tabs/prescriptions";
import { AnalysesTab } from "./tabs/analyses";
import { VaccinationsTab } from "./tabs/vaccinations";
import { HospitalisationsTab } from "./tabs/hospitalisations";
import { RendezVousTab } from "./tabs/rendez-vous";
import { DocumentsTab } from "./tabs/documents";
import { AuditTab } from "./tabs/audit";

export default function PatientPage() {
  const { npi } = useParams<{ npi: string }>();
  const router = useRouter();
  const { user } = useUser();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [btgOpen, setBtgOpen] = useState(false);
  const [btgReason, setBtgReason] = useState("");
  const [btgLoading, setBtgLoading] = useState(false);
  const [allergies, setAllergies] = useState<Allergie[]>([]);
  const [antecedents, setAntecedents] = useState<Antecedent[]>([]);
  const [antecedentsFamiliaux, setAntecedentsFamiliaux] = useState<AntecedentFamilial[]>([]);
  const [habitudes, setHabitudes] = useState<HabitudesVie | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [analyses, setAnalyses] = useState<AnalysePrescrite[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [hospitalisations, setHospitalisations] = useState<Hospitalisation[]>([]);
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!npi) return;
    loadPatient(decodeURIComponent(npi));
  }, [npi]);

  async function loadPatient(npiValue: string) {
    setLoading(true);

    const { data: patientData, error } = await supabase
      .from("patients")
      .select("*")
      .eq("npi", npiValue)
      .is("deleted_at", null)
      .single();

    if (error || !patientData) {
      router.push("/patients");
      return;
    }

    setPatient(patientData);

    // Log audit view
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        patient_id: patientData.id,
        action: "view_patient",
        timestamp: new Date().toISOString(),
      });
    }

    // Load all related data in parallel
    const [
      allergiesRes,
      antecedentsRes,
      familliauxRes,
      habitudesRes,
      consultationsRes,
      prescriptionsRes,
      analysesRes,
      vaccinationsRes,
      hospitalisationsRes,
      rendezVousRes,
    ] = await Promise.all([
      supabase.from("allergies").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("antecedents").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_debut", { ascending: false }),
      supabase.from("antecedents_familiaux").select("*").eq("patient_id", patientData.id),
      supabase.from("habitudes_vie").select("*").eq("patient_id", patientData.id).single(),
      supabase.from("consultations").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_consultation", { ascending: false }),
      supabase.from("prescriptions").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_prescription", { ascending: false }),
      supabase.from("analyses_prescrites").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_prescription", { ascending: false }),
      supabase.from("vaccinations").select("*").eq("patient_id", patientData.id).order("date_vaccination", { ascending: false }),
      supabase.from("hospitalisations").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_entree", { ascending: false }),
      supabase.from("rendez_vous").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_rdv", { ascending: false }),
    ]);

    setAllergies(allergiesRes.data || []);
    setAntecedents(antecedentsRes.data || []);
    setAntecedentsFamiliaux(familliauxRes.data || []);
    setHabitudes(habitudesRes.data || null);
    setConsultations(consultationsRes.data || []);
    setPrescriptions(prescriptionsRes.data || []);
    setAnalyses(analysesRes.data || []);
    setVaccinations(vaccinationsRes.data || []);
    setHospitalisations(hospitalisationsRes.data || []);
    setRendezVous(rendezVousRes.data || []);
    if (rendezVousRes.error) console.error("rendez_vous query error:", rendezVousRes.error);
    setLoading(false);
  }

  async function handleExportPDF() {
    if (!patient) return;
    const url = `/api/export-pdf?patientId=${patient.id}`;
    window.open(url, "_blank");
  }

  async function handleShowQR() {
    if (!patient) return;
    window.open(`/api/qr?npi=${patient.npi}`, "_blank");
  }

  async function handleLettreRef() {
    if (!patient) return;
    window.open(`/api/lettre-reference?patientId=${patient.id}`, "_blank");
  }

  async function handleBreakGlass() {
    if (!patient || !btgReason.trim() || !user) return;
    setBtgLoading(true);
    try {
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        patient_id: patient.id,
        action: "break_the_glass",
        details: JSON.stringify({ reason: btgReason, accessed_at: new Date().toISOString() }),
        timestamp: new Date().toISOString(),
      });
      toast({
        title: "Accès d'urgence enregistré",
        description: "Cet accès a été loggé et sera notifié à l'administrateur.",
        variant: "default",
      });
      setBtgOpen(false);
      setBtgReason("");
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer l'accès d'urgence." });
    } finally {
      setBtgLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-full">
        <Header />
        <div className="p-6 space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="flex flex-col min-h-full">
      <Header />
      <PatientHeader
        patient={patient}
        allergies={allergies}
        onExportPDF={handleExportPDF}
        onShowQR={handleShowQR}
        onLettreRef={handleLettreRef}
        onBreakGlass={() => setBtgOpen(true)}
        onPatientUpdate={(updated) => setPatient(updated)}
      />

      {/* IA Alerts */}
      <AIAlertsBanner patientId={patient.id} />

      {/* Break-the-glass — Emergency Access */}
      <Dialog open={btgOpen} onOpenChange={setBtgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Accès d&apos;urgence — Break the Glass
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                Vous êtes sur le point d&apos;accéder à ce dossier en mode d&apos;urgence. Cet accès sera <strong>enregistré, horodaté</strong> et notifié à l&apos;administrateur de l&apos;établissement.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Justification obligatoire *</Label>
              <Textarea
                value={btgReason}
                onChange={(e) => setBtgReason(e.target.value)}
                rows={3}
                placeholder="Expliquez la raison de cet accès d'urgence (patient critique, urgence vitale, etc.)..."
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBtgOpen(false)}>Annuler</Button>
              <Button
                variant="destructive"
                onClick={handleBreakGlass}
                disabled={btgLoading || !btgReason.trim()}
              >
                {btgLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer l&apos;accès d&apos;urgence
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="flex-1 p-6 pt-4">
        <Tabs defaultValue="overview">
          <TabsList className="bg-muted mb-4 h-auto flex-wrap">
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="consultations">Consultations ({consultations.length})</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
            <TabsTrigger value="analyses">Analyses ({analyses.length})</TabsTrigger>
            <TabsTrigger value="vaccinations">Vaccins ({vaccinations.length})</TabsTrigger>
            <TabsTrigger value="hospitalisations">Hospitalisations ({hospitalisations.length})</TabsTrigger>
            <TabsTrigger value="rendez-vous">Rendez-vous ({rendezVous.length})</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab
              patient={patient}
              allergies={allergies}
              antecedents={antecedents}
              antecedentsFamiliaux={antecedentsFamiliaux}
              habitudes={habitudes}
              consultations={consultations}
              prescriptions={prescriptions}
              onRefresh={() => loadPatient(patient.npi)}
            />
          </TabsContent>

          <TabsContent value="consultations">
            <ConsultationsTab
              patient={patient}
              consultations={consultations}
              onRefresh={() => loadPatient(patient.npi)}
            />
          </TabsContent>

          <TabsContent value="prescriptions">
            <PrescriptionsTab
              patient={patient}
              allergies={allergies}
              onRefresh={() => loadPatient(patient.npi)}
            />
          </TabsContent>

          <TabsContent value="analyses">
            <AnalysesTab
              patient={patient}
              analyses={analyses}
              onRefresh={() => loadPatient(patient.npi)}
            />
          </TabsContent>

          <TabsContent value="vaccinations">
            <VaccinationsTab
              patient={patient}
              vaccinations={vaccinations}
              onRefresh={() => loadPatient(patient.npi)}
            />
          </TabsContent>

          <TabsContent value="hospitalisations">
            <HospitalisationsTab
              patient={patient}
              hospitalisations={hospitalisations}
              onRefresh={() => loadPatient(patient.npi)}
            />
          </TabsContent>

          <TabsContent value="rendez-vous">
            <RendezVousTab
              patient={patient}
              onRefresh={() => loadPatient(patient.npi)}
            />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab patient={patient} />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTab patient={patient} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
