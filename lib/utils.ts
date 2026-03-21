import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  const years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  const adjustedYears =
    months < 0 || (months === 0 && today.getDate() < birth.getDate())
      ? years - 1
      : years;
  if (adjustedYears < 2) {
    const totalMonths =
      (today.getFullYear() - birth.getFullYear()) * 12 +
      (today.getMonth() - birth.getMonth());
    return `${totalMonths} mois`;
  }
  return `${adjustedYears} ans`;
}

export function generateIMU(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");
  return `IMU-${year}-${num}`;
}

export function calculateIMC(poids: number, taille: number): number {
  // Explicit check against <= 0 : évite le bug avec falsy 0 et les valeurs aberrantes
  if (poids <= 0 || taille <= 0) return 0;
  const tailleM = taille / 100;
  return Math.round((poids / (tailleM * tailleM)) * 10) / 10;
}

export function getIMCCategory(imc: number): {
  label: string;
  color: string;
} {
  if (imc < 18.5) return { label: "Insuffisance pondérale", color: "text-blue-600" };
  if (imc < 25) return { label: "Poids normal", color: "text-green-600" };
  if (imc < 30) return { label: "Surpoids", color: "text-orange-500" };
  if (imc < 35) return { label: "Obésité modérée", color: "text-red-500" };
  return { label: "Obésité sévère", color: "text-red-700" };
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

export function getRoleBadge(role: string): { label: string; color: string } {
  const roles: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "bg-purple-100 text-purple-800" },
    admin_etablissement: { label: "Admin Établissement", color: "bg-blue-100 text-blue-800" },
    medecin: { label: "Médecin", color: "bg-medical-green-light text-medical-green" },
    infirmier: { label: "Infirmier(e)", color: "bg-teal-100 text-teal-800" },
    laborantin: { label: "Laborantin", color: "bg-yellow-100 text-yellow-800" },
    pharmacien: { label: "Pharmacien", color: "bg-orange-100 text-orange-800" },
  };
  return roles[role] || { label: role, color: "bg-gray-100 text-gray-800" };
}

export function getSeverityColor(severite: string): string {
  const colors: Record<string, string> = {
    legere: "bg-yellow-100 text-yellow-800 border-yellow-200",
    moderee: "bg-orange-100 text-orange-800 border-orange-200",
    anaphylactique: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[severite] || "bg-gray-100 text-gray-800 border-gray-200";
}

export function getBloodGroupColor(group: string): string {
  const colors: Record<string, string> = {
    "A+": "bg-red-500",
    "A-": "bg-red-700",
    "B+": "bg-blue-500",
    "B-": "bg-blue-700",
    "AB+": "bg-purple-500",
    "AB-": "bg-purple-700",
    "O+": "bg-green-500",
    "O-": "bg-green-700",
  };
  return colors[group] || "bg-gray-500";
}
