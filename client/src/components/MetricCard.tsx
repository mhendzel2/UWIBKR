import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  valueColor?: string;
  subtitleColor?: string;
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-blue-400",
  valueColor = "text-dark-100",
  subtitleColor = "text-green-400",
}: MetricCardProps) {
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-dark-400">{title}</h3>
        <i className={cn(icon, iconColor)}></i>
      </div>
      <div className={cn("text-2xl font-bold font-mono", valueColor)}>
        {value}
      </div>
      {subtitle && (
        <div className={cn("text-sm mt-1", subtitleColor)}>
          {subtitle}
        </div>
      )}
    </div>
  );
}
