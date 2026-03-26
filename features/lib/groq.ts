const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

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
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a careful medical information assistant. Return only valid JSON, no markdown or code fences." },
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

export function normalizeUserExperiences(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw.map((s) => String(s).trim()).filter(Boolean) : [];
  const fallbacks = [
    "İnternetteki yorumlar kişiden kişiye farklılık gösterebilir.",
    "Bazı kullanıcılar etkiyi hızlı hissettiklerini yazıyor; herkes için geçerli değildir.",
    "Yan etki veya rahatsızlık bildiren yorumlar da sık görülür; şüphede uzmana danışın.",
  ];
  const out = [...list];
  let i = 0;
  while (out.length < 3 && i < fallbacks.length) {
    if (!out.includes(fallbacks[i])) out.push(fallbacks[i]);
    i += 1;
  }
  return out.slice(0, 3);
}

export interface MedicineResult {
  correctedTerm: string;
  purpose: string;
  dosage: string;
  sideEffects: string[];
  warnings: string[];
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

function symptomProductHeadline(p: { activeIngredient: string; brandExamples: string[]; name?: string }) {
  const ingredient = (p.activeIngredient || p.name || "").trim() || "—";
  const brands = p.brandExamples.filter(Boolean);
  const brandPart = brands.length > 0 ? brands.join(", ") : "eczacınıza danışın";
  return `${ingredient} içeren ürünler (Örn: ${brandPart})`;
}

export async function analyzeMedicine(userText: string): Promise<MedicineResult> {
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
  "summary": "string",
  "disclaimer": "string",
  "userExperiences": ["string", "string", "string"]
}

Kurallar:
- Dil: Türkçe.
- ÖNEMLİ: Kullanıcının girdiği metindeki bariz yazım hatalarını veya argoları (örn. "reg" -> "regl") otomatik olarak doğru ve profesyonel tıbbi terime çevir.
- Sonucun özetini (summary) ve tüm açıklamalarını mutlaka bu düzeltilmiş, profesyonel tıbbi terimi kullanarak oluştur.
- Bilimsel doğruluk öncelikli, ama sade ve anlaşılır yaz.
- Emin olmadığın bilgi varsa "Prospektüste doğrulayın" gibi net uyarı ekle.
- Reçete önerme; sadece genel bilgilendirme yap.
- userExperiences: İnternet forumları ve kullanıcı yorumlarında bu ilaçla ilişkilendirilen yaygın temaları 3 kısa maddeyle özetle.`.trim();

  const parsed = await groqJsonCompletion(prompt, 1100);

  return {
    correctedTerm: parsed.correctedTerm || userText,
    purpose: parsed.purpose || "Bilgi alınamadı.",
    dosage: parsed.dosage || "Bilgi alınamadı.",
    sideEffects: Array.isArray(parsed.sideEffects) && parsed.sideEffects.length ? parsed.sideEffects : ["Bilgi alınamadı."],
    warnings: Array.isArray(parsed.warnings) && parsed.warnings.length ? parsed.warnings : ["Bilgi alınamadı."],
    summary: parsed.summary || "Bilgi alınamadı.",
    disclaimer: parsed.disclaimer || "Bu çıktı genel bilgilendirme içindir; doktor veya eczacı önerisinin yerine geçmez.",
    userExperiences: normalizeUserExperiences(parsed.userExperiences),
  };
}

export async function analyzeSymptom(userText: string): Promise<SymptomResult> {
  const prompt = `
Kullanıcının şikayeti / semptomu: "${userText}"

Bu semptoma yönelik yalnızca reçetesiz (OTC) seçenekler öner. Reçeteli ilaç, antibiyotik veya kontrollü madde önerme.

Her öneride yalnızca etken madde adını tek başına yazma: Türkiye'de eczanede en yaygın bilinen ticari marka örneklerini de ver.

Yalnızca geçerli JSON döndür. Markdown, ek açıklama, code block kullanma.
JSON şeması:
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
  "disclaimer": "string",
  "userExperiences": ["string", "string", "string"]
}

Kurallar:
- Dil: Türkçe.
- ÖNEMLİ: Kullanıcının girdiği metindeki bariz tıbbi yazım hatalarını veya argoları (örn. "reg" -> "regl", "başş" -> "baş ağrısı") otomatik olarak doğru ve profesyonel tıbbi terime çevir.
- "intro" metnini ve geri kalan tüm açıklamaları mutlaka bu düzeltilmiş, profesyonel tıbbi terimi kullanarak oluştur.
- 3 ila 5 arası ürün öner.
- Her products öğesinde activeIngredient ve brandExamples (en az 2 marka) zorunlu.
- Hamilelik, kronik hastalık, çocuk, alerji gibi durumlarda mutlaka eczacı/doktor uyarısı yaz.
- userExperiences: Bu semptom veya önerilen OTC ürünlerle ilgili internetteki kullanıcı yorumlarında geçen yaygın temaları 3 kısa maddeyle özetle.`.trim();

  const parsed = await groqJsonCompletion(prompt, 1600);
  const products = Array.isArray(parsed.products) ? parsed.products : [];

  return {
    correctedTerm: parsed.correctedTerm || userText,
    intro: parsed.intro || "Bilgi alınamadı.",
    products: products.map((p: any) => {
      const activeIngredient = (p.activeIngredient || p.name || "").trim();
      const brandExamples = Array.isArray(p.brandExamples) ? p.brandExamples.map((b: string) => String(b).trim()).filter(Boolean) : [];
      return {
        activeIngredient,
        brandExamples,
        labelLine: symptomProductHeadline({ activeIngredient, brandExamples, name: p.name }),
        form: p.form || "",
        whyItHelps: p.whyItHelps || "",
        typicalUse: p.typicalUse || "",
        cautions: Array.isArray(p.cautions) ? p.cautions : [],
      };
    }),
    generalTips: Array.isArray(parsed.generalTips) && parsed.generalTips.length ? parsed.generalTips : ["Genel öneri alınamadı; eczacınıza danışın."],
    whenToSeeDoctor: Array.isArray(parsed.whenToSeeDoctor) && parsed.whenToSeeDoctor.length ? parsed.whenToSeeDoctor : ["Belirtiler şiddetlenirse veya uzun sürerse doktora başvurun."],
    disclaimer: parsed.disclaimer || "Bu çıktı genel bilgilendirme içindir; teşhis veya tedavi yerine geçmez.",
    userExperiences: normalizeUserExperiences(parsed.userExperiences),
  };
}

export async function checkTypo(userText: string): Promise<string | null> {
  if (!userText || userText.length < 3) return null;
  const prompt = `Kullanıcı şu tıbbi terimi/ilacı arattı: "${userText}".
Yalnızca geçerli JSON döndür. Eğer kelimede bariz bir harf/yazım hatası varsa (örneğin "Buscopon" -> "Buscopan", "Aferi" -> "Aferin"), düzeltilmiş, en yaygın bilinen halini "suggestion" alanına yaz. Eğer hata yoksa veya emin değilsen "suggestion" alanını null bırak.
ÖNEMLİ: Sadece ve sadece bariz yazım hatalarını düzelt. Kullanıcı doğru bir ilaç adı yazdıysa asla başka bir ilaç önerme, null döndür.
JSON şeması:
{
  "suggestion": "düzeltilmiş kelime veya null"
}`;
  try {
    const parsed = await groqJsonCompletion(prompt, 50);
    return parsed.suggestion || null;
  } catch {
    return null;
  }
}

export interface MedicineValidation {
  isValid: boolean;
  isTypo: boolean;
  suggestion: string | null;
}

export async function validateMedicine(userText: string): Promise<MedicineValidation> {
  const prompt = `Sen Türkiye'deki eczanelere ve tıp literatürüne son derece hakim bir uzmansın. Kullanıcı şu metni (ilaç adı, şikayet veya tıbbi terim) girdi: "${userText}".
Yalnızca geçerli JSON döndür:
{
  "isValid": boolean, 
  "isTypo": boolean, 
  "suggestion": "Eğer isTypo true ise ve %100 eminsen, en doğru profesyonel tıbbi terim/ilaç adı. Aksi halde null"
}
Kurallar:
1. Girdi kelime, zaten doğru ve mantıklı bir tıbbi terim veya ilaç adıysa (Örn: Majezik, Parol, Baş ağrısı), kesinlikle isValid: true ve isTypo: false dön, suggestion null olsun.
2. Yazım hatası veya argo varsa (Örn: "Macezik" -> "Majezik", "reg aris" veya "reg" -> "Regl Ağrısı", "başş" -> "Baş Ağrısı"), isValid: false, isTypo: true dön. BURASI ÇOK ÖNEMLİ: Yalnızca, düzelttiğin kelime tıp literatüründe kesin ve profesyonel bir terimse suggestion alanını doldur.
3. Asla uydurma, anlamsız kelimeler veya birbiriyle alakasız derme çatma tamlamalar (Örn: "Reg Aferi") üretme. %100 emin olmadığın tıbbi veya ilaç adları için suggestion: null yap ve isTypo: false yap.
4. Girdi tamamen anlamsızsa (örn: "asdfg") veya tıbbi veya ilaç karşılığı yoksa, uydurma üretme (isValid: false, isTypo: false, suggestion: null).`;
  try {
    const parsed = await groqJsonCompletion(prompt, 100);
    return {
      isValid: parsed.isValid === true,
      isTypo: parsed.isTypo === true,
      suggestion: parsed.suggestion || null,
    };
  } catch {
    return { isValid: true, isTypo: false, suggestion: null };
  }
}
