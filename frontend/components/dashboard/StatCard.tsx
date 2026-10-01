import { LucideIcon } from "lucide-react";

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  blue:   { bg: "bg-blue-50",    text: "text-blue-600",    ring: "ring-blue-100" },
  green:  { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  purple: { bg: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-100" },
  red:    { bg: "bg-rose-50",    text: "text-rose-600",    ring: "ring-rose-100" },
  indigo: { bg: "bg-indigo-50",  text: "text-indigo-600",  ring: "ring-indigo-100" },
  yellow: { bg: "bg-amber-50",   text: "text-amber-600",   ring: "ring-amber-100" },
  teal:   { bg: "bg-teal-50",    text: "text-teal-600",    ring: "ring-teal-100" },
};

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: StatCardProps) {
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className="card hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">
            {title}
          </p>
          <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-1 truncate">
            {value}
          </p>
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${c.bg} ${c.text} ring-1 ${c.ring}`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
}