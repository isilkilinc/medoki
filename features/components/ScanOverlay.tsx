import { recognizeMedicineFromImage } from "../lib/groq";
import { useState, useRef, useEffect } from "react";
import { X, Pill, Barcode, ScanLine } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface ScanOverlayProps {
  onClose: () => void;
  onScan: (text: string) => void;
}

export default function ScanOverlay({ onClose, onScan }: ScanOverlayProps) {
  const { t } = useLanguage();
const [input, setInput] = useState("");
const [isScanning, setIsScanning] = useState(false);
const [isPhotoLoading, setIsPhotoLoading] = useState(false);
const inputRef = useRef<HTMLInputElement>(null);
const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isScanning) return;
    
    setIsScanning(true);
    
    setTimeout(() => {
      onScan(text);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[45] pb-[80px] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl animate-fade-in-up">
      {/* Close button */}
      <button 
        onClick={onClose}
        className="absolute top-[max(1.5rem,env(safe-area-inset-top)+0.5rem)] left-4 sm:left-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-background/90 text-foreground hover:bg-muted transition-colors border border-border/80 z-[60] shadow-lg backdrop-blur-md cursor-pointer active:scale-95 font-semibold text-sm"
        aria-label="Kapat"
      >
        <X className="w-5 h-5" />
        Kapat
      </button>

      {/* Frame Scanner UI */}
      <div className="relative mb-12 w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
        {/* Glow behind frame */}
        <div className="absolute inset-0 bg-primary/10 rounded-[2rem] blur-[50px] pointer-events-none"></div>
        
        {/* Actual Frame: glowing corners using app's primary neon mint */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-primary rounded-tl-3xl shadow-[-8px_-8px_20px_rgba(52,211,153,0.3)]"></div>
        <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-primary rounded-tr-3xl shadow-[8px_-8px_20px_rgba(52,211,153,0.3)]"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-primary rounded-bl-3xl shadow-[-8px_8px_20px_rgba(52,211,153,0.3)]"></div>
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-primary rounded-br-3xl shadow-[8px_8px_20px_rgba(52,211,153,0.3)]"></div>
        
        {/* Scanning Laser Animation */}
        <div className={`absolute top-0 left-3 right-3 h-1 bg-primary shadow-[0_0_20px_5px_rgba(52,211,153,0.8)] ${isScanning ? 'animate-[scan_1s_ease-in-out_infinite]' : 'opacity-0'} pointer-events-none rounded-full`}></div>
        
        {/* Placeholder Medicine & Barcode */}
        <div className={`text-primary/50 flex flex-col items-center transition-all duration-500 scale-95 ${isScanning ? 'animate-pulse text-primary/80' : ''}`}>
          <Pill className="w-16 h-16 mb-3 stroke-[1.5]" />
          <Barcode className="w-20 h-10 stroke-[1.5]" />
        </div>
      </div>

      {/* Input and Scan logic */}
      <div className="w-full max-w-[400px] px-6">
        <form onSubmit={handleScan} className="flex flex-col gap-4 relative z-10 w-full">
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Barkod numarası yazın"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isScanning}
            className="w-full px-5 py-4 rounded-2xl border-2 border-border/80 bg-card/80 focus:bg-background text-foreground placeholder:text-muted-foreground/60 outline-none backdrop-blur-md transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] text-center disabled:opacity-50 text-sm sm:text-base font-medium"
          />
          <button 
            type="submit"
            disabled={isScanning || !input.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(52,211,153,0.35)] hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2.5"
          >
            {isScanning ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {t("scan.analyzing")}
              </>
            ) : (
              <>
                <ScanLine className="w-5 h-5" />
                {t("scan.button")}
              </>
            )}
          </button>
        </form>
        {/* Fotoğrafla Ara */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = "";
            if (file.size > 1_000_000) {
              alert("Lütfen 1MB altında bir fotoğraf seçin.");
              return;
            }
            setIsPhotoLoading(true);
            try {
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
              const { medicineName, confidence } = await recognizeMedicineFromImage(base64, mimeType);
              if (!medicineName || confidence === "none") {
                alert("İlaç kutusu okunamadı. Daha net bir fotoğraf deneyin.");
                return;
              }
              if (confidence === "low") {
                const confirmed = window.confirm(`"${medicineName}" ilacı mı arıyorsunuz?`);
                if (!confirmed) return;
              }
              onScan(medicineName);
            } catch {
              alert("Bir hata oluştu. Tekrar deneyin.");
            } finally {
              setIsPhotoLoading(false);
            }
          }}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={isScanning || isPhotoLoading}
          className="w-full py-4 rounded-2xl border-2 border-primary/40 bg-transparent text-primary font-bold text-lg cursor-pointer transition-all hover:bg-primary/10 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2.5 mt-2"
        >
          {isPhotoLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Tanınıyor...
            </>
          ) : (
            <>
              📷 Fotoğrafla Ara
            </>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 5%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
