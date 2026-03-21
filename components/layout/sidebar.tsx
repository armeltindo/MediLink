"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { getRoleBadge } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  LayoutDashboard, Users, Building2, FlaskConical,
  Pill, Syringe, BedDouble, FileText, BarChart3,
  LogOut, ShieldCheck, ClipboardList, CalendarDays, X,
  RefreshCw,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useSidebar } from "@/components/layout/sidebar-context";

// ─── Navigation groups ────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Clinique",
    items: [
      { href: "/dashboard",        label: "Tableau de bord",  icon: LayoutDashboard, iconColor: "text-slate-300",   roles: ["super_admin", "admin_etablissement", "medecin", "infirmier", "laborantin", "pharmacien"] },
      { href: "/patients",         label: "Patients",         icon: Users,           iconColor: "text-sky-400",     roles: ["super_admin", "admin_etablissement", "medecin", "infirmier", "laborantin", "pharmacien"] },
      { href: "/rendez-vous",      label: "Rendez-vous",      icon: CalendarDays,    iconColor: "text-teal-400",    roles: ["super_admin", "admin_etablissement", "medecin", "infirmier"] },
      { href: "/consultations",    label: "Consultations",    icon: ClipboardList,   iconColor: "text-indigo-400",  roles: ["super_admin", "admin_etablissement", "medecin", "infirmier"] },
    ],
  },
  {
    label: "Soins",
    items: [
      { href: "/prescriptions",    label: "Prescriptions",    icon: Pill,            iconColor: "text-amber-400",   roles: ["medecin", "pharmacien", "super_admin"] },
      { href: "/analyses",         label: "Analyses",         icon: FlaskConical,    iconColor: "text-purple-400",  roles: ["medecin", "laborantin", "super_admin"] },
      { href: "/vaccinations",     label: "Vaccinations",     icon: Syringe,         iconColor: "text-emerald-400", roles: ["medecin", "infirmier", "super_admin"] },
      { href: "/hospitalisations", label: "Hospitalisations", icon: BedDouble,       iconColor: "text-violet-400",  roles: ["medecin", "infirmier", "super_admin", "admin_etablissement"] },
    ],
  },
  {
    label: "Gestion",
    items: [
      { href: "/documents",        label: "Documents",        icon: FileText,        iconColor: "text-orange-400",  roles: ["super_admin", "admin_etablissement", "medecin"] },
      { href: "/etablissements",   label: "Établissements",   icon: Building2,       iconColor: "text-slate-300",   roles: ["super_admin", "admin_etablissement"] },
      { href: "/admin",            label: "Administration",   icon: BarChart3,       iconColor: "text-blue-400",    roles: ["super_admin", "admin_etablissement"] },
      { href: "/audit",            label: "Audit & Sécurité", icon: ShieldCheck,     iconColor: "text-red-400",     roles: ["super_admin", "admin_etablissement"] },
    ],
  },
] as const;

// Badge alerts per href
const ALERT_HREFS = new Set(["/prescriptions", "/analyses"]);

// ─── Sidebar component ────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const { open, close } = useSidebar();

  const [prescriptionsExpiring, setPrescriptionsExpiring] = useState(0);
  const [analysesEnAttente, setAnalysesEnAttente]         = useState(0);
  const [hasMultiEtab, setHasMultiEtab]                   = useState(false);

  useEffect(() => {
    if (!user) return;
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      supabase.from("prescriptions").select("id", { count: "exact" })
        .in("statut", ["prescrit", "en_cours"])
        .lte("date_expiration", sevenDaysLater)
        .gte("date_expiration", new Date().toISOString()),
      supabase.from("analyses_prescrites").select("id", { count: "exact" })
        .in("statut", ["prescrit", "en_attente"]),
      supabase.from("user_etablissements").select("etablissement_id", { count: "exact" })
        .eq("user_id", user.id),
    ]).then(([rx, an, etabs]) => {
      setPrescriptionsExpiring(rx.count || 0);
      setAnalysesEnAttente(an.count || 0);
      setHasMultiEtab((etabs.count ?? 0) > 1);
    });
  }, [user]);

  function getAlertBadge(href: string): number {
    if (href === "/prescriptions") return prescriptionsExpiring;
    if (href === "/analyses") return analysesEnAttente;
    return 0;
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-200",
        "bg-[#0f1724]",
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* ── Logo ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <Logo theme="dark" size="md" />
          <button
            onClick={close}
            className="lg:hidden text-slate-500 hover:text-white p-1 rounded transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_GROUPS.map((group, gi) => {
            const visibleItems = group.items.filter(item =>
              !item.roles || (user && (item.roles as readonly string[]).includes(user.role))
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className={cn("px-3", gi > 0 && "mt-5")}>
                {/* Group label */}
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none">
                  {group.label}
                </p>

                <nav className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const href = item.href as string;
                    const isActive =
                      pathname === href ||
                      (href !== "/dashboard" &&
                        href !== "/patients/nouveau" &&
                        pathname.startsWith(href + "/"));
                    const alertCount = ALERT_HREFS.has(item.href) ? getAlertBadge(item.href) : 0;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={close}
                        className={cn(
                          "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                          isActive
                            ? "bg-white/8 text-white"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        )}
                      >
                        {/* Left accent indicator */}
                        <span className={cn(
                          "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full transition-all duration-150",
                          isActive ? "bg-medical-green opacity-100" : "opacity-0"
                        )} />

                        {/* Icon */}
                        <Icon className={cn(
                          "h-4 w-4 flex-shrink-0 transition-colors",
                          isActive
                            ? item.iconColor
                            : cn("text-slate-600 group-hover:text-slate-400")
                        )} />

                        {/* Label */}
                        <span className="flex-1 truncate font-medium">{item.label}</span>

                        {/* Alert badge */}
                        {alertCount > 0 && (
                          <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                            item.href === "/prescriptions"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          )}>
                            {alertCount > 99 ? "99+" : alertCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* ── User card ───────────────────────────────────────────────────── */}
        <div className="p-3 border-t border-white/5">
          {loading ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-slate-700 animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-2.5 bg-slate-700 rounded animate-pulse" />
                <div className="h-2 bg-slate-800 rounded animate-pulse w-3/5" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/5 px-3 py-2.5">
              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-medical-green/80 text-white text-xs font-semibold">
                  {user.prenom?.[0]?.toUpperCase()}{user.nom?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate leading-tight">
                  {user.prenom} {user.nom}
                </p>
                <p className={cn(
                  "text-[10px] font-medium mt-0.5 truncate leading-tight",
                  getRoleBadge(user.role).color.replace("bg-", "text-").replace("/10", "").replace("text-", "text-")
                )}>
                  {getRoleBadge(user.role).label}
                </p>
              </div>

              {/* Changer d'établissement */}
              {hasMultiEtab && (
                <button
                  onClick={async () => {
                    await fetch("/api/auth/select-etablissement", { method: "DELETE" });
                    router.push("/select-etablissement");
                  }}
                  className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                  title="Changer d'établissement"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Logout icon button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <LogOut className="h-5 w-5 text-red-500" />
                      Confirmer la déconnexion
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Vous êtes sur le point de vous déconnecter de MediLink. Toute session non sauvegardée sera perdue.
                      Souhaitez-vous continuer ?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Se déconnecter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
