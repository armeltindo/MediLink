"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Constante } from "@/types";

interface ConstantesChartProps {
  constantes: Constante[];
  type?: "tension" | "poids" | "glycemie" | "temperature" | "spo2";
}

const CHART_CONFIG = {
  tension: {
    title: "Tension artérielle (mmHg)",
    lines: [
      { key: "ta_sys", name: "Systolique", color: "#DC2626" },
      { key: "ta_dia", name: "Diastolique", color: "#0EA5E9" },
    ],
    refLines: [
      { y: 140, label: "140 (limite haute)", color: "#DC2626" },
      { y: 90, label: "90", color: "#0EA5E9" },
    ],
  },
  poids: {
    title: "Poids (kg)",
    lines: [{ key: "poids", name: "Poids", color: "#0D7A5F" }],
    refLines: [],
  },
  glycemie: {
    title: "Glycémie (mmol/L)",
    lines: [{ key: "glycemie", name: "Glycémie", color: "#F59E0B" }],
    refLines: [
      { y: 7, label: "7 mmol/L (limite haute)", color: "#DC2626" },
      { y: 4, label: "4 mmol/L (limite basse)", color: "#0EA5E9" },
    ],
  },
  temperature: {
    title: "Température (°C)",
    lines: [{ key: "temperature", name: "Température", color: "#F59E0B" }],
    refLines: [
      { y: 38.5, label: "38.5°C (fièvre)", color: "#DC2626" },
      { y: 37, label: "37°C (normale)", color: "#0D7A5F" },
    ],
  },
  spo2: {
    title: "Saturation O₂ (%)",
    lines: [{ key: "spo2", name: "SpO₂", color: "#0EA5E9" }],
    refLines: [
      { y: 94, label: "94% (limite basse)", color: "#DC2626" },
    ],
  },
};

export function ConstantesChart({ constantes, type = "tension" }: ConstantesChartProps) {
  const config = CHART_CONFIG[type];

  const data = constantes
    .filter((c) => c.date_mesure)
    .sort((a, b) => new Date(a.date_mesure).getTime() - new Date(b.date_mesure).getTime())
    .map((c) => ({
      ...c,
      date: format(new Date(c.date_mesure), "dd/MM/yy", { locale: fr }),
    }));

  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
        Pas de données disponibles
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">{config.title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {config.refLines.map((ref) => (
            <ReferenceLine key={ref.y} y={ref.y} stroke={ref.color} strokeDasharray="3 3" />
          ))}
          {config.lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 4, fill: line.color }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
