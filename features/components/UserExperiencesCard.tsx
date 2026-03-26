import { Users } from "lucide-react";

interface UserExperiencesCardProps {
  items: string[];
  style?: React.CSSProperties;
}

const UserExperiencesCard = ({ items, style }: UserExperiencesCardProps) => (
  <article className="result-card result-card-ux animate-fade-in-up" style={style}>
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/25 shrink-0">
        <Users className="w-5 h-5 text-primary" />
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-primary">
        Topluluk Analizi
      </span>
    </div>
    <h3 className="text-sm font-bold mb-2 text-foreground mt-0">
      Kullanıcı Deneyimleri (Genel Özet)
    </h3>
    <ul className="list-disc pl-5 text-foreground/75 grid gap-1.5 mb-3 text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
    <p className="text-xs text-muted-foreground leading-snug m-0">
      Bu bilgiler internetteki genel kullanıcı yorumlarından derlenmiştir, tıbbi tavsiye değildir.
    </p>
  </article>
);

export default UserExperiencesCard;
