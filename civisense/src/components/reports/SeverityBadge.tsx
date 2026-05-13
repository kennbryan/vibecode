import { Badge } from "@/components/ui/badge";
import { SEVERITY_CONFIG } from "@/lib/constants";
import type { ReportSeverity } from "@/types/report";

type SeverityBadgeProps = {
  severity: ReportSeverity;
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];

  return (
    <Badge className="border-transparent text-white" style={{ backgroundColor: config.color }}>
      {config.label}
    </Badge>
  );
}
