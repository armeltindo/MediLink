"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { getRoleBadge } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, Users, Building2, FlaskConical,
  Pill, Syringe, BedDouble, FileText, BarChart3,
  LogOut, ShieldCheck, ClipboardList, CalendarDays, X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useSidebar } from "@/components/layout/sidebar-context";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["super_admin", "admin_etablissement", "medecin", "infirmier", "laborantin", "pharmacien"] },
  { href: "/patients", label: "Patients", icon: Users, roles: ["super_admin", "admin_etablissement", "medecin", "infirmier", "laborantin", "pharmacien"] },
  { href: "/rendez-vous", label: "Rendez-vous", icon: CalendarDays, roles: ["super_admin", "admin_etablissement", "medecin", "infirmier"] },
  { href: "/consultations", label: "Consultations", icon: ClipboardList, roles: ["super_admin", "admin_etablissement", "medecin", "infirmier"] },
  { href: "/prescriptions", label: "Prescriptions", icon: Pill, roles: ["medecin", "pharmacien", "super_admin"] },
  { href: "/analyses", label: "Analyses", icon: FlaskConical, roles: ["medecin", "laborantin", "super_admin"] },
  { href: "/vaccinations", label: "Vaccinations", icon: Syringe, roles: ["medecin", "infirmier", "super_admin"] },
  { href: "/hospitalisations", label: "Hospitalisations", icon: BedDouble, roles: ["medecin", "infirmier", "super_admin", "admin_etablissement"] },
  { href: "/documents", label: "Documents", icon: FileText, roles: ["super_admin", "admin_etablissement", "medecin"] },
  { href: "/etablissements", label: "Établissements", icon: Building2, roles: ["super_admin", "admin_etablissement"] },
  { href: "/admin", label: "Administration", icon: BarChart3, roles: ["super_admin", "admin_etablissement"] },
  { href: "/audit", label: "Audit & Sécurité", icon: ShieldCheck, roles: ["super_admin", "admin_etablissement"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const { open, close } = useSidebar();

  // Alert counts for sidebar badges
  const [prescriptionsExpiring, setPrescriptionsExpiring] = useState(0);
  const [analysesEnAttente, setAnalysesEnAttente] = useState(0);

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
    ]).then(([rx, an]) => {
      setPrescriptionsExpiring(rx.count || 0);
      setAnalysesEnAttente(an.count || 0);
    });
  }, [user]);

  const visibleItems = navItems.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-medical-slate border-r border-slate-700 flex flex-col transition-transform duration-200",
        // Sur mobile : caché par défaut, visible si open
        "lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo + bouton fermeture mobile */}
        <div className="px-4 py-4 border-b border-slate-700 flex items-center justify-between">
          <Logo theme="dark" size="md" />
          <button
            onClick={close}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  item.href !== "/patients/nouveau" &&
                  pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-medical-green text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-700 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.href === "/prescriptions" && prescriptionsExpiring > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {prescriptionsExpiring > 99 ? "99+" : prescriptionsExpiring}
                    </span>
                  )}
                  {item.href === "/analyses" && analysesEnAttente > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {analysesEnAttente > 99 ? "99+" : analysesEnAttente}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

      {/* User section */}
      <div className="p-4 border-t border-slate-700">
        <Separator className="mb-3 bg-slate-700" />
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-slate-600 animate-pulse" />
            <div className="space-y-1 flex-1">
              <div className="h-3 bg-slate-600 rounded animate-pulse" />
              <div className="h-2 bg-slate-700 rounded animate-pulse w-2/3" />
            </div>
          </div>
        ) : user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-medical-green text-white text-xs">
                  {user.prenom?.[0]}{user.nom?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {user.prenom} {user.nom}
                </p>
                <Badge
                  className={cn("text-xs px-1.5 py-0", getRoleBadge(user.role).color)}
                  variant="outline"
                >
                  {getRoleBadge(user.role).label}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-700 text-xs"
            >
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Déconnexion
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
    </>
  );
}
