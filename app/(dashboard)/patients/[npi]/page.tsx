"use client";
import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Patient, Allergie, Antecedent, AntecedentFamilial, HabitudesVie, Consultation, Prescription } from "@/types";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import {
  ChevronLeft, LayoutDashboard, Stethoscope, Pill, FlaskConical,
  Syringe, Building2, CalendarDays, FolderOpen, ShieldCheck, ShieldAlert, Loader2,
} from "lucide-react";
import { PatientHeader } from "@/components/patient/patient-header";
import { AIAlertsBanner } from "@/components/patient/ai-alerts-banner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// ─── Tab count badge ──────────────────────────────────────────────────────────
function TabCount({ value, active }: { value: number | undefined; active?: boolean }) {
  if (!value) return null;
  return (
    <span className={`ml-0.5 rounded px-1 text-[10px] font-medium tabular-nums ${
      active
        ? "bg-medical-green/15 text-medical-green"
        : "bg-muted-foreground/20 text-muted-foreground"
    }`}>
      {value > 99 ? "99+" : value}
    </span>
  );
}

// ─── Active tab trigger class helper ─────────────────────────────────────────
const TRIGGER_CLS = [
  "gap-1.5 text-xs shrink-0 relative transition-colors",
  "data-[state=active]:text-medical-green",
  "data-[state=active]:bg-medical-green/8",
  "data-[state=active]:shadow-none",
  "data-[state=active]:ring-1 data-[state=active]:ring-medical-green/25",
].join(" ");

// ─── Inner page (needs useSearchParams, wrapped in Suspense below) ────────────
function PatientPageInner() {
  const { npi } = useParams<{ npi: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const activeTab = searchParams.get("tab") || "overview";

  const [patient, setPatient]                 = useState<Patient | null>(null);
  const [btgOpen, setBtgOpen]                 = useState(false);
  const [btgReason, setBtgReason]             = useState("");
  const [btgLoading, setBtgLoading]           = useState(false);
  const [allergies, setAllergies]             = useState<Allergie[]>([]);
  const [antecedents, setAntecedents]         = useState<Antecedent[]>([]);
  const [antecedentsFamiliaux, setAntecedentsFamiliaux] = useState<AntecedentFamilial[]>([]);
  const [habitudes, setHabitudes]             = useState<HabitudesVie | null>(null);
  const [consultations, setConsultations]     = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions]     = useState<Prescription[]>([]);
  const [tabCounts, setTabCounts]             = useState<Record<string, number>>({});
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    if (!npi) return;
    loadPatient(decodeURIComponent(npi));
  }, [npi]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Tab navigation (updates URL without full reload) ──────────────────────
  function handleTabChange(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/patients/${npi}?${params.toString()}`, { scroll: false });
  }

  // ─── Data loading ──────────────────────────────────────────────────────────
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
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      await supabase.from("audit_logs").insert({
        user_id: authUser.id,
        patient_id: patientData.id,
        action: "view_patient",
        timestamp: new Date().toISOString(),
      });
    }

    // Load data needed for OverviewTab + patient header upfront.
    // Other tabs (analyses, vaccinations…) fetch lazily when first opened.
    const [
      allergiesRes, antecedentsRes, familliauxRes, habitudesRes,
      consultationsRes, prescriptionsRes,
    ] = await Promise.all([
      supabase.from("allergies").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("antecedents").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_debut", { ascending: false }),
      supabase.from("antecedents_familiaux").select("*").eq("patient_id", patientData.id),
      supabase.from("habitudes_vie").select("*").eq("patient_id", patientData.id).single(),
      supabase.from("consultations").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_consultation", { ascending: false }),
      supabase.from("prescriptions").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_prescription", { ascending: false }),
    ]);

    setAllergies(allergiesRes.data || []);
    setAntecedents(antecedentsRes.data || []);
    setAntecedentsFamiliaux(familliauxRes.data || []);
    setHabitudes(habitudesRes.data || null);
    setConsultations(consultationsRes.data || []);
    setPrescriptions(prescriptionsRes.data || []);
    setLoading(false);

    // Fetch tab counts in background (non-blocking)
    Promise.all([
      supabase.from("analyses_prescrites").select("id", { count: "exact", head: true }).eq("patient_id", patientData.id),
      supabase.from("vaccinations").select("id", { count: "exact", head: true }).eq("patient_id", patientData.id),
      supabase.from("hospitalisations").select("id", { count: "exact", head: true }).eq("patient_id", patientData.id).is("deleted_at", null),
      supabase.from("rendez_vous").select("id", { count: "exact", head: true }).eq("patient_id", patientData.id),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("patient_id", patientData.id).is("deleted_at", null),
    ]).then(([ana, vac, hos, rdv, doc]) => {
      setTabCounts({
        analyses: ana.count || 0,
        vaccinations: vac.count || 0,
        hospitalisations: hos.count || 0,
        "rendez-vous": rdv.count || 0,
        documents: doc.count || 0,
      });
    });
  }

  // ─── Actions ───────────────────────────────────────────────────────────────
  function handleExportPDF()  { if (patient) window.open(`/api/export-pdf?patientId=${patient.id}`, "_blank"); }
  function handleShowQR()     { if (patient) window.open(`/api/qr?npi=${patient.npi}`, "_blank"); }
  function handleLettreRef()  { if (patient) window.open(`/api/lettre-reference?patientId=${patient.id}`, "_blank"); }

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
      toast({ title: "Accès d'urgence enregistré", description: "Cet accès a été loggé et sera notifié à l'administrateur." });
      setBtgOpen(false);
      setBtgReason("");
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer l'accès d'urgence." });
    } finally {
      setBtgLoading(false);
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-muted/20">
        <Header />
        <div className="px-6 py-2.5 border-b bg-card flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="bg-card border-b px-6 py-4 shadow-sm">
          <div className="flex gap-5 items-start">
            <Skeleton className="h-20 w-20 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-28 rounded-md shrink-0" />
              ))}
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!patient) return null;

  const isAdmin = user?.role === "super_admin" || user?.role === "admin_etablissement";

  return (
    <div className="flex flex-col min-h-full bg-muted/20">
      <Header />

      {/* Breadcrumb */}
      <nav className="px-6 py-2 text-sm text-muted-foreground flex items-center gap-1.5 border-b bg-card">
        <Link
          href="/patients"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Patients
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-foreground font-medium truncate">
          {patient.prenom} <span className="uppercase">{patient.nom}</span>
        </span>
        <span className="ml-1 text-xs text-muted-foreground/60 font-mono hidden sm:inline">
          {patient.npi}
        </span>
      </nav>

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

      {/* Break-the-glass */}
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
                Vous êtes sur le point d&apos;accéder à ce dossier en mode d&apos;urgence. Cet accès sera{" "}
                <strong>enregistré, horodaté</strong> et notifié à l&apos;administrateur de l&apos;établissement.
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
              <Button variant="destructive" onClick={handleBreakGlass} disabled={btgLoading || !btgReason.trim()}>
                {btgLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmer l&apos;accès d&apos;urgence
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 p-4 sm:p-6 pt-4 sm:pt-5">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Horizontally scrollable tab bar */}
          <div className="overflow-x-auto -mx-1 px-1 pb-0.5 mb-5">
            <TabsList className="bg-card border shadow-sm h-auto gap-0.5 p-1 flex-nowrap min-w-max w-full">
              <TabsTrigger value="overview" className={TRIGGER_CLS}>
                <LayoutDashboard className="h-3.5 w-3.5" />
                Vue d&apos;ensemble
              </TabsTrigger>

              <TabsTrigger value="consultations" className={TRIGGER_CLS}>
                <Stethoscope className="h-3.5 w-3.5" />
                Consultations
                <TabCount value={consultations.length} active={activeTab === "consultations"} />
              </TabsTrigger>

              <TabsTrigger value="prescriptions" className={TRIGGER_CLS}>
                <Pill className="h-3.5 w-3.5" />
                Prescriptions
                <TabCount value={prescriptions.length} active={activeTab === "prescriptions"} />
              </TabsTrigger>

              <TabsTrigger value="analyses" className={TRIGGER_CLS}>
                <FlaskConical className="h-3.5 w-3.5" />
                Analyses
                <TabCount value={tabCounts.analyses} active={activeTab === "analyses"} />
              </TabsTrigger>

              <TabsTrigger value="vaccinations" className={TRIGGER_CLS}>
                <Syringe className="h-3.5 w-3.5" />
                Vaccins
                <TabCount value={tabCounts.vaccinations} active={activeTab === "vaccinations"} />
              </TabsTrigger>

              <TabsTrigger value="hospitalisations" className={TRIGGER_CLS}>
                <Building2 className="h-3.5 w-3.5" />
                Hospitalisations
                <TabCount value={tabCounts.hospitalisations} active={activeTab === "hospitalisations"} />
              </TabsTrigger>

              <TabsTrigger value="rendez-vous" className={TRIGGER_CLS}>
                <CalendarDays className="h-3.5 w-3.5" />
                Rendez-vous
                <TabCount value={tabCounts["rendez-vous"]} active={activeTab === "rendez-vous"} />
              </TabsTrigger>

              <TabsTrigger value="documents" className={TRIGGER_CLS}>
                <FolderOpen className="h-3.5 w-3.5" />
                Documents
                <TabCount value={tabCounts.documents} active={activeTab === "documents"} />
              </TabsTrigger>

              {isAdmin && (
                <TabsTrigger value="audit" className={TRIGGER_CLS}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Audit
                </TabsTrigger>
              )}
            </TabsList>
          </div>

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
              navigateToTab={handleTabChange}
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
            <AnalysesTab patient={patient} onRefresh={() => loadPatient(patient.npi)} />
          </TabsContent>

          <TabsContent value="vaccinations">
            <VaccinationsTab patient={patient} onRefresh={() => loadPatient(patient.npi)} />
          </TabsContent>

          <TabsContent value="hospitalisations">
            <HospitalisationsTab patient={patient} onRefresh={() => loadPatient(patient.npi)} />
          </TabsContent>

          <TabsContent value="rendez-vous">
            <RendezVousTab patient={patient} onRefresh={() => loadPatient(patient.npi)} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsTab patient={patient} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="audit">
              <AuditTab patient={patient} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// ─── Export wrapped in Suspense (required for useSearchParams in Next.js 14+) ─
export default function PatientPage() {
  return (
    <Suspense fallback={null}>
      <PatientPageInner />
    </Suspense>
  );
}
