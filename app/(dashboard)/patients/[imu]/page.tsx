"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Patient, Allergie, Antecedent, AntecedentFamilial, HabitudesVie, Consultation, Prescription } from "@/types";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import {
  ChevronLeft, LayoutDashboard, Stethoscope, Pill, FlaskConical,
  Syringe, BedDouble, CalendarDays, FolderOpen, ShieldCheck, ShieldAlert, Loader2,
} from "lucide-react";
import { PatientHeader } from "@/components/patient/patient-header";
import { AIAlertsBanner } from "@/components/patient/ai-alerts-banner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { OverviewTab } from "./tabs/overview";
import { ConsultationsTab } from "./tabs/consultations";
import { PrescriptionsTab } from "./tabs/prescriptions";
import { AnalysesTab } from "./tabs/analyses";
import { VaccinationsTab } from "./tabs/vaccinations";
import { HospitalisationsTab } from "./tabs/hospitalisations";
import { RendezVousTab } from "./tabs/rendez-vous";
import { DocumentsTab } from "./tabs/documents";
import { AuditTab } from "./tabs/audit";

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TAB_DEFS = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    icon: LayoutDashboard,
    activeText: "text-slate-800",
    activeBorder: "border-slate-700",
    activeBadge: "bg-slate-800 text-white",
    activeIcon: "text-slate-700",
  },
  {
    id: "consultations",
    label: "Consultations",
    icon: Stethoscope,
    activeText: "text-blue-700",
    activeBorder: "border-blue-600",
    activeBadge: "bg-blue-600 text-white",
    activeIcon: "text-blue-600",
  },
  {
    id: "prescriptions",
    label: "Prescriptions",
    icon: Pill,
    activeText: "text-amber-700",
    activeBorder: "border-amber-500",
    activeBadge: "bg-amber-500 text-white",
    activeIcon: "text-amber-600",
  },
  {
    id: "analyses",
    label: "Analyses",
    icon: FlaskConical,
    activeText: "text-purple-700",
    activeBorder: "border-purple-600",
    activeBadge: "bg-purple-600 text-white",
    activeIcon: "text-purple-600",
  },
  {
    id: "vaccinations",
    label: "Vaccinations",
    icon: Syringe,
    activeText: "text-emerald-700",
    activeBorder: "border-emerald-600",
    activeBadge: "bg-emerald-600 text-white",
    activeIcon: "text-emerald-600",
  },
  {
    id: "hospitalisations",
    label: "Hospitalisations",
    icon: BedDouble,
    activeText: "text-violet-700",
    activeBorder: "border-violet-600",
    activeBadge: "bg-violet-600 text-white",
    activeIcon: "text-violet-600",
  },
  {
    id: "rendez-vous",
    label: "Rendez-vous",
    icon: CalendarDays,
    activeText: "text-teal-700",
    activeBorder: "border-teal-600",
    activeBadge: "bg-teal-600 text-white",
    activeIcon: "text-teal-600",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FolderOpen,
    activeText: "text-orange-700",
    activeBorder: "border-orange-500",
    activeBadge: "bg-orange-500 text-white",
    activeIcon: "text-orange-600",
  },
  {
    id: "audit",
    label: "Audit",
    icon: ShieldCheck,
    activeText: "text-red-700",
    activeBorder: "border-red-600",
    activeBadge: "bg-red-600 text-white",
    activeIcon: "text-red-600",
    adminOnly: true,
  },
] as const;

type TabId = typeof TAB_DEFS[number]["id"];
const VALID_TABS = TAB_DEFS.map((t) => t.id) as unknown as readonly string[];

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function PageSkeleton() {
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
      <div className="border-b bg-white">
        <div className="flex gap-0 px-4 overflow-x-auto">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-32 rounded-none shrink-0" />
          ))}
        </div>
      </div>
      <div className="p-6 space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ─── Inner page ───────────────────────────────────────────────────────────────
function PatientPageInner() {
  const { imu } = useParams<{ imu: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const rawTab = searchParams.get("tab") ?? "overview";
  const activeTab: TabId = (VALID_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as TabId)
    : "overview";

  const auditLoggedRef = useRef(false);

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
    if (!imu) return;
    loadPatient(decodeURIComponent(imu));
  }, [imu]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/patients/${imu}?${params.toString()}`, { scroll: false });
  }

  async function loadPatient(imuValue: string) {
    setLoading(true);

    const { data: patientData, error } = await supabase
      .from("patients")
      .select("*")
      .eq("imu", imuValue)
      .is("deleted_at", null)
      .single();

    if (error || !patientData) {
      router.push("/patients");
      return;
    }

    setPatient(patientData);

    if (!auditLoggedRef.current) {
      auditLoggedRef.current = true;
      // Fire-and-forget: don't block data loading on audit write
      supabase.auth.getUser().then(({ data: { user: authUser } }) => {
        if (authUser) {
          supabase.from("audit_logs").insert({
            user_id: authUser.id,
            patient_id: patientData.id,
            action: "view_patient",
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    const [
      allergiesRes, antecedentsRes, familliauxRes, habitudesRes,
      consultationsRes, prescriptionsRes,
    ] = await Promise.all([
      supabase.from("allergies").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("antecedents").select("*").eq("patient_id", patientData.id).is("deleted_at", null).order("date_debut", { ascending: false }),
      supabase.from("antecedents_familiaux").select("*").eq("patient_id", patientData.id),
      supabase.from("habitudes_vie").select("*").eq("patient_id", patientData.id).maybeSingle(),
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

  function handleOpenAPI(url: string) {
    const win = window.open(url, "_blank");
    if (!win) toast({ variant: "destructive", title: "Erreur", description: "Impossible d'ouvrir la fenêtre. Vérifiez les blocages de popups." });
  }
  function handleExportPDF() { if (patient) handleOpenAPI(`/api/export-pdf?patientId=${patient.id}`); }
  function handleShowQR()    { if (patient) handleOpenAPI(`/api/qr?imu=${patient.imu}`); }
  function handleLettreRef() { if (patient) handleOpenAPI(`/api/lettre-reference?patientId=${patient.id}`); }

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

  if (loading) return <PageSkeleton />;
  if (!patient) return null;

  const isAdmin = user?.role === "super_admin" || user?.role === "admin_etablissement";

  // Resolve count per tab
  function getCount(tabId: string): number | undefined {
    if (tabId === "consultations") return consultations.length || undefined;
    if (tabId === "prescriptions") return prescriptions.length || undefined;
    return tabCounts[tabId] || undefined;
  }

  const visibleTabs = TAB_DEFS.filter((t) => !("adminOnly" in t && t.adminOnly) || isAdmin);

  return (
    <div className="flex flex-col min-h-full bg-slate-50/60 scrollbar-hidden overflow-x-hidden">
      <Header />

      {/* Breadcrumb */}
      <nav className="px-6 py-2 text-sm text-muted-foreground flex items-center gap-1.5 border-b bg-white">
        <Link href="/patients" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
          Patients
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-foreground font-medium truncate">
          {patient.prenom} <span className="uppercase">{patient.nom}</span>
        </span>
        <span className="ml-1 text-xs text-muted-foreground/60 font-mono hidden sm:inline">
          {patient.imu}
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

      <AIAlertsBanner patientId={patient.id} />

      {/* Break-the-glass dialog */}
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
                placeholder="Expliquez la raison de cet accès d'urgence..."
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

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b shadow-sm">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex min-w-max">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              const count = getCount(tab.id);

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all duration-150 whitespace-nowrap border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-medical-green",
                    isActive
                      ? [tab.activeText, tab.activeBorder]
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/80"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? tab.activeIcon : "text-slate-400"
                  )} />

                  <span className="leading-none">{tab.label}</span>

                  {count !== undefined && count > 0 && (
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none transition-colors",
                      isActive
                        ? tab.activeBadge
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="p-4 sm:p-6">

            <TabsContent value="overview" className="mt-0">
              <OverviewTab
                patient={patient}
                allergies={allergies}
                antecedents={antecedents}
                antecedentsFamiliaux={antecedentsFamiliaux}
                habitudes={habitudes}
                consultations={consultations}
                prescriptions={prescriptions}
                onRefresh={() => loadPatient(patient.imu)}
                navigateToTab={handleTabChange}
              />
            </TabsContent>

            <TabsContent value="consultations" className="mt-0">
              <ConsultationsTab
                patient={patient}
                consultations={consultations}
                onRefresh={() => loadPatient(patient.imu)}
              />
            </TabsContent>

            <TabsContent value="prescriptions" className="mt-0">
              <PrescriptionsTab
                patient={patient}
                allergies={allergies}
                onRefresh={() => loadPatient(patient.imu)}
              />
            </TabsContent>

            <TabsContent value="analyses" className="mt-0">
              <AnalysesTab patient={patient} onRefresh={() => loadPatient(patient.imu)} />
            </TabsContent>

            <TabsContent value="vaccinations" className="mt-0">
              <VaccinationsTab patient={patient} onRefresh={() => loadPatient(patient.imu)} />
            </TabsContent>

            <TabsContent value="hospitalisations" className="mt-0">
              <HospitalisationsTab patient={patient} onRefresh={() => loadPatient(patient.imu)} />
            </TabsContent>

            <TabsContent value="rendez-vous" className="mt-0">
              <RendezVousTab patient={patient} onRefresh={() => loadPatient(patient.imu)} />
            </TabsContent>

            <TabsContent value="documents" className="mt-0">
              <DocumentsTab patient={patient} />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="audit" className="mt-0">
                <AuditTab patient={patient} />
              </TabsContent>
            )}

          </div>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Export wrapped in Suspense ───────────────────────────────────────────────
export default function PatientPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PatientPageInner />
    </Suspense>
  );
}
