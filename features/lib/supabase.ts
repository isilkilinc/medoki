import { createClient } from "@supabase/supabase-js";

// ─── Client ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    `[Medoki] Supabase ortam değişkenleri EKSİK!
     VITE_SUPABASE_URL algılanan: "${SUPABASE_URL || 'BOŞ/UNDEFINED'}"
     VITE_SUPABASE_ANON_KEY algılanan: "${SUPABASE_ANON_KEY ? 'VAR' : 'BOŞ/UNDEFINED'}"
    `
  );
} else {
  console.log("[Medoki] Supabase ortam değişkenleri başarıyla yüklendi.");
}

// URL boş olunca createClient anında hata fırlatıp tüm web sitesini (siyah ekrana) çökertiyordu.
// Eğer ortam değişkeni henüz Vercel'e eklenmemişse uygulamanın çökmemesi için geçici bir dummy URL veriyoruz.
// Fonksiyonların içindeki (!SUPABASE_URL) kontrolü sayesinde bu dummy URL'ye hiçbir zaman istek atılmayacak.
export const supabase = createClient(
  SUPABASE_URL || "https://dummy.supabase.co", 
  SUPABASE_ANON_KEY || "dummy"
);

// ─── Tablo sabiti ─────────────────────────────────────────────────────────────
const TABLE = "cached_analyses";

// ─── Cache tipi ───────────────────────────────────────────────────────────────
interface CacheRow {
  query_text: string;
  response_data: unknown;
}

// ─── Normalize: arama terimlerini küçük harf + trim ile standartlaştır ────────
function normalizeKey(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Supabase'den önbelleğe alınmış sonucu getir.
 * @returns Kayıtlı `response_data` veya `null` (bulunamazsa).
 */
export async function getCachedAnalysis<T>(queryText: string): Promise<T | null> {
  console.log('Supabase Okuma Denemesi:', queryText);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[Supabase Cache] VITE_SUPABASE_URL eksik, okuma atlandı.");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("response_data")
      .eq("query_text", normalizeKey(queryText))
      .maybeSingle();

    if (error) {
      console.warn("[Supabase Cache] Okuma hatası:", error.message);
      return null;
    }

    if (data) {
      console.log(`[Supabase Cache] Veri bulundu:`, queryText);
    } else {
      console.log(`[Supabase Cache] Veri bulunamadı:`, queryText);
    }

    return (data as CacheRow | null)?.response_data as T ?? null;
  } catch (err) {
    console.warn("[Supabase Cache] Beklenmeyen hata:", err);
    return null;
  }
}

/**
 * Analiz sonucunu Supabase önbelleğine yaz.
 * Aynı `query_text` zaten varsa üzerine yazar (upsert).
 */
export async function setCachedAnalysis(
  queryText: string,
  responseData: unknown
): Promise<void> {
  console.log('Supabase Kayıt Denemesi:', queryText);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[Supabase Cache] VITE_SUPABASE_URL eksik, kayıt atlandı.");
    return;
  }

  try {
    const { error } = await supabase.from(TABLE).upsert(
      {
        query_text: normalizeKey(queryText),
        response_data: responseData,
      } satisfies CacheRow,
      { onConflict: "query_text" }
    );

    if (error) {
      console.warn("[Supabase Cache] Yazma hatası oluştu:", error.message, error.details, error.hint);
    } else {
      console.log("[Supabase Cache] Başarıyla kaydedildi:", queryText);
    }
  } catch (err) {
    console.warn("[Supabase Cache] Beklenmeyen hata:", err);
  }
}
