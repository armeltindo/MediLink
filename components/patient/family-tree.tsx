"use client";
import { AntecedentFamilial } from "@/types";

interface FamilyTreeProps {
  antecedentsFamiliaux: AntecedentFamilial[];
}

type ParentKey =
  | "gp_paternel" | "gm_paternelle"
  | "gp_maternel" | "gm_maternelle"
  | "pere" | "mere"
  | "frere" | "soeur";

const PARENT_LABELS: Record<ParentKey, string> = {
  gp_paternel: "Grand-père\npaternel",
  gm_paternelle: "Grand-mère\npaternelle",
  gp_maternel: "Grand-père\nmaternes",
  gm_maternelle: "Grand-mère\nmaternelle",
  pere: "Père",
  mere: "Mère",
  frere: "Frère",
  soeur: "Sœur",
};

interface NodeData {
  key: ParentKey;
  x: number;
  y: number;
  label: string;
  data: AntecedentFamilial | null;
}

const NODE_W = 110;
const NODE_H = 70;
const SVG_W = 760;
const SVG_H = 340;

// Fixed positions in a 3-row tree layout
const NODES: Array<{ key: ParentKey; x: number; y: number }> = [
  { key: "gp_paternel",   x: 60,  y: 20  },
  { key: "gm_paternelle", x: 200, y: 20  },
  { key: "gp_maternel",   x: 460, y: 20  },
  { key: "gm_maternelle", x: 600, y: 20  },
  { key: "pere",          x: 130, y: 155 },
  { key: "mere",          x: 530, y: 155 },
  { key: "frere",         x: 260, y: 275 },
  { key: "soeur",         x: 390, y: 275 },
];

// Connecting lines between nodes
const LINES: Array<[number, number, number, number]> = [
  // GP paternel → Père
  [115, 90, 185, 155],
  // GM paternelle → Père
  [255, 90, 185, 155],
  // GP maternel → Mère
  [515, 90, 585, 155],
  // GM maternelle → Mère
  [655, 90, 585, 155],
  // Père → patient zone
  [185, 225, 325, 275],
  // Mère → patient zone
  [585, 225, 435, 275],
];

function PersonNode({ node, antecedents }: { node: NodeData; antecedents: AntecedentFamilial[] }) {
  const records = antecedents.filter((a) => a.parent === node.key);
  const isDead = records.some((r) => r.statut_vital === "decede");
  const hasPathology = records.length > 0;

  const bgColor = isDead
    ? "#f1f5f9"
    : hasPathology
    ? "#fef2f2"
    : "#f0fdf4";

  const borderColor = isDead
    ? "#94a3b8"
    : hasPathology
    ? "#fca5a5"
    : "#86efac";

  const textColor = isDead ? "#64748b" : hasPathology ? "#991b1b" : "#166534";

  const isMale = ["gp_paternel", "gp_maternel", "pere", "frere"].includes(node.key);

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Shape: rect for male, ellipse effect for female */}
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={isMale ? 4 : 35}
        fill={bgColor}
        stroke={borderColor}
        strokeWidth={hasPathology ? 2 : 1.5}
      />

      {/* Cross for deceased */}
      {isDead && (
        <>
          <line x1="4" y1="4" x2={NODE_W - 4} y2={NODE_H - 4} stroke="#94a3b8" strokeWidth="1.5" />
          <line x1={NODE_W - 4} y1="4" x2="4" y2={NODE_H - 4} stroke="#94a3b8" strokeWidth="1.5" />
        </>
      )}

      {/* Label */}
      <text
        x={NODE_W / 2}
        y={hasPathology ? 18 : NODE_H / 2 - 6}
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        fill={textColor}
      >
        {PARENT_LABELS[node.key].split("\n").map((line, i) => (
          <tspan key={i} x={NODE_W / 2} dy={i === 0 ? 0 : 12}>
            {line}
          </tspan>
        ))}
      </text>

      {/* Pathologies */}
      {records.slice(0, 2).map((r, i) => (
        <text
          key={r.id}
          x={NODE_W / 2}
          y={hasPathology ? 38 + i * 14 : NODE_H / 2 + 10}
          textAnchor="middle"
          fontSize="9"
          fill="#7f1d1d"
        >
          {r.pathologie.length > 16 ? r.pathologie.slice(0, 14) + "…" : r.pathologie}
        </text>
      ))}
      {records.length > 2 && (
        <text x={NODE_W / 2} y={66} textAnchor="middle" fontSize="9" fill="#7f1d1d">
          +{records.length - 2} autres
        </text>
      )}
    </g>
  );
}

export function FamilyTree({ antecedentsFamiliaux }: FamilyTreeProps) {
  const nodeData: NodeData[] = NODES.map((n) => ({
    ...n,
    label: PARENT_LABELS[n.key],
    data: antecedentsFamiliaux.find((a) => a.parent === n.key) || null,
  }));

  // Patient node center
  const patientX = (SVG_W - NODE_W) / 2;
  const patientY = SVG_H - NODE_H - 10;

  return (
    <div className="overflow-x-auto">
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="min-w-[600px]"
        aria-label="Arbre généalogique médical"
      >
        {/* Connecting lines */}
        {LINES.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />
        ))}

        {/* Lines from parents to siblings/patient */}
        <line x1={185} y1={225} x2={patientX + NODE_W / 2} y2={patientY} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2" />
        <line x1={585} y1={225} x2={patientX + NODE_W / 2} y2={patientY} stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2" />

        {/* Family nodes */}
        {nodeData.map((node) => (
          <PersonNode
            key={node.key}
            node={node}
            antecedents={antecedentsFamiliaux}
          />
        ))}

        {/* Patient node */}
        <g transform={`translate(${patientX}, ${patientY})`}>
          <rect
            width={NODE_W}
            height={NODE_H}
            rx={4}
            fill="#e0f2fe"
            stroke="#0EA5E9"
            strokeWidth={2.5}
          />
          <text x={NODE_W / 2} y={NODE_H / 2 + 5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#0369a1">
            PATIENT
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded border border-red-300 bg-red-50" />
          Pathologie connue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded border border-green-300 bg-green-50" />
          Aucune pathologie signalée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded border border-slate-300 bg-slate-100" />
          Décédé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded-full border border-gray-300 bg-white" />
          Forme ronde = Femme
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-4 rounded border border-gray-300 bg-white" />
          Forme carrée = Homme
        </span>
      </div>
    </div>
  );
}
