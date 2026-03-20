"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { Search, Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { getRoleBadge } from "@/lib/utils";
import { useSidebar } from "@/components/layout/sidebar-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationPanel } from "@/components/layout/notification-panel";

// ─── Breadcrumb label map ─────────────────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard":        "Tableau de bord",
  "/patients":         "Patients",
  "/rendez-vous":      "Rendez-vous",
  "/consultations":    "Consultations",
  "/prescriptions":    "Prescriptions",
  "/analyses":         "Analyses",
  "/vaccinations":     "Vaccinations",
  "/hospitalisations": "Hospitalisations",
  "/documents":        "Documents",
  "/etablissements":   "Établissements",
  "/admin":            "Administration",
  "/audit":            "Audit & Sécurité",
};

function useBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += "/" + seg;
    const label = ROUTE_LABELS[path];
    if (label) crumbs.push({ label, href: path });
    else crumbs.push({ label: seg, href: path });
  }
  return crumbs;
}

// ─── Header ───────────────────────────────────────────────────────────────────

export function Header({ title }: { title?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const { toggle } = useSidebar();
  const crumbs = useBreadcrumb();

  const [search, setSearch]         = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/patients?q=${encodeURIComponent(search)}`);
      setSearchOpen(false);
      setSearch("");
    }
  }

  const displayTitle = title ?? crumbs[crumbs.length - 1]?.label ?? "";

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center bg-white border-b border-slate-100 shadow-[0_1px_3px_0_rgb(0,0,0,0.04)] px-4 gap-3">

      {/* ── Hamburger (mobile) ─────────────────────────────────────────────── */}
      <button
        onClick={toggle}
        className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Breadcrumb / Title ─────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-1.5 text-sm min-w-0">
        {crumbs.length > 1 ? (
          crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
              <span className={cn(
                "truncate",
                i === crumbs.length - 1
                  ? "text-slate-800 font-semibold"
                  : "text-slate-400 font-medium hover:text-slate-600 cursor-pointer"
              )} onClick={() => i < crumbs.length - 1 && router.push(crumb.href)}>
                {crumb.label}
              </span>
            </span>
          ))
        ) : (
          <span className="text-slate-800 font-semibold truncate">{displayTitle}</span>
        )}
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex justify-center px-4">
        <form
          onSubmit={handleSearch}
          className={cn(
            "relative w-full max-w-sm transition-all duration-200",
            searchOpen ? "max-w-lg" : ""
          )}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un patient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => !search && setSearchOpen(false)}
            className={cn(
              "w-full h-9 pl-9 pr-9 rounded-lg text-sm border transition-all duration-200 outline-none",
              "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400",
              "focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(""); setSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* ── Right actions ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Notification bell */}
        {user && <NotificationPanel user={user} />}

        {/* Divider */}
        <span className="h-5 w-px bg-slate-200 mx-1" />

        {/* User pill */}
        {user && (
          <button
            onClick={() => (user.role === "super_admin" || user.role === "admin_etablissement") ? router.push("/admin") : undefined}
            className={cn(
              "flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-lg transition-colors",
              (user.role === "super_admin" || user.role === "admin_etablissement")
                ? "hover:bg-slate-100 cursor-pointer"
                : "cursor-default"
            )}
            title={(user.role === "super_admin" || user.role === "admin_etablissement") ? "Administration" : undefined}
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="bg-medical-green/80 text-white text-[10px] font-bold">
                {user.prenom?.[0]?.toUpperCase()}{user.nom?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                {user.prenom} {user.nom}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {getRoleBadge(user.role).label}
              </p>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
