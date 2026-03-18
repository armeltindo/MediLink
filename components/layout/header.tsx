"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Bell, Sun, Moon, Settings, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useSidebar } from "@/components/layout/sidebar-context";

export function Header({ title }: { title?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(false);
  const { toggle } = useSidebar();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/patients?q=${encodeURIComponent(search)}`);
    }
  }

  function toggleDark() {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <header className="sticky top-0 z-30 bg-background border-b border-border h-16 flex items-center px-4 gap-3">
      {/* Hamburger — visible uniquement sur mobile */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        className="lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {title && (
        <h2 className="text-lg font-serif font-semibold text-foreground hidden md:block">
          {title}
        </h2>
      )}

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un patient (NPI, nom, date naissance)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted border-0 focus-visible:ring-1"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={toggleDark} title="Thème sombre">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon-sm" title="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        {(user?.role === "super_admin" || user?.role === "admin_etablissement") && (
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/admin")} title="Administration">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
