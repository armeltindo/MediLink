"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { generateNPI, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, UserPlus, Copy, Check, Camera, AlertTriangle,
  ChevronLeft, User2, HeartPulse, Phone, Shield, X,
  MapPin, Mail, Stethoscope, Users,
} from "lucide-react";

// ─── Schema ───────────────────────────────────────────────────────────────────

const patientSchema = z.object({
  nom: z.string().min(2, "Nom requis (min. 2 caractères)"),
  prenom: z.string().min(2, "Prénom requis (min. 2 caractères)"),
  date_naissance: z.string().min(1, "Date de naissance requise"),
  lieu_naissance: z.string().optional(),
  sexe: z.enum(["M", "F"], { error: "Sexe requis" }),
  situation_matrimoniale: z.string().optional(),
  nombre_enfants: z.coerce.number().min(0).optional(),
  groupe_sanguin: z.string().optional(),
  rhesus: z.string().optional(),
  nationalite: z.string().optional(),
  ethnie: z.string().optional(),
  profession: z.string().optional(),
  niveau_etudes: z.string().optional(),
  langue_preferee: z.string().optional(),
  contact_urgence_nom: z.string().optional(),
  contact_urgence_lien: z.string().optional(),
  contact_urgence_tel: z.string().optional(),
  assurance_organisme: z.string().optional(),
  assurance_numero: z.string().optional(),
  assurance_taux: z.coerce.number().min(0).max(100).optional(),
  // Coordonnées
  telephone: z.string().optional(),
  email: z.string().optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Adresse email invalide" }),
  adresse_quartier: z.string().optional(),
  adresse_commune: z.string().optional(),
  adresse_departement: z.string().optional(),
  // Anthropométrie
  taille: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(30, "Min 30 cm").max(250, "Max 250 cm").optional()
  ),
  poids: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)),
    z.number().min(1, "Min 1 kg").max(500, "Max 500 kg").optional()
  ),
  // Informations médicales initiales
  medecin_traitant: z.string().optional(),
  note_medicale_initiale: z.string().optional(),
  // Tuteur légal
  tuteur_nom: z.string().optional(),
  tuteur_tel: z.string().optional(),
  tuteur_lien: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

// ─── Sections nav config ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "section-identite",    label: "Identité civile",        icon: User2,       required: true  },
  { id: "section-coordonnees", label: "Coordonnées",            icon: MapPin,      required: false },
  { id: "section-biologie",    label: "Données biologiques",    icon: HeartPulse,  required: false },
  { id: "section-medical",     label: "Infos médicales",        icon: Stethoscope, required: false },
  { id: "section-contact",     label: "Contact d'urgence",      icon: Users,       required: false },
  { id: "section-assurance",   label: "Assurance maladie",      icon: Shield,      required: false },
];

const BLOOD_BG: Record<string, string> = {
  A: "bg-red-500", B: "bg-orange-500", AB: "bg-purple-600", O: "bg-blue-500",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NouveauPatientPage() {
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  // Computed at render to stay accurate if the page stays open past midnight
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [loading, setLoading]           = useState(false);
  const [npi, setNpi]                   = useState(() => generateNPI());
  const [npiCopied, setNpiCopied]       = useState(false);
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [duplicates, setDuplicates]     = useState<{ id: string; npi: string; nom: string; prenom: string; date_naissance: string }[]>([]);
  const [checkingDups, setCheckingDups] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("section-identite");

  // ─── Active section via IntersectionObserver ───────────────────────────────
  useEffect(() => {
    const sectionIds = SECTIONS.map((s) => s.id);
    const observers: IntersectionObserver[] = [];
    const visibleSections = new Map<string, number>();

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            visibleSections.set(id, entry.intersectionRatio);
          } else {
            visibleSections.delete(id);
          }
          // Pick the visible section with the highest ratio (most visible)
          if (visibleSections.size > 0) {
            const best = Array.from(visibleSections.entries()).reduce((a, b) => a[1] >= b[1] ? a : b)[0];
            setActiveSection(best);
          }
        },
        { threshold: [0, 0.1, 0.5], rootMargin: "-80px 0px -40% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PatientFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(patientSchema) as any,
    defaultValues: { nationalite: "Béninoise", langue_preferee: "Français", nombre_enfants: 0 },
  });

  const sexe          = watch("sexe");
  const groupeSanguin = watch("groupe_sanguin");
  const rhesus        = watch("rhesus");
  const watchedNom    = watch("nom");
  const watchedPrenom = watch("prenom");
  const watchedDOB    = watch("date_naissance");
  const watchedTaille = watch("taille");
  const watchedPoids  = watch("poids");

  // ─── Age en temps réel ─────────────────────────────────────────────────────
  const calculatedAge = useMemo(() => {
    if (!watchedDOB) return null;
    const dob = new Date(watchedDOB);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age >= 0 && age <= 150 ? age : null;
  }, [watchedDOB]);

  const isMinor = calculatedAge !== null && calculatedAge < 18;

  // ─── IMC en temps réel ─────────────────────────────────────────────────────
  const imc = useMemo(() => {
    const t = Number(watchedTaille);
    const p = Number(watchedPoids);
    if (!t || !p || t < 30) return null;
    return Math.round((p / ((t / 100) ** 2)) * 10) / 10;
  }, [watchedTaille, watchedPoids]);

  const imcLabel = imc === null ? null
    : imc < 18.5 ? { text: "Maigreur", color: "text-blue-600" }
    : imc < 25   ? { text: "Normal",   color: "text-green-600" }
    : imc < 30   ? { text: "Surpoids", color: "text-amber-600" }
    :              { text: "Obésité",  color: "text-red-600" };

  // ─── Détection doublons (debounce 600ms) ───────────────────────────────────
  useEffect(() => {
    if (!watchedNom || !watchedPrenom || watchedNom.length < 2 || watchedPrenom.length < 2) {
      setDuplicates([]);
      return;
    }
    setCheckingDups(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("patients")
        .select("id, npi, nom, prenom, date_naissance")
        .ilike("nom", `%${watchedNom}%`)
        .ilike("prenom", `%${watchedPrenom}%`)
        .is("deleted_at", null)
        .limit(5);
      setDuplicates(data || []);
      setCheckingDups(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [watchedNom, watchedPrenom]);

  // Fields managed via setValue (Select) have no direct id; fall back to their section
  const FIELD_TO_SECTION: Record<string, string> = {
    situation_matrimoniale: "section-identite", niveau_etudes: "section-identite",
    langue_preferee: "section-identite", sexe: "section-identite",
    groupe_sanguin: "section-biologie",   rhesus: "section-biologie",
    contact_urgence_lien: "section-contact", tuteur_lien: "section-medical",
  };

  const scrollToFirstError = useCallback((errs: Record<string, unknown>) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    const el = document.getElementById(firstKey) ?? document.getElementById(FIELD_TO_SECTION[firstKey] ?? "");
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); (el as HTMLElement).focus?.(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Photo ─────────────────────────────────────────────────────────────────
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Type de fichier non supporté", description: "Formats acceptés : JPG, PNG, WEBP." });
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Fichier trop volumineux", description: "Max 5 Mo." });
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function copyNPI() {
    navigator.clipboard.writeText(npi);
    setNpiCopied(true);
    setTimeout(() => setNpiCopied(false), 2000);
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(data: PatientFormData) {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      let photoUrl: string | undefined;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `patients/${npi}/photo_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("documents").upload(path, photoFile);
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
          photoUrl = publicUrl;
        }
      }

      const { data: patient, error } = await supabase.from("patients").insert({
        ...data,
        npi,
        created_by: user.id,
        ...(photoUrl ? { photo_url: photoUrl } : {}),
      }).select().single();

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        user_id: user.id,
        patient_id: patient.id,
        action: "create_patient",
        details: JSON.stringify({ npi }),
        timestamp: new Date().toISOString(),
      });

      toast({ title: "Patient enregistré", description: `${data.prenom} ${data.nom} — ${npi}` });
      router.push(`/patients/${npi}`);
    } catch (err: unknown) {
      // Handle NPI unique-constraint collision (PostgreSQL code 23505)
      const pgErr = err as { code?: string };
      if (pgErr.code === "23505") {
        setNpi(generateNPI());
        toast({
          variant: "destructive",
          title: "Identifiant en conflit",
          description: "Un nouveau NPI a été généré automatiquement. Veuillez soumettre à nouveau.",
        });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: err instanceof Error ? err.message : "Erreur" });
      }
    } finally {
      setLoading(false);
    }
  }

  const errorCount     = Object.keys(errors).length;
  const hasDuplicates  = duplicates.length > 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-muted/20">
      <Header title="Enregistrement patient" />

      {/* Breadcrumb */}
      <nav className="px-6 py-2.5 border-b bg-card flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/patients" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-3.5 w-3.5" />
          Patients
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-foreground font-medium">Nouveau patient</span>
      </nav>

      {/* Main content */}
      <div className="flex-1 p-4 sm:p-6 pb-28 max-w-5xl mx-auto w-full">

        {/* NPI Banner */}
        <div className="mb-6 bg-medical-green-light border border-medical-green/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-medical-green font-semibold uppercase tracking-widest mb-1">
              Numéro Personnel d&apos;Identification — généré automatiquement
            </p>
            <p className="text-2xl font-mono font-bold text-medical-green tracking-wider">{npi}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyNPI} className="border-medical-green/40 text-medical-green hover:bg-medical-green/10">
            {npiCopied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {npiCopied ? "Copié !" : "Copier"}
          </Button>
        </div>

        {/* Two-column layout: sidebar + form */}
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">

          {/* ── Sticky section nav (desktop) ───────────────────────────── */}
          <aside className="hidden lg:block">
            <nav className="sticky top-20 space-y-0.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-3">
                Sections
              </p>
              {SECTIONS.map(({ id, label, icon: Icon, required }) => {
                const isActive = activeSection === id;
                return (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group relative",
                      isActive
                        ? "bg-medical-green/10 text-medical-green font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-medical-green rounded-r-full" />
                    )}
                    <Icon className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-medical-green" : "group-hover:text-medical-green"
                    )} />
                    <span>{label}</span>
                    {required && <span className="ml-auto text-[10px] text-red-400">*</span>}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* ── Form ───────────────────────────────────────────────────── */}
          <form
            id="patient-form"
            onSubmit={handleSubmit(onSubmit, scrollToFirstError)}
            className="space-y-6"
          >

            {/* ═══ Identité civile ════════════════════════════════════════ */}
            <Card id="section-identite" className="scroll-mt-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <User2 className="h-4 w-4 text-medical-green" />
                  Identité civile
                  <span className="ml-1 text-xs font-normal text-red-400">* champs requis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Photo */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="group relative h-20 w-20 rounded-full border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center hover:border-medical-green/60 transition-colors"
                    >
                      {photoPreview
                        ? <img src={photoPreview} alt="Aperçu" className="h-full w-full object-cover" />
                        : <Camera className="h-7 w-7 text-muted-foreground" />
                      }
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    </button>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow"
                        title="Supprimer la photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Photo du patient</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG — max 5 Mo (optionnel)</p>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-xs text-medical-green hover:underline underline-offset-2 mt-1 block"
                    >
                      {photoPreview ? "Changer la photo" : "Ajouter une photo"}
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  </div>
                </div>

                {/* Nom + Prénom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nom">Nom de famille *</Label>
                    <Input id="nom" {...register("nom")} placeholder="KONAN" className="uppercase" autoComplete="family-name" />
                    {errors.nom && <p className="text-xs text-destructive">{errors.nom.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prenom">Prénom(s) *</Label>
                    <Input id="prenom" {...register("prenom")} placeholder="Kouassi Yao" autoComplete="given-name" />
                    {errors.prenom && <p className="text-xs text-destructive">{errors.prenom.message}</p>}
                  </div>
                </div>

                {/* Alerte doublons — inline, juste après nom/prénom */}
                {(hasDuplicates || checkingDups) && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs font-semibold text-amber-800">
                        {checkingDups
                          ? "Vérification des doublons…"
                          : `${duplicates.length} patient${duplicates.length > 1 ? "s" : ""} similaire${duplicates.length > 1 ? "s" : ""} trouvé${duplicates.length > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    {!checkingDups && duplicates.map((d) => (
                      <div key={d.id} className="flex items-center justify-between bg-white rounded px-2.5 py-1.5 border border-amber-200">
                        <span className="text-xs text-amber-900">
                          <strong>{d.prenom} {d.nom}</strong>
                          {d.date_naissance && (
                            <span className="text-amber-700 ml-1">
                              — né(e) le {new Date(d.date_naissance).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                          <code className="font-mono ml-1.5 text-muted-foreground">{d.npi}</code>
                        </span>
                        <a
                          href={`/patients/${d.npi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-medical-green hover:underline ml-2 shrink-0"
                        >
                          Voir →
                        </a>
                      </div>
                    ))}
                    {!checkingDups && (
                      <p className="text-xs text-amber-700">Vérifiez qu&apos;il ne s&apos;agit pas d&apos;un patient existant.</p>
                    )}
                  </div>
                )}

                {/* Date naissance + Lieu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="date_naissance">Date de naissance *</Label>
                    <div className="relative">
                      <Input
                        id="date_naissance"
                        type="date"
                        max={today}
                        {...register("date_naissance")}
                        className={cn("pr-16", errors.date_naissance && "border-destructive")}
                      />
                      {calculatedAge !== null && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-medical-green bg-medical-green-light px-1.5 py-0.5 rounded pointer-events-none">
                          {calculatedAge} ans
                        </span>
                      )}
                    </div>
                    {errors.date_naissance && <p className="text-xs text-destructive">{errors.date_naissance.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lieu_naissance">Lieu de naissance</Label>
                    <Input id="lieu_naissance" {...register("lieu_naissance")} placeholder="Cotonou, Bénin" />
                  </div>
                </div>

                {/* Sexe — pill buttons */}
                <div id="sexe" className="space-y-1.5">
                  <Label>Sexe *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "M", label: "Masculin",  symbol: "♂", active: "bg-blue-500 text-white border-blue-500 shadow-sm" },
                      { value: "F", label: "Féminin",   symbol: "♀", active: "bg-pink-500 text-white border-pink-500 shadow-sm" },
                    ] as const).map(({ value, label, symbol, active }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue("sexe", value, { shouldValidate: true })}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all",
                          sexe === value
                            ? active
                            : "border-border bg-background hover:border-foreground/40 text-foreground",
                        )}
                      >
                        <span className="text-base leading-none">{symbol}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.sexe && <p className="text-xs text-destructive">Sexe requis</p>}
                </div>

                {/* Situation matrimoniale + Nombre d'enfants */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Situation matrimoniale</Label>
                    <Select onValueChange={(v) => setValue("situation_matrimoniale", v)}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="célibataire">Célibataire</SelectItem>
                        <SelectItem value="marié">Marié(e)</SelectItem>
                        <SelectItem value="divorcé">Divorcé(e)</SelectItem>
                        <SelectItem value="veuf">Veuf / Veuve</SelectItem>
                        <SelectItem value="union_libre">Union libre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {sexe === "F" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="nombre_enfants">Nombre d&apos;enfants</Label>
                      <Input id="nombre_enfants" type="number" min="0" {...register("nombre_enfants")} />
                    </div>
                  )}
                </div>

                {/* Nationalité + Ethnie */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nationalite">Nationalité</Label>
                    <Input id="nationalite" {...register("nationalite")} placeholder="Béninoise" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ethnie">Ethnie</Label>
                    <Input id="ethnie" {...register("ethnie")} placeholder="Fon, Yoruba, Bariba…" />
                  </div>
                </div>

                {/* Profession + Niveau études */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="profession">Profession</Label>
                    <Input id="profession" {...register("profession")} placeholder="Enseignant, Commerçant…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Niveau d&apos;études</Label>
                    <Select onValueChange={(v) => setValue("niveau_etudes", v)}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        {["Aucun","Primaire","Collège","Lycée / Bac","BTS / DUT","Licence","Master","Doctorat"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Langue préférée */}
                <div className="space-y-1.5 sm:max-w-xs">
                  <Label>Langue préférée</Label>
                  <Select defaultValue="Français" onValueChange={(v) => setValue("langue_preferee", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Français","Fon","Yoruba","Dendi","Bariba","Anglais"].map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

              </CardContent>
            </Card>

            {/* ═══ Coordonnées ════════════════════════════════════════════ */}
            <Card id="section-coordonnees" className="scroll-mt-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Coordonnées
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Téléphone + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="telephone">
                      <Phone className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                      Téléphone
                    </Label>
                    <Input id="telephone" type="tel" {...register("telephone")} placeholder="+229 XX XX XX XX" autoComplete="tel" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      <Mail className="h-3.5 w-3.5 inline mr-1 text-muted-foreground" />
                      Adresse email
                    </Label>
                    <Input id="email" type="email" {...register("email")} placeholder="patient@exemple.com" autoComplete="email" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                </div>

                {/* Adresse */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="adresse_quartier">Quartier</Label>
                    <Input id="adresse_quartier" {...register("adresse_quartier")} placeholder="Agla, Cadjehoun…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adresse_commune">Commune / Arrondissement</Label>
                    <Input id="adresse_commune" {...register("adresse_commune")} placeholder="Cotonou, Abomey-Calavi…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="adresse_departement">Département</Label>
                    <Input id="adresse_departement" {...register("adresse_departement")} placeholder="Littoral, Atlantique…" />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* ═══ Données biologiques ════════════════════════════════════ */}
            <Card id="section-biologie" className="scroll-mt-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-red-500" />
                  Données biologiques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Taille + Poids + IMC */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="taille">Taille (cm)</Label>
                      <Input id="taille" type="number" min="30" max="250" step="0.5" {...register("taille")} placeholder="170" />
                      {errors.taille && <p className="text-xs text-destructive">{errors.taille.message as string}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="poids">Poids (kg)</Label>
                      <Input id="poids" type="number" min="1" max="500" step="0.1" {...register("poids")} placeholder="70" />
                      {errors.poids && <p className="text-xs text-destructive">{errors.poids.message as string}</p>}
                    </div>
                  </div>
                  {imc !== null && imcLabel && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">IMC :</span>
                      <span className="font-bold">{imc}</span>
                      <span className={`font-medium ${imcLabel.color}`}>— {imcLabel.text}</span>
                    </div>
                  )}
                </div>

                {/* Groupe sanguin — pills */}
                <div className="space-y-2">
                  <Label>Groupe sanguin</Label>
                  <div className="flex gap-2 flex-wrap">
                    {["A", "B", "AB", "O"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          const next = groupeSanguin === g ? "" : g;
                          setValue("groupe_sanguin", next);
                          if (!next) setValue("rhesus", "");
                        }}
                        className={cn(
                          "w-14 h-11 rounded-xl border-2 text-sm font-bold transition-all",
                          groupeSanguin === g
                            ? `${BLOOD_BG[g]} text-white border-transparent shadow-md scale-105`
                            : "border-border bg-background hover:border-foreground/50",
                        )}
                      >
                        {g}
                      </button>
                    ))}
                    {groupeSanguin && (
                      <button
                        type="button"
                        onClick={() => { setValue("groupe_sanguin", ""); setValue("rhesus", ""); }}
                        className="h-11 px-3 text-xs text-muted-foreground hover:text-destructive transition-colors"
                        title="Effacer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Rhésus — pills */}
                <div className="space-y-2">
                  <Label>Facteur Rhésus</Label>
                  <div className="flex gap-2 max-w-xs">
                    {([
                      { value: "+", label: "Positif (+)", active: "bg-emerald-500 text-white border-emerald-500" },
                      { value: "-", label: "Négatif (−)", active: "bg-rose-500 text-white border-rose-500" },
                    ] as const).map(({ value, label, active }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue("rhesus", rhesus === value ? "" : value)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                          rhesus === value
                            ? `${active} shadow-sm scale-105`
                            : "border-border bg-background hover:border-foreground/50",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {groupeSanguin && rhesus && (
                    <p className="text-sm font-semibold text-muted-foreground">
                      Groupe complet :{" "}
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-white text-sm font-bold", BLOOD_BG[groupeSanguin])}>
                        {groupeSanguin}{rhesus}
                      </span>
                    </p>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* ═══ Informations médicales ═════════════════════════════════ */}
            <Card id="section-medical" className="scroll-mt-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-medical-green" />
                  Informations médicales initiales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Médecin traitant */}
                <div className="space-y-1.5">
                  <Label htmlFor="medecin_traitant">Médecin traitant habituel</Label>
                  <Input id="medecin_traitant" {...register("medecin_traitant")} placeholder="Dr. Nom Prénom" />
                </div>

                {/* Note médicale initiale */}
                <div className="space-y-1.5">
                  <Label htmlFor="note_medicale_initiale">Note médicale initiale</Label>
                  <Textarea
                    id="note_medicale_initiale"
                    {...register("note_medicale_initiale")}
                    rows={3}
                    placeholder="Motif d'admission, observations préliminaires… (les antécédents complets seront saisis dans l'onglet Résumé)"
                  />
                  <p className="text-[11px] text-muted-foreground">Note provisoire à l&apos;admission — les antécédents complets sont renseignés dans le dossier clinique.</p>
                </div>

                {/* Tuteur légal (mineurs) */}
                {isMinor && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs font-semibold text-amber-800">
                        Patient mineur ({calculatedAge} ans) — Tuteur légal
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="tuteur_nom">Nom du tuteur *</Label>
                        <Input id="tuteur_nom" {...register("tuteur_nom")} placeholder="Nom Prénom" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Lien de parenté</Label>
                        <Select onValueChange={(v) => setValue("tuteur_lien", v)}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                          <SelectContent>
                            {["Père","Mère","Grand-père","Grand-mère","Oncle","Tante","Frère","Sœur","Tuteur légal"].map((l) => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tuteur_tel">Téléphone du tuteur</Label>
                        <Input id="tuteur_tel" type="tel" {...register("tuteur_tel")} placeholder="+229 XX XX XX XX" />
                      </div>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* ═══ Contact d'urgence ══════════════════════════════════════ */}
            <Card id="section-contact" className="scroll-mt-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-rose-500" />
                  Contact d&apos;urgence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_urgence_nom">Nom complet</Label>
                    <Input id="contact_urgence_nom" {...register("contact_urgence_nom")} placeholder="KONAN Marie" autoComplete="off" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lien de parenté</Label>
                    <Select onValueChange={(v) => setValue("contact_urgence_lien", v)}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                      <SelectContent>
                        {["Époux/Épouse","Père","Mère","Frère","Sœur","Fils/Fille","Ami(e)","Autre"].map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact_urgence_tel">Téléphone</Label>
                    <Input id="contact_urgence_tel" type="tel" {...register("contact_urgence_tel")} placeholder="+229 XX XX XX XX" autoComplete="off" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ═══ Assurance maladie ══════════════════════════════════════ */}
            <Card id="section-assurance" className="scroll-mt-20">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Assurance maladie
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(optionnel)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="assurance_organisme">Organisme</Label>
                    <Input id="assurance_organisme" {...register("assurance_organisme")} placeholder="RAMU, CNSS…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="assurance_numero">Numéro de police</Label>
                    <Input id="assurance_numero" {...register("assurance_numero")} placeholder="CNSS-2024-00000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="assurance_taux">Taux de couverture (%)</Label>
                    <Input id="assurance_taux" type="number" min="0" max="100" {...register("assurance_taux")} placeholder="80" />
                  </div>
                </div>
              </CardContent>
            </Card>

          </form>
        </div>
      </div>

      {/* ── Sticky footer ──────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur-sm shadow-[0_-1px_6px_rgba(0,0,0,0.06)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: error count */}
          <div className="min-w-0">
            {errorCount > 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {errorCount} erreur{errorCount > 1 ? "s" : ""} à corriger
              </p>
            ) : hasDuplicates ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {duplicates.length} patient{duplicates.length > 1 ? "s" : ""} similaire{duplicates.length > 1 ? "s" : ""} détecté{duplicates.length > 1 ? "s" : ""}
              </p>
            ) : null}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Annuler
            </Button>
            <Button form="patient-form" type="submit" variant="medical" disabled={loading}>
              {loading
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <UserPlus className="h-4 w-4 mr-2" />}
              {loading
                ? "Enregistrement…"
                : hasDuplicates
                ? "Enregistrer quand même"
                : "Enregistrer le patient"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
