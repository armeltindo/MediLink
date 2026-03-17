"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Patient, Allergie, Antecedent, AntecedentFamilial, HabitudesVie, Consultation, Prescription, AnalysePrescrite, Vaccination, Hospitalisation } from "@/types";
import { Header } from "@/components/layout/header";
import { PatientHeader } from "@/components/patient/patient-header";
import { AIAlertsBanner } from "@/components/patient/ai-alerts-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { OverviewTab } from "./tabs/overview";
import { ConsultationsTab } from "./tabs/consultations";
import { PrescriptionsTab } from "./tabs/prescriptions";
import { AnalysesTab } from "./tabs/analyses";
import { VaccinationsTab } from "./tabs/vaccinations";
import { HospitalisationsTab } from "./tabs/hospitalisations";
import { DocumentsTab } from "./tabs/documents";
import { AuditTab } from "./tabs/audit";

export default function PatientPage() {
  const { npi } = useParams<{ npi: string }>();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<Allergie[]>([]);
  const [antecedents, setAntecedents] = useState<Antecedent[]>([]);
  const [antecedentsFamiliaux, setAntecedentsFamiliaux] = useState<AntecedentFamilial[]>([]);
  const [habitudes, setHabitudes] = useState<HabitudesVie | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [analyses, setAnalyses] = useState<AnalysePrescrite[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [hospitalisations, setHospitalisations] = useState<Hospitalisation[]>([]);
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
      />

      {/* IA Alerts */}
      <AIAlertsBanner patientId={patient.id} />

      {/* Tabs */}
      <div className="flex-1 p-6 pt-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0 mb-4">
            {[
              { value: "overview", label: "Vue d'ensemble" },
              { value: "consultations", label: `Consultations (${consultations.length})` },
              { value: "prescriptions", label: `Prescriptions (${prescriptions.length})` },
              { value: "analyses", label: `Analyses (${analyses.length})` },
              { value: "vaccinations", label: `Vaccins (${vaccinations.length})` },
              { value: "hospitalisations", label: `Hospitalisations (${hospitalisations.length})` },
              { value: "documents", label: "Documents" },
              { value: "audit", label: "Audit" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  // handled by Tabs
                }}
                className="hidden"
              />
            ))}
          </TabsList>

          <Tabs defaultValue="overview">
            <TabsList className="bg-muted mb-4 h-auto flex-wrap">
              <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
              <TabsTrigger value="consultations">Consultations ({consultations.length})</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
              <TabsTrigger value="analyses">Analyses ({analyses.length})</TabsTrigger>
              <TabsTrigger value="vaccinations">Vaccins ({vaccinations.length})</TabsTrigger>
              <TabsTrigger value="hospitalisations">Hospitalisations ({hospitalisations.length})</TabsTrigger>
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
                prescriptions={prescriptions}
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

            <TabsContent value="documents">
              <DocumentsTab patient={patient} />
            </TabsContent>

            <TabsContent value="audit">
              <AuditTab patient={patient} />
            </TabsContent>
          </Tabs>
        </Tabs>
      </div>
    </div>
  );
}
