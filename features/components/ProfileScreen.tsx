import { useState, useEffect } from "react";
import {
  User, LogOut, Save, Loader2, ChevronDown,
  Heart, AlertTriangle, Activity, LogIn
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

// ─── Tipler ──────────────────────────────────────────────────────────────────
interface HealthProfile {
  blood_type: string;
  allergies: string;
  chronic_conditions: string;
  birth_year: number | null;
  is_pregnant: boolean;
}

const BLOOD_TYPES = ["Bilinmiyor", "A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"];

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl bg-muted/30 border border-border text-sm text-foreground " +
  "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 " +
  "focus:border-primary/60 transition-all duration-200 resize-none";

// ─── Avatar (Baş harf) ───────────────────────────────────────────────────────
function Avatar({ letter }: { letter: string }) {
  return (
    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/40 shadow-[0_0_24px_rgba(52,211,153,0.25)] flex items-center justify-center flex-shrink-0">
      <span className="text-3xl font-bold text-primary">{letter}</span>
      <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white" />
      </span>
    </div>
  );
}

// ─── Bölüm Başlığı ───────────────────────────────────────────────────────────
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [profile, setProfile] = useState<HealthProfile>({
  blood_type: "Bilinmiyor",
  allergies: "",
  chronic_conditions: "",
  birth_year: null,
  is_pregnant: false,
});
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Profil yükle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setIsFetching(true);
    supabase
      .from("profiles")
      .select("blood_type, allergies, chronic_conditions, birth_year, is_pregnant")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn("[Profile] Yüklenemedi:", error.message);
        } else if (data) {
          setProfile({
  blood_type: data.blood_type || "Bilinmiyor",
  allergies: data.allergies || "",
  chronic_conditions: data.chronic_conditions || "",
  birth_year: data.birth_year || null,
  is_pregnant: data.is_pregnant || false,
});
        }
        setIsFetching(false);
      });
  }, [user]);

  // ── Profil kaydet ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        blood_type: profile.blood_type,
allergies: profile.allergies,
chronic_conditions: profile.chronic_conditions,
birth_year: profile.birth_year,
is_pregnant: profile.is_pregnant,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    setIsSaving(false);
    if (error) {
      toast.error(t("results.error"));
      console.error(error);
    } else {
      toast.success(t("profile.update_success"));
    }
  };

  // ── Auth yükleniyor ───────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex items-center justify-center pt-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Giriş yapılmamış ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center pt-12 pb-8 gap-6 animate-fade-in-up w-full px-2">
        <div className="w-20 h-20 rounded-full bg-muted/40 border border-border flex items-center justify-center shadow-sm">
          <User className="w-9 h-9 text-muted-foreground/60" />
        </div>
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-bold text-foreground">{t("profile.profile")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px]">
            {t("profile.login_required")}
          </p>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          <LogIn className="w-4 h-4" />
          {t("profile.login_signup")}
        </button>
      </div>
    );
  }

  // ── Giriş yapılmış — ana profil ekranı ───────────────────────────────────
  const fullName = (user.user_metadata?.full_name as string) || "";
  const displayTitle = fullName || user.email || "?";
  const displayLetter = displayTitle.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-5 pb-10 animate-fade-in-up w-full">

      {/* ── Kullanıcı Başlığı ── */}
      <div className="glass-card flex items-center gap-4 p-5 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-xl shadow-lg">
        <Avatar letter={displayLetter} />
        <div className="flex flex-col justify-center min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-0.5">{t("profile.my_account")}</p>
          <p className="text-lg font-bold text-foreground truncate">{displayTitle}</p>
          {fullName && (
            <p className="text-sm font-medium text-muted-foreground/70 truncate mt-0.5">{user.email}</p>
          )}
          <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-bold text-primary/80 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block animate-pulse" />
            {t("profile.active")}
          </span>
        </div>
      </div>

      {/* ── Sağlık Bilgileri Formu ── */}
      {isFetching ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass-card flex flex-col gap-6 p-5 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-xl shadow-lg">
          <div>
            <h3 className="text-base font-bold text-foreground mb-0.5">{t("profile.health_card_title")}</h3>
            <p className="text-xs text-muted-foreground">{t("profile.health_card_desc")}</p>
          </div>

          {/* Kan Grubu */}
          <div>
            <SectionTitle icon={<Heart className="w-3.5 h-3.5" />} label={t("profile.blood_type")} />
            <div className="relative">
              <select
                value={profile.blood_type}
                onChange={(e) => setProfile(p => ({ ...p, blood_type: e.target.value }))}
                className={INPUT_CLASS + " appearance-none pr-10 cursor-pointer"}
              >
                {BLOOD_TYPES.map(bt => (
                  <option key={bt} value={bt}>{bt === "Bilinmiyor" ? t("profile.unknown") : bt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Alerjiler */}
          <div>
            <SectionTitle icon={<AlertTriangle className="w-3.5 h-3.5" />} label={t("profile.allergies")} />
            <textarea
              rows={3}
              value={profile.allergies}
              onChange={(e) => setProfile(p => ({ ...p, allergies: e.target.value }))}
              placeholder={t("profile.allergies_placeholder")}
              className={INPUT_CLASS}
            />
          </div>

          {/* Kronik Hastalıklar */}
          <div>
            <SectionTitle icon={<Activity className="w-3.5 h-3.5" />} label={t("profile.chronic_conditions")} />
            <textarea
              rows={3}
              value={profile.chronic_conditions}
              onChange={(e) => setProfile(p => ({ ...p, chronic_conditions: e.target.value }))}
              placeholder={t("profile.chronic_conditions_placeholder")}
              className={INPUT_CLASS}
            />
          </div>
{/* Doğum Yılı */}
          <div>
            <SectionTitle icon={<User className="w-3.5 h-3.5" />} label="Doğum Yılı" />
            <input
              type="number"
              min={1920}
              max={2010}
              value={profile.birth_year || ""}
              onChange={(e) => setProfile(p => ({ ...p, birth_year: e.target.value ? parseInt(e.target.value) : null }))}
              placeholder="Örn: 1990"
              className={INPUT_CLASS}
            />
          </div>

          {/* Gebelik */}
          <div>
            <SectionTitle icon={<Heart className="w-3.5 h-3.5" />} label="Gebelik Durumu" />
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/30 border border-border">
              <input
                type="checkbox"
                id="is-pregnant"
                checked={profile.is_pregnant}
                onChange={(e) => setProfile(p => ({ ...p, is_pregnant: e.target.checked }))}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <label htmlFor="is-pregnant" className="text-sm text-foreground cursor-pointer">
                Şu an hamileyim
              </label>
            </div>
            {profile.is_pregnant && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Hamilelik durumunuz ilaç analizlerinde dikkate alınacak.
              </p>
            )}
          </div>
          {/* Kaydet Butonu */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-11 rounded-xl bg-primary text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-primary/20"
          >
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("profile.saving")}</>
              : <><Save className="w-4 h-4" /> {t("profile.update_button")}</>
            }
          </button>
        </div>
      )}

      {/* ── Çıkış Yap ── */}
      <button
        onClick={() => signOut()}
        className="w-full h-11 rounded-xl border border-destructive/30 text-destructive font-semibold text-sm flex items-center justify-center gap-2 hover:bg-destructive/10 hover:border-destructive/60 transition-all active:scale-[0.98] shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        {t("profile.logout")}
      </button>

    </div>
  );
}
