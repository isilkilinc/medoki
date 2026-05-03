import { getCachedAnalysis, setCachedAnalysis } from "./supabase";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// ─── Güvenli sabit userExperiences metinleri ─────────────────────────────────
// Model internete bağlı değil — uydurma "kullanıcı yorumu" üretmesini engelliyoruz.
const SAFE_USER_EXPERIENCES = [
  "Kullanıcı deneyimleri kişiden kişiye önemli ölçüde farklılık gösterebilir.",
  "Herhangi bir yan etki veya beklenmedik etki durumunda ilacı bırakıp eczacınıza danışın.",
  "Bu bilgiler gerçek kullanıcı yorumlarına değil, genel tıbbi literatüre dayanmaktadır.",
];

function stripCodeFences(value: string): string {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

async function groqJsonCompletion(userContent: string, maxTokens: number) {
  if (!API_KEY) {
    throw new Error("API anahtarı bulunamadı. VITE_GROQ_API_KEY tanımlı olmalı.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      // llama-3.3-70b-versatile: 8B modeline göre ilaç bilgisinde çok daha güvenilir
      model: "llama-3.3-70b-versatile",
      temperature: 0.1, // Düşük temperature = daha az uydurma
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a highly skilled Turkish Pharmacist with deep knowledge of local Turkish brand names and their active ingredients. You MUST recognize and correctly map the following common Turkish brands to their active compounds: Parol/Calpol → Paracetamol, Arveles → Dexketoprofen, Majezik → Flurbiprofen, Dolven/Ibufen/Nurofen → Ibuprofen, Augmentin → Amoxicillin/Clavulanate, Desmont → Montelukast, Buscopan → Hyoscine, Dikloron → Diclofenac, Voltaren → Diclofenac, Cipro → Ciprofloxacin, Xanax → Alprazolam. Treat vitamins and supplements (Magnesium, Vitamin D, Omega-3) with the same rigor as drugs. Recognize pediatric brands (Calpol, Dolven, Ibufen). ALWAYS format the correctedTerm field as: 'BrandName (ActiveIngredient)' — e.g. 'Calpol (Parasetamol)', 'Augmentin (Amoksisilin/Klavulanat)'. CRITICAL SAFETY RULE: For the 'dosage' field, NEVER invent specific mg amounts or daily frequencies. Instead, always write: 'Doz bilgisi için prospektüsü veya eczacınızı kontrol edin.' You may mention the general form (tablet, kapsül) but NOT specific numbers. Return only valid JSON, no markdown or code fences.",
        },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API hatası (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || "";
  return JSON.parse(stripCodeFences(rawText).trim());
}

export async function recognizeMedicineFromImage(
  base64Image: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg"
): Promise<{ medicineName: string | null; confidence: "high" | "low" | "none" }> {
  if (!API_KEY) throw new Error("API anahtarı bulunamadı.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.1,
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: "text",
              text: `Bu görüntüde bir ilaç kutusu, blister veya ilaç ambalajı var mı?
Varsa yalnızca şu JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "medicineName": "İlacın ticari adı (Türkçe, tam ve doğru)",
  "confidence": "high" | "low" | "none"
}
Kurallar:
- Net okuyabiliyorsan confidence: "high"
- Kısmen görünüyorsa confidence: "low"
- İlaç yoksa veya okuyamıyorsan medicineName: null, confidence: "none"
- ASLA tahmin yürütme — emin değilsen "none" seç
- Sadece ticari adı yaz, açıklama ekleme`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq Vision hatası (${response.status}): ${err}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(stripCodeFences(rawText).trim());
    return {
      medicineName: parsed.medicineName || null,
      confidence: parsed.confidence || "none",
    };
  } catch {
    return { medicineName: null, confidence: "none" };
  }
}

/**
 * AI'nin hafızasında kalan veya hatalı uydurulan eş anlamlıları (örn: Majezik -> Flurbiprofen)
 * yazım hatası (typo) sanmasını engeller. Yalnızca harf dizilimi birbirine benzeyen gerçek
 * klavye hatalarına izin verir.
 */
function isLegitTypo(input: string, suggestion: string): boolean {
  if (!input || !suggestion) return false;
  const i = input.trim().toLowerCase();
  const s = suggestion.trim().toLowerCase();
  if (i === s) return false;

  // Uzunluk farkı çok fazlaysa bu bir yazım hatası olamaz (eş anlamlıdır)
  if (Math.abs(i.length - s.length) > 4) return false;

  // İlk harf tamamen farklıysa büyük ihtimalle eş anlamlı önermesidir (Arveles vs Dexketoprofen)
  const exceptions = ["c", "ç", "s", "ş", "g", "ğ", "o", "ö", "u", "ü", "i", "ı"];
  if (i[0] !== s[0] && !exceptions.includes(i[0])) {
    return false;
  }
  return true;
}

export function normalizeUserExperiences(_raw: unknown): string[] {
  // Güvenlik: Model internete bağlı değil, uydurma yorumlar üretir.
  // Sabit ve doğru bilgi içeren metinler kullanıyoruz.
  return [...SAFE_USER_EXPERIENCES];
}

export interface MedicineResult {
  correctedTerm: string;
  purpose: string;
  dosage: string;
  sideEffects: string[];
  warnings: string[];
  sensitivityWarnings: string[];
  summary: string;
  disclaimer: string;
  userExperiences: string[];
}

export interface SymptomProduct {
  activeIngredient: string;
  brandExamples: string[];
  labelLine: string;
  form: string;
  whyItHelps: string;
  typicalUse: string;
  cautions: string[];
}

export interface SymptomResult {
  correctedTerm: string;
  intro: string;
  products: SymptomProduct[];
  generalTips: string[];
  whenToSeeDoctor: string[];
  disclaimer: string;
  userExperiences: string[];
}

// ─── PharmacyGuard: Tıbbi Doğruluk ve Form Kontrolü ──────────────────────────
const FORBIDDEN_FORMS_BY_SYMPTOM: Record<string, string[]> = {
  "baş ağrısı": ["krem", "jel", "fısfıs", "sprey", "bant", "şurup"],
  "ateş": ["krem", "jel", "bant", "şurup"],
  "halsizlik": ["krem", "jel", "şurup"],
  "regl": ["krem", "jel", "şurup"],
  "diş": ["krem", "jel", "şurup"],
  "kırgınlık": ["krem", "jel", "şurup"],
  "şurup": ["şurup", "likit", "süspansiyon"],
  "mide": ["jel", "krem"],
  "göz": ["tablet", "kapsül"],
};

const BRAND_FORM_DEFAULTS: Record<string, string> = {
  majezik: "Tablet",
  arveles: "Tablet",
  dikloron: "Tablet",
  voltaren: "Tablet",
  parol: "Tablet",
  aprol: "Tablet",
  advil: "Kapsül",
  nurofen: "Tablet",
  dolorex: "Draje",
  dexday: "Efervesan Tablet",
};

function applyPharmacyGuard(product: SymptomProduct, symptom: string): SymptomProduct {
  const s = (symptom || "").toLowerCase();
  let f = product.form || "";
  let use = product.typicalUse || "";

  if (f.toLowerCase().includes("şurup") || f.toLowerCase().includes("süspansiyon")) {
    f = "Tablet";
  }

  for (const [key, forbidden] of Object.entries(FORBIDDEN_FORMS_BY_SYMPTOM)) {
    if (s.includes(key)) {
      const isHallucinated = forbidden.some((fb) => f.toLowerCase().includes(fb));
      if (isHallucinated) {
        const knownBrand = product.brandExamples.find(
          (b) => BRAND_FORM_DEFAULTS[b.toLowerCase()]
        );
        f = knownBrand ? BRAND_FORM_DEFAULTS[knownBrand.toLowerCase()] : "Tablet";
      }
    }
  }

  for (const brand in BRAND_FORM_DEFAULTS) {
    if (
      product.brandExamples.some((b) => b.toLowerCase().includes(brand.toLowerCase()))
    ) {
      if (
        s.includes("baş ağrısı") ||
        s.includes("ateş") ||
        s.includes("regl") ||
        s.includes("diş") ||
        s.includes("halsizlik")
      ) {
        f = BRAND_FORM_DEFAULTS[brand];
      }
    }
  }

  const lowerF = f.toLowerCase();
  if (lowerF.includes("tablet") || lowerF.includes("kapsül")) {
    if (!use.toLowerCase().includes("tablet") && !use.toLowerCase().includes("yutulur")) {
      // ─── Doz güvenliği: Spesifik mg/frekans yazmıyoruz ───────────────────────
      use = "Prospektüste belirtilen yetişkin dozuna göre, tok karnına bol su ile yutulur.";
    }
  } else if (lowerF.includes("krem") || lowerF.includes("jel")) {
    if (!use.toLowerCase().includes("tabaka")) {
      use = "Ağrılı bölgeye ince bir tabaka halinde, hafif masaj yaparak uygulanır.";
    }
  }

  return { ...product, form: f, typicalUse: use };
}

function symptomProductHeadline(p: {
  activeIngredient: string;
  brandExamples: string[];
  name?: string;
}) {
  const ingredient = (p.activeIngredient || p.name || "").trim() || "—";
  const brands = p.brandExamples.filter(Boolean);
  const brandPart =
    brands.length > 0 ? brands.join(", ") : "eczacınıza danışın";
  return `${ingredient} içeren ürünler (Örn: ${brandPart})`;
}

export async function analyzeMedicine(userText: string): Promise<MedicineResult> {
  const cacheKey = `medicine:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<MedicineResult>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }
  console.log(`[Cache MISS] ${cacheKey} → Groq API çağrılıyor`);

  const prompt = `
Kullanıcıdan gelen ilaç adını analiz et: "${userText}"

Yalnızca geçerli JSON döndür. Markdown, ek açıklama, code block kullanma.
JSON şeması:
{
  "correctedTerm": "string",
  "purpose": "string",
  "dosage": "string",
  "sideEffects": ["string", "string", "string"],
  "warnings": ["string", "string", "string"],
  "sensitivityWarnings": ["string", "string"],
  "summary": "string",
  "disclaimer": "string"
}

Kurallar:
- Dil: Türkçe.
- YETİŞKİN ODAKLI ANALİZ: Tüm ilaç formlarını 'Tablet, Kapsül, Draje' gibi yetişkin formlarında ver.
- ASLA şurup, likit veya süspansiyon gibi pediatrik formlar önerme.
- ÖNEMLİ DÖZAJ KURALI: dosage alanına KESİNLİKLE spesifik mg miktarı veya günlük frekans yazma.
  Sadece şunu yaz: "Doz bilgisi için prospektüsü veya eczacınızı kontrol edin."
  Forma ilişkin genel bilgi (tablet, kapsül) ekleyebilirsin ama sayı YASAK.
- correctedTerm: 'BrandName (ActiveIngredient)' formatında döndür.
- summary: Kullanıcı dostu, sade Türkçe yaz.
- sensitivityWarnings: Yaygın alerjenleri ve hayvansal içerikleri tara, '⚠️' ile başlat.
- disclaimer: Her zaman şunu içersin: "Bu bilgiler genel amaçlıdır; doktor veya eczacı tavsiyesinin yerine geçmez. İlaç kullanmadan önce mutlaka prospektüsü okuyun."
- Emin olmadığın bilgide "Prospektüste doğrulayın" yaz.
- Reçete önerme.`.trim();

  const parsed = await groqJsonCompletion(prompt, 1100);

  const correctedTerm = parsed.correctedTerm || userText;
  const purpose = parsed.purpose || "Bilgi alınamadı.";
  // Doz güvenliği: Model yine de mg yazmışsa üzerine yaz
  const rawDosage: string = parsed.dosage || "";
  const dosage = /\d+\s*mg|\d+\s*ml|\d+\s*x/i.test(rawDosage)
    ? "Doz bilgisi için prospektüsü veya eczacınızı kontrol edin."
    : rawDosage || "Doz bilgisi için prospektüsü veya eczacınızı kontrol edin.";

  const result: MedicineResult = {
    correctedTerm,
    purpose,
    dosage,
    sideEffects:
      Array.isArray(parsed.sideEffects) && parsed.sideEffects.length
        ? parsed.sideEffects
        : ["Bilgi alınamadı."],
    warnings:
      Array.isArray(parsed.warnings) && parsed.warnings.length
        ? parsed.warnings
        : ["Bilgi alınamadı."],
    sensitivityWarnings: Array.isArray(parsed.sensitivityWarnings)
      ? parsed.sensitivityWarnings
      : [],
    summary:
      parsed.summary ||
      `${correctedTerm} için hazırlanan analizde, ilacın ${purpose.toLowerCase()} amacıyla kullanıldığı belirlenmiştir.`,
    disclaimer:
      "Bu bilgiler genel amaçlıdır; doktor veya eczacı tavsiyesinin yerine geçmez. İlaç kullanmadan önce mutlaka prospektüsü okuyun.",
    // userExperiences: Model internete bağlı değil, sabit güvenli metinler kullanıyoruz
    userExperiences: normalizeUserExperiences(null),
  };

  void setCachedAnalysis(cacheKey, result);
  return result;
}

// ─── Semptom Doğrulama (3 Aşamalı) ───────────────────────────────────────────
export type SymptomValidationStage = "auto_correct" | "suggestion" | "error";

export interface SymptomValidation {
  stage: SymptomValidationStage;
  correctedTerm?: string;
  suggestion?: string;
}

export async function validateSymptom(userText: string): Promise<SymptomValidation> {
  const cacheKey = `val_sym:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<SymptomValidation>(cacheKey);
  if (cached) return cached;

  const prompt = `Sen katı bir tıbbi doğrulama hakemisin (AI Hakemliği).
Kullanıcı şikayetini/semptomunu şöyle girdi: "${userText}"

EN ÖNEMLİ SORU: 'Bu girdi gerçek bir insan diliyle yazılmış, anlamlı bir sağlık şikayeti mi?'

Zero-Tolerance Policy (Sıfır Tolerans Kuralı):
1. Eğer yukarıdaki soruya cevabın %100 'Evet' değilse, DİREKT olarak 'error' aşamasını seç.
2. ZORLAMA EŞLEŞTİRMEYİ YASAKLA: "dsfgsdg", "asdf" gibi anlamsız dizilerde yakın tahmin yapma.
3. LABORATUVAR verilerini (TSH, WBC, Hemoglobin, B12) semptom analiziyle karıştırma; reddet.
4. Yalnızca gerçek Türkçe tıbbi semptom veya çok bariz küçük harf hatasında "valid" seç.

Yalnızca geçerli JSON döndür:
{
  "stage": "valid" | "error",
  "correctedTerm": "Geçerliyse Tıbbi Literatürdeki Adı (Başlık Büyük Harf), değilse null"
}`;

  try {
    const parsed = await groqJsonCompletion(prompt, 120);
    const stage: SymptomValidationStage =
      parsed.stage === "valid" ? "auto_correct" : "error";
    const result: SymptomValidation = {
      stage,
      correctedTerm: parsed.correctedTerm || undefined,
    };
    void setCachedAnalysis(cacheKey, result);
    return result;
  } catch {
    return { stage: "error" };
  }
}

export async function analyzeSymptom(userText: string): Promise<SymptomResult> {
  // ─── RED FLAG PROTOCOL ────────────────────────────────────────────────────────
  const RED_FLAG_KEYWORDS = [
    "göğüs ağrısı", "gogus agrisi", "gögüs ağrısı", "göğüs sıkışması",
    "kalp krizi", "kalp ağrısı", "kalp çarpıntısı", "çarpıntı",
    "nefes darlığı", "nefes alamıyorum", "nefes alamiyorum",
    "bilinç kaybı", "bayılma", "baygınlık", "bayıldım", "baygın",
    "felç", "inme", "uyuşma yüz", "konuşamıyorum", "konusamiyorum",
    "şiddetli karın ağrısı", "siddetli karin agrisi", "ani karın ağrısı",
    "ciddi kanama", "kanlı idrar", "kan kusma", "kan kusuyor",
  ];

  const normalizedInput = userText.toLowerCase().trim();
  const isRedFlag = RED_FLAG_KEYWORDS.some((kw) => normalizedInput.includes(kw));

  if (isRedFlag) {
    const warning = `KRİTİK UYARI: "${userText}" gibi belirtiler ciddi bir sağlık sorununun (örn: kalp krizi, felç) işareti olabilir. Lütfen hiçbir ilaç kullanmadan DERHAL 112 Acil Çağrı Merkezi'ni arayın veya en yakın acil servise başvurun.`;
    return {
      correctedTerm: userText,
      intro: warning,
      products: [],
      generalTips: [
        "Belirtiler geçmeden hareket etmeyin, yere oturun veya uzanın.",
        "Yanınızdaki birinden 112'yi aramasını isteyin.",
        "Herhangi bir ilaç veya yiyecek almayın.",
      ],
      whenToSeeDoctor: ["DERHAL 112'yi arayın veya en yakın acil servise gidin."],
      disclaimer:
        "Bu mesaj otomatik bir güvenlik uyarısıdır. Lütfen tıbbi acil durumda zaman kaybetmeden yardım isteyin.",
      userExperiences: [],
    };
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const cacheKey = `symptom:${normalizedInput}`;
  const cached = await getCachedAnalysis<SymptomResult>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }
  console.log(`[Cache MISS] ${cacheKey} → Groq API çağrılıyor`);

  const prompt = `
Kullanıcının şikayeti / semptomu: "${userText}"

⚠️ RED FLAG PROTOKOLÜ (AI Katmanı):
Göğüs ağrısı, nefes darlığı, kalp krizi şüphesi, bilinç kaybı, felç belirtisi,
şiddetli/ani karın ağrısı → products dizisini BOŞ bırak, intro'ya acil yönlendirme yaz.

Bu semptoma yönelik SADECE reçetesiz (OTC) seçenekler öner.
Reçeteli ilaç, antibiyotik veya kontrollü madde ÖNERME.

Aşağıdaki JSON şemasına tam uygun şekilde yanıt ver. Yalnızca geçerli JSON döndür:
{
  "correctedTerm": "string",
  "intro": "string",
  "products": [
    {
      "activeIngredient": "string",
      "brandExamples": ["string", "string"],
      "form": "string",
      "whyItHelps": "string",
      "typicalUse": "string",
      "cautions": ["string", "string"]
    }
  ],
  "generalTips": ["string", "string", "string"],
  "whenToSeeDoctor": ["string", "string", "string"],
  "disclaimer": "string"
}

Kurallar:
- Dil: Türkçe.
- YETİŞKİN ODAKLI: ASLA şurup veya pediatrik form önerme.
- DÖZAJ KURALI: typicalUse alanına KESİNLİKLE spesifik mg veya günlük frekans yazma.
  Şunu yaz: "Prospektüste belirtilen yetişkin dozuna göre kullanın."
- correctedTerm: 'Semptom (Tıbbi Karşılığı)' formatında döndür.
- 3 ila 5 ürün öner.
- Mide/sindirim şikayetlerinde NSAİİ önerme.
- disclaimer: "Bu bilgiler genel amaçlıdır; doktor veya eczacı tavsiyesinin yerine geçmez." içersin.`.trim();

  const parsed = await groqJsonCompletion(prompt, 1600);
  const products = Array.isArray(parsed.products) ? parsed.products : [];

  const correctedTerm = parsed.correctedTerm || userText;
  const result: SymptomResult = {
    correctedTerm,
    intro:
      parsed.intro ||
      `${correctedTerm} şikayeti için değerlendirme sonuçları aşağıda listelenmiştir.`,
    products: products.map((p: { activeIngredient?: string; name?: string; brandExamples?: string[]; typicalUse?: string; form?: string; whyItHelps?: string; cautions?: string[] }) => {
      const activeIngredient = (p.activeIngredient || p.name || "").trim();
      const brandExamples = Array.isArray(p.brandExamples)
        ? p.brandExamples.map((b: string) => String(b).trim()).filter(Boolean)
        : [];
      // typicalUse doz güvenliği: spesifik mg/frekans varsa üzerine yaz
      const rawUse: string = p.typicalUse || "";
      const safeUse = /\d+\s*mg|\d+\s*ml|\d+\s*x|\d+\s*tablet/i.test(rawUse)
        ? "Prospektüste belirtilen yetişkin dozuna göre kullanın."
        : rawUse;
      const baseProduct: SymptomProduct = {
        activeIngredient,
        brandExamples,
        labelLine: symptomProductHeadline({ activeIngredient, brandExamples, name: p.name }),
        form: p.form || "",
        whyItHelps: p.whyItHelps || "",
        typicalUse: safeUse,
        cautions: Array.isArray(p.cautions) ? p.cautions : [],
      };
      return applyPharmacyGuard(baseProduct, userText);
    }),
    generalTips:
      Array.isArray(parsed.generalTips) && parsed.generalTips.length
        ? parsed.generalTips
        : ["Genel öneri alınamadı; eczacınıza danışın."],
    whenToSeeDoctor:
      Array.isArray(parsed.whenToSeeDoctor) && parsed.whenToSeeDoctor.length
        ? parsed.whenToSeeDoctor
        : ["Belirtiler şiddetlenirse veya uzun sürerse doktora başvurun."],
    disclaimer:
      "Bu bilgiler genel amaçlıdır; doktor veya eczacı tavsiyesinin yerine geçmez. İlaç kullanmadan önce mutlaka prospektüsü okuyun.",
    // userExperiences: Sabit güvenli metinler (model internete bağlı değil)
    userExperiences: normalizeUserExperiences(null),
  };

  void setCachedAnalysis(cacheKey, result);
  return result;
}

export async function checkTypo(userText: string): Promise<string | null> {
  if (!userText || userText.length < 3) return null;

  const cacheKey = `typo:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<string | null>(cacheKey);
  if (cached !== null && cached !== undefined) return cached;

  const prompt = `Kullanıcı şu tıbbi terimi/ilacı arattı: "${userText}".
Yalnızca geçerli JSON döndür. Eğer kelimede bariz bir harf/yazım hatası varsa düzeltilmiş halini "suggestion" alanına yaz. Eğer hata yoksa veya emin değilsen "suggestion" alanını null bırak.
ÖNEMLİ KURALLAR:
1. Öneri yaparken sadece GERÇEK (piyasada var olan) kelimeleri referans al.
2. Girdi, önereceğin kelimeyle %80-90 oranında uyuşmuyorsa null dön.
3. Girdi zaten doğru yazılmış bir ilaç isiyse (Majezik, Parol, Aferin): null dön.
4. TİCARİ MARKA - ETKEN MADDE dönüşümü YASAK: "Majezik" → "Flurbiprofen" gibi öneri yapma.
JSON şeması:
{
  "suggestion": "düzeltilmiş kelime veya null"
}`;
  try {
    const parsed = await groqJsonCompletion(prompt, 50);
    let result = parsed.suggestion || null;
    if (result && !isLegitTypo(userText, result)) {
      result = null;
    }
    void setCachedAnalysis(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export interface MedicineValidation {
  isValid: boolean;
  isTypo: boolean;
  isSymptom: boolean;
  suggestion: string | null;
}

export async function validateMedicine(userText: string): Promise<MedicineValidation> {
  const cacheKey = `val_med:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<MedicineValidation>(cacheKey);
  if (cached) return cached;

  const prompt = `Sen Türkiye'deki eczanelere ve tıp literatürüne son derece hakim bir uzmansın.
Kullanıcı şu metni girdi: "${userText}"

Yalnızca geçerli JSON döndür:
{
  "inputType": "medicine" | "symptom" | "invalid",
  "isValid": boolean,
  "isTypo": boolean,
  "isSymptom": boolean,
  "suggestion": "string veya null"
}

━━━ inputType nasıl belirlenir ━━━
"medicine" → İlaç ticari adı, etken madde adı, vitamin/takviye adı.
"symptom"  → Fiziksel şikayet: baş ağrısı, mide bulantısı, ateş vb. → isSymptom:true, isValid:false, suggestion:null
"invalid"  → Anlamsız karakter dizisi veya LAB değeri (TSH, WBC, Hemoglobin) → isValid:false

━━━ Diğer alanlar ━━━
isValid: inputType "medicine" ve yazım hatası yoksa true.
isTypo: SADECE bariz HARF HATASI varsa true. Marka ↔ etken madde dönüşümü YASAK.
suggestion: isTypo:true ise düzeltilmiş ilaç adı, aksi halde null.

Örnekler:
"Majezik" → inputType:"medicine", isValid:true, isTypo:false, isSymptom:false, suggestion:null
"baş ağrısı" → inputType:"symptom", isValid:false, isTypo:false, isSymptom:true, suggestion:null
"asdfg" → inputType:"invalid", isValid:false, isTypo:false, isSymptom:false, suggestion:null`;

  try {
    const parsed = await groqJsonCompletion(prompt, 150);
    const result: MedicineValidation = {
      isValid: parsed.isValid === true,
      isTypo: parsed.isTypo === true,
      isSymptom: parsed.isSymptom === true,
      suggestion: parsed.suggestion || null,
    };

    if (result.isTypo && result.suggestion && !isLegitTypo(userText, result.suggestion)) {
      result.isTypo = false;
      result.suggestion = null;
      result.isValid = true;
    }

    void setCachedAnalysis(cacheKey, result);
    return result;
  } catch {
    return { isValid: true, isTypo: false, isSymptom: false, suggestion: null };
  }
}

export interface InteractionResult {
  hasCriticalInteraction: boolean;
  pairs: {
    drug1: string;
    drug2: string;
    severity: "major" | "moderate" | "minor";
    description: string;
    recommendation: string;
  }[];
  generalWarning: string;
  disclaimer: string;
}

export async function checkDrugInteractions(
  medicines: string[],
  language: "tr" | "en" = "tr"
): Promise<InteractionResult> {
  if (medicines.length < 2) {
    return {
      hasCriticalInteraction: false,
      pairs: [],
      generalWarning: language === "tr"
        ? "Etkileşim kontrolü için en az 2 ilaç giriniz."
        : "Please enter at least 2 medicines for interaction check.",
      disclaimer: language === "tr"
        ? "Bu bilgiler genel amaçlıdır; doktor veya eczacı tavsiyesinin yerine geçmez."
        : "This information is for general purposes only and does not replace medical advice.",
    };
  }

  const prompt = `Analyze possible interactions between these medicines: ${medicines.join(", ")}

Respond in ${language === "tr" ? "Turkish" : "English"}.
Return ONLY valid JSON, no markdown, no explanation:
{"hasCriticalInteraction":false,"pairs":[{"drug1":"string","drug2":"string","severity":"major","description":"string","recommendation":"string"}],"generalWarning":"string","disclaimer":"string"}

Rules:
- Only include real evidence-based interactions
- severity must be exactly one of: major, moderate, minor
- If no interaction exists, return empty pairs array
- Never fabricate interactions`;

  if (!API_KEY) throw new Error("API anahtarı bulunamadı.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 1200,
      messages: [
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq hatası (${response.status}): ${err}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(stripCodeFences(rawText).trim());
    return {
      hasCriticalInteraction: parsed.hasCriticalInteraction === true,
      pairs: Array.isArray(parsed.pairs) ? parsed.pairs : [],
      generalWarning: parsed.generalWarning || (language === "tr"
        ? "Listelenen ilaçlar arasında bilinen bir etkileşim tespit edilmedi."
        : "No known interaction detected."),
      disclaimer: language === "tr"
        ? "Bu bilgiler genel amaçlıdır; doktor veya eczacı tavsiyesinin yerine geçmez."
        : "This information is for general purposes only.",
    };
  } catch {
    throw new Error("Yanıt işlenemedi.");
  }
}
export interface ProspectusResult {
  medicineName: string;
  activeIngredient: string;
  indications: string[];
  dosage: string;
  sideEffects: string[];
  contraindications: string[];
  warnings: string[];
  disclaimer: string;
}

export async function analyzeProspectus(
  base64Pdf: string,
  language: "tr" | "en" = "tr"
): Promise<ProspectusResult> {
  if (!API_KEY) throw new Error("API anahtarı bulunamadı.");

  // 1. Adım: PDF'i metne çevir (pdfjs-dist yerine basit base64 decode)
  const binaryStr = atob(base64Pdf);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // PDF'den metin çıkar — basit regex ile
  const textDecoder = new TextDecoder("latin1");
  const rawText = textDecoder.decode(bytes);
  
  // PDF içindeki okunabilir metni çek
  const textMatches = rawText.match(/\(([^)]{3,})\)/g) || [];
  const extractedText = textMatches
    .map(m => m.slice(1, -1))
    .filter(t => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(t))
    .join(" ")
    .slice(0, 8000); // Groq token limiti için kırp

  if (!extractedText || extractedText.length < 100) {
    throw new Error("PDF'den metin çıkarılamadı. Lütfen metin tabanlı bir PDF yükleyin (taranmış görüntü değil).");
  }

  // 2. Adım: Groq'a metin olarak gönder
  const prompt = `Aşağıdaki metin bir ilaç prospektüsünden alınmıştır. SADECE bu metinde yazan bilgileri kullan, hiçbir şey uydurma. Belgede bulunmayan bilgiler için "Prospektüste belirtilmemiş." yaz.

Tüm metin ${language === "tr" ? "Türkçe" : "İngilizce"} olsun. Yalnızca geçerli JSON döndür:
{
  "medicineName": "string",
  "activeIngredient": "string", 
  "indications": ["string", "string"],
  "dosage": "string",
  "sideEffects": ["string", "string", "string"],
  "contraindications": ["string", "string"],
  "warnings": ["string", "string"],
  "disclaimer": "Bu bilgiler yüklenen prospektüsten alınmıştır. Doktor veya eczacınıza danışmadan ilaç kullanmayın."
}

Prospektüs metni:
${extractedText}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq hatası (${response.status}): ${err}`);
  }

  const data = await response.json();
  const rawResponse = data?.choices?.[0]?.message?.content || "";

  try {
    const cleaned = stripCodeFences(rawResponse).trim();
    // JSON bloğunu bul
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON bulunamadı");
    return JSON.parse(jsonMatch[0]);
  } catch {
    // Model JSON döndüremediyse ham metni parse et
    throw new Error("PDF analiz edilemedi. PDF metin tabanlı olmalı (taranmış görüntü değil). TİTCK'tan indirilen PDF'ler genellikle çalışır.");
  }
