import { useRef, useState } from "react";
import { recognizeMedicineFromImage } from "../lib/groq";

interface Props {
  onResult: (medicineName: string) => void;
}

export function ImageScanButton({ onResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(file: File) {
    setStatus("loading");
    setErrorMsg("");

    try {
      // Dosyayı base64'e çevir
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // "data:image/jpeg;base64,..." → sadece base64 kısmı
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp";
      const { medicineName, confidence } = await recognizeMedicineFromImage(base64, mimeType);

      if (!medicineName || confidence === "none") {
        setErrorMsg("İlaç kutusu okunamadı. Lütfen daha net bir fotoğraf deneyin.");
        setStatus("error");
        return;
      }

      if (confidence === "low") {
        // Düşük güvende kullanıcıya sor
        const confirmed = window.confirm(
          `"${medicineName}" ilacı mı arıyorsunuz? Onaylamak için Tamam'a basın.`
        );
        if (!confirmed) {
          setStatus("idle");
          return;
        }
      }

      setStatus("idle");
      onResult(medicineName); // Ana arama akışına ilet
    } catch (err) {
      console.error(err);
      setErrorMsg("Bir hata oluştu. Tekrar deneyin.");
      setStatus("error");
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment" // Mobilde direkt arka kamerayı açar
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = ""; // Aynı fotoğrafı tekrar seçebilmek için sıfırla
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === "loading"}
        style={{ /* mevcut buton stilinle eşleştir */ }}
      >
        {status === "loading" ? "Tanınıyor..." : "📷 Fotoğrafla Ara"}
      </button>

      {status === "error" && (
        <p style={{ color: "red", fontSize: 13, marginTop: 6 }}>{errorMsg}</p>
      )}
    </div>
  );
}
