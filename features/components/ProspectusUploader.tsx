import { useRef, useState } from "react";
import { analyzeProspectus, ProspectusResult } from "../lib/groq";
import { Upload, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function ProspectusUploader() {
  const { language } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProspectusResult | null>(null);
  const [fileName, setFileName] = useState("");

  async function handleFile(file: File) {
    setError("");
    setResult(null);

    if (file.type !== "application/pdf") {
      setError("Lütfen PDF formatında bir prospektüs yükleyin.");
      return;
    }

    if (file.size > 5_000_000) {
      setError("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await analyzeProspectus(base64, language);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-foreground mb-2">Prospektüs Analizi</h2>
      <p className="text-sm text-muted-foreground mb-6">
        TİTCK'tan indirdiğiniz ilaç prospektüsünü yükleyin, gerçek bilgilerle analiz edelim.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {/* Upload alanı */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isLoading}
        className="w-full py-8 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-card/60 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-40"
      >
        {isLoading ? (
          <>
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Prospektüs okunuyor...</span>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-primary/60" />
            <span className="text-sm font-medium text-foreground">PDF Prospektüs Yükle</span>
            <span className="text-xs text-muted-foreground">Maks. 5MB</span>
          </>
        )}
      </button>

      {fileName && !isLoading && (
        <div className="flex items-center gap-2 mt-3 px-1">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">{fileName}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Sonuç */}
      {result && (
        <div className="mt-8 flex flex-col gap-4">
          {/* Başlık */}
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-green-500/30 bg-green-500/10">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{result.medicineName}</p>
              <p className="text-sm text-muted-foreground">{result.activeIngredient}</p>
            </div>
          </div>

          {/* Endikasyonlar */}
          <Section title="Kullanım Alanları" items={result.indications} />

          {/* Doz */}
          <div className="p-4 rounded-2xl border border-border bg-card/60">
            <h3 className="text-sm font-medium text-foreground mb-2">Dozaj</h3>
            <p className="text-sm text-muted-foreground">{result.dosage}</p>
          </div>

          {/* Yan etkiler */}
          <Section title="Yan Etkiler" items={result.sideEffects} color="amber" />

          {/* Kontrendikasyonlar */}
          <Section title="Kullanılmaması Gereken Durumlar" items={result.contraindications} color="red" />

          {/* Uyarılar */}
          <Section title="Uyarılar" items={result.warnings} color="orange" />

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground text-center px-4 mt-2">
            {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  color = "default",
}: {
  title: string;
  items: string[];
  color?: "amber" | "red" | "orange" | "default";
}) {
  const colorMap = {
    amber: "border-yellow-500/30 bg-yellow-500/10",
    red: "border-red-500/30 bg-red-500/10",
    orange: "border-orange-500/30 bg-orange-500/10",
    default: "border-border bg-card/60",
  };

  return (
    <div className={`p-4 rounded-2xl border ${colorMap[color]}`}>
      <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
