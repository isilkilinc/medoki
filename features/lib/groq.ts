import { getCachedAnalysis, setCachedAnalysis } from "./supabase";

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
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a highly skilled Turkish Pharmacist with deep knowledge of local Turkish brand names and their active ingredients. You MUST recognize and correctly map the following common Turkish brands to their active compounds: Parol/Calpol → Paracetamol, Arveles → Dexketoprofen, Majezik → Flurbiprofen, Dolven/Ibufen/Nurofen → Ibuprofen, Augmentin → Amoxicillin/Clavulanate, Desmont → Montelukast, Buscopan → Hyoscine, Dikloron → Diclofenac, Voltaren → Diclofenac, Cipro → Ciprofloxacin, Xanax → Alprazolam. Treat vitamins and supplements (Magnesium, Vitamin D, Omega-3) with the same rigor as drugs. Recognize pediatric brands (Calpol, Dolven, Ibufen). ALWAYS format the correctedTerm field as: 'BrandName (ActiveIngredient)' — e.g. 'Calpol (Parasetamol)', 'Augmentin (Amoksisilin/Klavulanat)'. Return only valid JSON, no markdown or code fences." },
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

function symptomProductHeadline(p: { activeIngredient: string; brandExamples: string[]; name?: string }) {
  const ingredient = (p.activeIngredient || p.name || "").trim() || "—";
  const brands = p.brandExamples.filter(Boolean);
  const brandPart = brands.length > 0 ? brands.join(", ") : "eczacınıza danışın";
  return `${ingredient} içeren ürünler (Örn: ${brandPart})`;
}

export async function analyzeMedicine(userText: string): Promise<MedicineResult> {
  // ─── Cache: önce Supabase'e bak ──────────────────────────────────────────────
  const cacheKey = `medicine:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<MedicineResult>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }
  console.log(`[Cache MISS] ${cacheKey} → Groq API çağrılıyor`);
  // ─────────────────────────────────────────────────────────────────────────────

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
  "disclaimer": "string",
  "userExperiences": ["string", "string", "string"]
}

Kurallar:
- Dil: Türkçe.
- ÖNEMLİ: correctedTerm alanına YALNIZCA ilacın marka veya ticari adını yaz (örn: 'Calpol', 'Arveles', 'Parol'). İlaç etken maddelerini başlığa (correctedTerm) ASLA ekleme. Etken maddeleri ve içerik detaylarını sadece 'summary' (açıklama) alanında, metin içine yedirerek belirt.
- Kullanıcının girdiği metindeki bariz yazım hatalarını veya argoları otomatik olarak doğru tıbbi terime çevir.
- Summary ve diğer açıklamalarda marka adını kullanarak kullanıcı dostu yaz; teknik detaylar parantez içinde veya notlarda yer alabilir.
- Bilimsel doğruluk öncelikli, ama sade ve anlaşılır yaz. İlaç pediatrik ise (örn. Calpol, Dolven, Ibufen), summary alanına mutlaka net bir hatırlatma ekle: 'Pediatrik dozlar çocuğun kilosuna göre doktor tarafından belirlenmelidir.'
- Eğer sorgulanan ürün bir vitamin veya takviye ise (örn. Magnezyum, D Vitamini, Omega-3), summary alanına mutlaka şu notu ekle: 'Takviyeler dengeli bir beslenmenin yerine geçmez ve gözetim altında kullanılmalıdır.'
- Emin olmadığın bilgi varsa "Prospektüste doğrulayın" gibi net uyarı ekle.
- Reçete önerme; sadece genel bilgilendirme yap.
- sensitivityWarnings: İlacın içeriğindeki yaygın alerjenleri (Gluten, Laktoz, Nişasta, Yapay Boyalar) ve hayvansal kaynaklı içerikleri (domuz/sığır enzimleri, jelatin vb.) vegan/vejetaryenler için tara. Bulursan her birini en başa '⚠️' emojisi koyarak kısa bir açıklamayla yaz. Bulamazsan boş liste dön.
- userExperiences: İnternet forumları ve kullanıcı yorumlarında bu ilaçla ilişkilendirilen yaygın temaları 3 kısa maddeyle özetle.`.trim();

  const parsed = await groqJsonCompletion(prompt, 1100);

  const result: MedicineResult = {
    correctedTerm: parsed.correctedTerm || userText,
    purpose: parsed.purpose || "Bilgi alınamadı.",
    dosage: parsed.dosage || "Bilgi alınamadı.",
    sideEffects: Array.isArray(parsed.sideEffects) && parsed.sideEffects.length ? parsed.sideEffects : ["Bilgi alınamadı."],
    warnings: Array.isArray(parsed.warnings) && parsed.warnings.length ? parsed.warnings : ["Bilgi alınamadı."],
    sensitivityWarnings: Array.isArray(parsed.sensitivityWarnings) ? parsed.sensitivityWarnings : [],
    summary: parsed.summary || "Bilgi alınamadı.",
    disclaimer: parsed.disclaimer || "Bu çıktı genel bilgilendirme içindir; doktor veya eczacı önerisinin yerine geçmez.",
    userExperiences: normalizeUserExperiences(parsed.userExperiences),
  };

  // ─── Cache: sonucu Supabase'e kaydet (fire & forget) ─────────────────────────
  void setCachedAnalysis(cacheKey, result);

  return result;
}

// ─── Semptom Doğrulama (3 Aşamalı) ───────────────────────────────────────────
export type SymptomValidationStage = "auto_correct" | "suggestion" | "error";

export interface SymptomValidation {
  stage: SymptomValidationStage;
  /** Aşama 1: otomatik düzeltilmiş terim (direkt analiz başlat) */
  correctedTerm?: string;
  /** Aşama 2: kullanıcıya gösterilecek öneri */
  suggestion?: string;
}

export async function validateSymptom(userText: string): Promise<SymptomValidation> {
  // ─── Cache ───────────────────────────────────────────────────────────────────
  const cacheKey = `val_sym:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<SymptomValidation>(cacheKey);
  if (cached) return cached;
  // ─────────────────────────────────────────────────────────────────────────────

  const prompt = `Sen Türk tıp terminolojisine ve eczacılığına hakim bir uzmansın.
Kullanıcı şikayetini/semptomunu şöyle girdi: "${userText}"

Aşağıdaki JSON şemasına SADECE geçerli JSON döndür. Markdown, code block, ek açıklama kullanma:
{
  "stage": "valid" | "error",
  "correctedTerm": "string veya null"
}

Kurallar — SADECE BİRİ UYGULANIR:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. AŞAMA: valid  ← EN KATLI KURAL.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   - Girdi zaten doğruysa, veya YALNIZCA kesin ve tek bir olasılığı olan basit bir harf hatası barındırıyorsa (örn: "baş ağrsı" -> "Baş Ağrısı"). 
   - stage: "valid", correctedTerm: profesyonel tıbbi terim (Başlık Büyük Harf).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. AŞAMA: error ← DİĞER TÜM DURUMLAR BUNA GİRER.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   - Girdi tamamen anlamsız, rastgele karakter dizisi ("dsfgsdg", "asdfg", "xjqpw" vb.) ise.
   - Girdi uydurma kelime tiplemeleri içeriyorsa.
   - Girdi LABORATUVAR veya KAN DEĞERİ ise (örn: "TSH", "WBC", "Hemoglobin", "B12 seviyesi", "Kolesterol"). Laboratuvar sonuçları kesinlikle 'semptom' değildir, DİREKT error dön.
   - Girdi birden fazla yazım hatası barındırıyorsa, okuması zorsa, klavye kayması çok fazlaysa (örn: "bqz ağrısı", "mğde agrıs") veya hangi kelimeyi kastettiğinden %100 emin değilsen. (Bunu mu demek istediniz ÖNERİSİ YAPMA YASAKTIR, DİREKT error DÖN).
   - stage: "error", correctedTerm: null.
`;

  try {
    const parsed = await groqJsonCompletion(prompt, 120);
    const stage: SymptomValidationStage = parsed.stage === "valid" ? "auto_correct" : "error";
    const result: SymptomValidation = {
      stage,
      correctedTerm: parsed.correctedTerm || undefined,
    };
    void setCachedAnalysis(cacheKey, result);
    return result;
  } catch {
    // Fail-closed! Hatayı gizleme, analiz yapmasına izin verme, anlamsız girişleri reddet.
    return { stage: "error" };
  }
}
// ──────────────────────────────────────────────────────────────────────────────

export async function analyzeSymptom(userText: string): Promise<SymptomResult> {
  // ─── RED FLAG PROTOCOL (Kod Katmanı) ───────────────────────────────────────
  // Hayati tehlike taşıyan semptomlar tespit edilirse AI çağrılmaz,
  // kullanıcı doğrudan acil servise yönlendirilir.
  const RED_FLAG_KEYWORDS = [
    // Göğüs & Kalp
    "göğüs ağrısı", "gogus agrisi", "gögüs ağrısı", "göğüs sıkışması",
    "kalp krizi", "kalp ağrısı", "kalp çarpıntısı", "çarpıntı",
    "nefes darlığı", "nefes alamıyorum", "nefes alamiyorum",
    // Bilinç & Nöroloji
    "bilinç kaybı", "bayılma", "baygınlık", "bayıldım", "baygın",
    "felç", "inme", "uyuşma yüz", "konuşamıyorum", "konusamiyorum",
    // Ciddi karın & İç organ ağrısı
    "şiddetli karın ağrısı", "siddetli karin agrisi", "ani karın ağrısı",
    // Ciddi kanama & Diğer aciller
    "ciddi kanama", "kanlı idrar", "kan kusma", "kan kusuyor",
  ];

  const normalizedInput = userText.toLowerCase().trim();
  const isRedFlag = RED_FLAG_KEYWORDS.some(kw => normalizedInput.includes(kw));

  if (isRedFlag) {
    const warning = `KRİTİK UYARI: "${userText}" gibi belirtiler ciddi bir sağlık sorununun (örn: kalp krizi, felç) işareti olabilir. Lütfen hiçbir ilaç kullanmadan DERHAL 112 Acil Çağrı Merkezi'ni arayın veya en yakın acil servise başvurun.`;
    return {
      correctedTerm: userText,
      intro: warning,
      products: [],
      generalTips: ["Belirtiler geçmeden hareket etmeyin, yere oturun veya uzanın.", "Yanınızdaki birinden 112'yi aramasını isteyin.", "Herhangi bir ilaç veya yiyecek almayın."],
      whenToSeeDoctor: ["DERHAL 112'yi arayın veya en yakın acil servise gidin."],
      disclaimer: "Bu mesaj otomatik bir güvenlik uyarısıdır. Lütfen tıbbi acil durumda zaman kaybetmeden yardım isteyin.",
      userExperiences: [],
    };
  }
  // ──────────────────────────────────────────────────────────────────────────

  // ─── Cache: red flag değilse önce Supabase'e bak ──────────────────────────────
  const cacheKey = `symptom:${normalizedInput}`;
  const cached = await getCachedAnalysis<SymptomResult>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }
  console.log(`[Cache MISS] ${cacheKey} → Groq API çağrılıyor`);
  // ─────────────────────────────────────────────────────────────────────────────

  const prompt = `
Kullanıcının şikayeti / semptomu: "${userText}"

⚠️ RED FLAG PROTOKOLÜ (AI Katmanı — En Yüksek Öncelik):
Eğer kullanıcının semptomu şunlardan herhangi birini içeriyorsa ASLA ilaç önerme:
  → Göğüs ağrısı, göğüs sıkışması, kalp krizi şüphesi
  → Nefes darlığı, nefes alamama
  → Kalp çarpıntısı (şiddetli veya ani başlangıçlı)
  → Bilinç kaybı, bayılma, felç belirtisi (yüzde uyuşma, konuşamama)
  → Şiddetli/ani karın ağrısı (iç organ hasarı riski)
Bu semptomlarda products dizisini BOŞ bırak ve intro alanına şunu yaz:
"KRİTİK UYARI: Bu belirtiler ciddi bir sağlık sorununun işareti olabilir. Hiçbir ilaç kullanmadan DERHAL 112'yi arayın veya en yakın acil servise başvurun."

Bu semptoma yönelik yalnızca reçetesiz (OTC) seçenekler öner. Reçeteli ilaç, antibiyotik veya kontrollü madde önerme.
Her öneride yalnızca etken madde adını tek başına yazma: Türkiye'de eczanede en yaygın bilinen ticari marka örneklerini de ver.

Semptomu dikkatlice analiz et ve sadece o semptomu doğrudan hedefleyen, spesifik OTC seçeneklerini öner.
Her şikayete tembelce Parasetamol veya İbuprofen önerme; semptomun doğasına uygun çözümleri önceliklendir:
- Mide/sindirim şikayetlerinde antiasit, H2 blokör veya probiyotik öner (bu kategoride NSAİİ'ler mideye zarar verir, önerme).
- Kas/eklem/bel ağrılarında topikal jel, krem veya ısıtıcı bant gibi lokal çözümleri önce sırala.
- Boğaz ağrısı ve soğuk algınlığında pastil, boğaz spreyi veya deniz suyu spreyi gibi semptoma özgü ürünleri öner.
- Alerji/cilt şikayetlerinde antihistaminik jel, yatıştırıcı krem gibi topikal seçenekleri öne çıkar.
- Gerçek anlamda ağrı veya ateş eşlik ediyorsa Parasetamol ya da İbuprofen ekleyebilirsin, ancak bunların listede tek seçenek olmamasına dikkat et.

Aşağıdaki JSON şemasına tam uygun şekilde yanıt ver. Yalnızca geçerli JSON döndür, markdown veya code block kullanma:
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
- ÖNEMLİ: correctedTerm alanını KESİNLİKLE 'Aratılan Semptom (Semptomun Latince veya Akademik Tıbbi Karşılığı)' formatında döndür. Parantez içine ASLA bu semptoma sebep olabilecek hastalıkları (örn: Gastrit, Enfeksiyon, Migren) yazma; yalnızca şikayetin doğrudan tıbbi litaratürdeki adını (örn: 'Baş Ağrısı (Serebralji)', 'Mide Bulantısı (Nausea)', 'Ateş (Pireksi/Febris)', 'Boğaz Ağrısı (Farenjal Ağrı)') kullan. "intro" ve diğer açıklamalarda ise yalnızca Türkçe semptom adını kullan.
- 3 ila 5 arası ürün öner.
- Her products öğesinde activeIngredient ve brandExamples (en az 2 marka) zorunlu.
- form alanı net olsun: "Tablet", "Jel", "Krem", "Sprey", "Şurup", "Pastil", "Bant" vb.
- Hamilelik, kronik hastalık, çocuk, alerji gibi durumlarda mutlaka eczacı/doktor uyarısı yaz.
- userExperiences: Bu semptom veya önerilen OTC ürünlerle ilgili internetteki kullanıcı yorumlarında geçen yaygın temaları 3 kısa maddeyle özetle.`.trim();

  const parsed = await groqJsonCompletion(prompt, 1600);
  const products = Array.isArray(parsed.products) ? parsed.products : [];

  const result: SymptomResult = {
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

  // ─── Cache: sonucu Supabase'e kaydet (fire & forget) ─────────────────────────
  void setCachedAnalysis(cacheKey, result);

  return result;
}

export async function checkTypo(userText: string): Promise<string | null> {
  if (!userText || userText.length < 3) return null;

  // ─── Cache ───────────────────────────────────────────────────────────────────
  const cacheKey = `typo:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<string | null>(cacheKey);
  if (cached !== null && cached !== undefined) return cached;
  // ─────────────────────────────────────────────────────────────────────────────

  const prompt = `Kullanıcı şu tıbbi terimi/ilacı arattı: "${userText}".
Yalnızca geçerli JSON döndür. Eğer kelimede bariz bir harf/yazım hatası varsa düzeltilmiş onaylı halini "suggestion" alanına yaz. Eğer hata yoksa veya emin değilsen "suggestion" alanını null bırak.
ÖNEMLİ KURALLAR:
1. SÖZLÜK KONTROLÜ: Öneri yaparken sadece GERÇEK (piyasada var olan veya tıbben anlamlı) kelimeleri referans al. Kullanıcının girdiği saçma veya uydurma bir kelimeyi (örn: 'göpüs') asla 'göpüs' diye önerme.
2. EŞİK DEĞERİ: Girdi, önereceğin kelimeyle %80-90 oranında kelime, klavye ve görünüm olarak uyuşmuyorsa (veya önerilen kelimedeki asıl kök harflerle ilgisi yoksa) O ÖNERİYİ ELE (null dön).
3. Doğru ilaç adı yazıldıysa asla başka ilaç önerme, null dön.
JSON şeması:
{
  "suggestion": "düzeltilmiş kelime veya null"
}`;
  try {
    const parsed = await groqJsonCompletion(prompt, 50);
    const result = parsed.suggestion || null;
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
  // ─── Cache ───────────────────────────────────────────────────────────────────
  const cacheKey = `val_med:${userText.trim().toLowerCase()}`;
  const cached = await getCachedAnalysis<MedicineValidation>(cacheKey);
  if (cached) return cached;
  // ─────────────────────────────────────────────────────────────────────────────

  const prompt = `Sen Türkiye'deki eczanelere ve tıp literatürüne son derece hakim bir uzmansın.
Kullanıcı şu metni girdi: "${userText}"

Önce girdinin ne olduğuna karar ver, sonra JSON üret. Yalnızca geçerli JSON döndür, başka hiçbir şey yazma:
{
  "inputType": "medicine" | "symptom" | "invalid",
  "isValid": boolean,
  "isTypo": boolean,
  "isSymptom": boolean,
  "suggestion": "string veya null"
}

━━━ inputType nasıl belirlenir ━━━

"medicine" → İlaç ticari adı (Parol, Arveles, Majezik, Calpol, Ibufen, Augmentin, Xanax, vb.),
              etken madde adı (İbuprofen, Parasetamol, Amoksisilin, vb.),
              vitamin/takviye adı (D Vitamini, Magnezyum, Omega-3, vb.).

"symptom"  → Kullanıcının hissettiği fiziksel şikayet veya belirti:
              Baş ağrısı, mide bulantısı, ateş, öksürük, regl ağrısı, karın ağrısı,
              boğaz ağrısı, burun akıntısı, ishal, kabızlık, baş dönmesi, vb.
              KURAL: Girdi bir semptom/şikayet ise isSymptom: true, isValid: false, isTypo: false, suggestion: null döndür.

"invalid"  → Tamamen anlamsız, rastgele karakter dizisi (örn: "asdfg", "vzka skaa") veya LABORATUVAR/KAN DEĞERİ (örn: "TSH", "Hemoglobin", "WBC"). Bunlar ilaç/takviye değildir.

━━━ Diğer alanlar ━━━

isValid:
  - inputType "medicine" ise → isValid: true (ilaç adı geçerli ve yazım hatası yok).
  - inputType "medicine" ama yazım hatası varsa → isValid: false, isTypo: true.
  - inputType "symptom" veya "invalid" → isValid: false.

isTypo:
  - Sadece inputType "medicine" olan bir girdide yazım hatası varsa true.
  - ÖNERİ SAĞLAMASI: Suggestion alanına yazdığın kelime KESİNLİKLE gerçek bir ilaç/terim olmalı. Eşik Değeri (%80 uyuşma) yakalanmıyorsa ve uydurma ("göpüs" gibi) bir kelime ise isTypo: false, inputType: invalid olarak dön.
  - "Macezik" → "Majezik", "Parool" → "Parol" gibi.
  - isSymptom: true ise isTypo kesinlikle false olmalı.

suggestion:
  - isTypo: true ise ve %100 eminsen, doğru ilaç adını yaz.
  - Diğer tüm durumlarda null.

━━━ Örnekler ━━━
  "Majezik"      → inputType:"medicine", isValid:true,  isTypo:false, isSymptom:false, suggestion:null
  "Macezik"      → inputType:"medicine", isValid:false, isTypo:true,  isSymptom:false, suggestion:"Majezik"
  "baş ağrısı"   → inputType:"symptom",  isValid:false, isTypo:false, isSymptom:true,  suggestion:null
  "mide bulantısı" → inputType:"symptom",isValid:false, isTypo:false, isSymptom:true,  suggestion:null
  "ateş"         → inputType:"symptom",  isValid:false, isTypo:false, isSymptom:true,  suggestion:null
  "D Vitamini"   → inputType:"medicine", isValid:true,  isTypo:false, isSymptom:false, suggestion:null
  "asdfg"        → inputType:"invalid",  isValid:false, isTypo:false, isSymptom:false, suggestion:null`;

  try {
    const parsed = await groqJsonCompletion(prompt, 150);
    const result: MedicineValidation = {
      isValid: parsed.isValid === true,
      isTypo: parsed.isTypo === true,
      isSymptom: parsed.isSymptom === true,
      suggestion: parsed.suggestion || null,
    };
    void setCachedAnalysis(cacheKey, result);
    return result;
  } catch {
    return { isValid: true, isTypo: false, isSymptom: false, suggestion: null };
  }
}
