export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/layout/sidebar-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background overflow-x-hidden">
        <Sidebar />
        {/* Sur mobile : pas de marge gauche (sidebar en overlay). Sur lg+ : marge de 256px */}
        <div className="flex-1 min-w-0 lg:ml-64 flex flex-col min-h-screen">
          <main className="flex-1">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}
