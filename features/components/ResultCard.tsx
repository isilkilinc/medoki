import { ReactNode } from "react";
import { Pill, AlertTriangle, Activity, FileText, Info, Beaker } from "lucide-react";

const ICON_MAP: Record<string, ReactNode> = {
  "kullanılır": <Pill className="w-5 h-5 text-primary" />,
  "doz": <Beaker className="w-5 h-5 text-primary" />,
  "yan etki": <Activity className="w-5 h-5 text-destructive" />,
  "uyarı": <AlertTriangle className="w-5 h-5 text-destructive" />,
  "hassasiyet": <AlertTriangle className="w-5 h-5 text-destructive" />,
  "özet": <FileText className="w-5 h-5 text-primary" />,
  "not": <Info className="w-5 h-5 text-muted-foreground" />,
};

function getIcon(title: string): ReactNode {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return <FileText className="w-5 h-5 text-primary" />;
}

interface ResultCardProps {
  title: string;
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ResultCard = ({ title, children, muted, className = "", style }: ResultCardProps) => (
  <article className={`result-card ${muted ? "opacity-80" : ""} ${className}`} style={style}>
    <div className="flex items-center gap-2.5 mb-2">
      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-muted/60 border border-border shrink-0">
        {getIcon(title)}
      </span>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
    </div>
    {children}
  </article>
);

export default ResultCard;
