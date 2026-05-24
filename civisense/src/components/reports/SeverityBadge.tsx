import { Badge } from "@/components/ui/badge";
import { REPORT_TYPE_CONFIG, SEVERITY_CONFIG } from "@/lib/constants";
import type { FloodReport, ReportSeverity } from "@/types/report";

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

type ReportTypeBadgeProps = {
  report: FloodReport;
};

export function ReportTypeBadge({ report }: ReportTypeBadgeProps) {
  if (report.report_type === "river") {
    const config = REPORT_TYPE_CONFIG.river;
    return (
      <Badge className="border-transparent text-white" style={{ backgroundColor: config.color }}>
        {config.label}
      </Badge>
    );
  }

  const config = SEVERITY_CONFIG[report.severity];
  return (
    <Badge className="border-transparent text-white" style={{ backgroundColor: config.color }}>
      {config.label}
    </Badge>
  );
}
