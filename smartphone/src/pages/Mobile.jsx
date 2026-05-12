import React, { useState, useEffect, useRef } from "react";
import MobileOverview from "../components/mobile/MobileOverview";
import MobileFichePerson from "../components/mobile/MobileFichePerson";
import MobileDocumentArrivee from "../components/mobile/MobileDocumentArrivee";
import MobileDocumentSortie from "../components/mobile/MobileDocumentSortie";
import { db } from "@/lib/db";
import { getCurrentSession, onAuthStateChange, supabase } from "@/lib/supabaseClient";

const MOBILE_WINDOW_SESSION_KEY = "dotations_mobile_window_open";
const MOBILE_BRAND_LOGO_URL = "https://dphrvdhqhgycmllietuk.supabase.co/storage/v1/object/public/ui-assets/sidebar/bandeau-nextboard-sidebar-detoure.png";
const MOBILE_PASSWORD_RESET_COOLDOWN_KEY = "dotations_mobile_reset_password_last_sent_at";
const MOBILE_PASSWORD_RESET_COOLDOWN_MS = 70 * 1000;

const TABS = [
  { id: "overview", label: "VUE D'ENSEMBLE", icon: "🏠" },
  { id: "fiche", label: "FICHE", icon: "👤" },
  { id: "arrivee", label: "ENTREE", icon: "📥" },
  { id: "sortie", label: "SORTIE", icon: "📤" },
];

const DEFAULT_BASES = {
  sites: [],
  fonctions: [],
  typesPersonnel: [],
  typesContrats: [],
  typesEffets: [],
  statutsObjetManuels: [],
  referencesEffets: [],
  coutsRemplacement: [],
  representantsSignataires: [],
};

function isValidTab(tab) {
  return TABS.some((t) => t.id === tab);
}

function isAuthFailureMessage(message) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("jwt") ||
    text.includes("auth") ||
    text.includes("connexion requise") ||
    text.includes("session") ||
    text.includes("role utilisateur impossible") ||
    text.includes("permission") ||
    text.includes("not authorized") ||
    text.includes("unauthorized") ||
    text.includes("403") ||
    text.includes("401")
  );
}

function buildUrlState(tab, personId) {
  const params = new URLSearchParams();
  params.set("tab", isValidTab(tab) ? tab : "overview");
  if (personId) params.set("personId", String(personId));
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  const personId = params.get("personId");
  return {
    tab: isValidTab(tab) ? tab : "overview",
    personId: personId || null,
  };
}

export default function Mobile() {
  const [activeTab, setActiveTab] = useState("overview");
  const [persons, setPersons] = useState([]);
  const [effets, setEffets] = useState([]);
  const [bases, setBases] = useState(DEFAULT_BASES);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [roleLabel, setRoleLabel] = useState("LECTURE");
  const [loadError, setLoadError] = useState("");
  const [brandLogoReady, setBrandLogoReady] = useState(false);

  const personsRef = useRef([]);
  const selectedPersonRef = useRef(null);
  const skipNextPushRef = useRef(true);

  const applyUrlState = (state) => {
    const wantedTab = isValidTab(state?.tab) ? state.tab : "overview";
    const wantedPersonId = state?.personId || null;
    setActiveTab(wantedTab);

    if (!wantedPersonId) {
      setSelectedPerson(null);
      return;
    }

    const found = personsRef.current.find((p) => String(p.id) === String(wantedPersonId));
    setSelectedPerson(found || null);
  };

  const loadData = async () => {
    if (!session) {
      setLoading(false);
      setLoadError("");
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const [pRes, eRes, bRes] = await Promise.allSettled([
        db.Person.list("-created_at", 5000),
        db.Effet.list("-created_at", 5000),
        db.AppState.getReferenceBases(),
      ]);

      const p = pRes.status === "fulfilled" && Array.isArray(pRes.value) ? pRes.value : [];
      const e = eRes.status === "fulfilled" && Array.isArray(eRes.value) ? eRes.value : [];
      const b = bRes.status === "fulfilled" && bRes.value ? bRes.value : DEFAULT_BASES;
      const firstError =
        (pRes.status === "rejected" && pRes.reason) ||
        (eRes.status === "rejected" && eRes.reason) ||
        (bRes.status === "rejected" && bRes.reason) ||
        null;
      const allRejected =
        pRes.status === "rejected" &&
        eRes.status === "rejected" &&
        bRes.status === "rejected";
      if (firstError) {
        const message = String(firstError?.message || firstError || "").trim();
        if (message) setLoadError(`LECTURE MOBILE BLOQUEE: ${message}`);
        if (allRejected || isAuthFailureMessage(message)) {
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          return;
        }
      }

      personsRef.current = p;
      setPersons(p);
      setEffets(e);
      setBases(b);

      const urlState = readUrlState();
      if (urlState.personId) {
        const found = p.find((person) => String(person.id) === String(urlState.personId));
        setSelectedPerson(found || null);
      }
    } catch {
      personsRef.current = [];
      setPersons([]);
      setEffets([]);
      setBases(DEFAULT_BASES);
      setLoadError("LECTURE MOBILE BLOQUEE: connexion ou droits insuffisants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const isFreshWindowOpen = !window.sessionStorage.getItem(MOBILE_WINDOW_SESSION_KEY);
    window.sessionStorage.setItem(MOBILE_WINDOW_SESSION_KEY, "1");

    if (isFreshWindowOpen) {
      // Force a clean auth state on fresh window open so login is required again.
      supabase.auth.signOut().catch(() => {});
    }

    const cleanupWindowMarker = () => {
      try {
        window.sessionStorage.removeItem(MOBILE_WINDOW_SESSION_KEY);
      } catch {}
    };
    window.addEventListener("beforeunload", cleanupWindowMarker);

    getCurrentSession()
      .then((s) => {
        if (!mounted) return;
        setSession(s);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
      })
      .finally(() => {
        if (!mounted) return;
        setAuthLoading(false);
      });

    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setLoginError("");
    });

    return () => {
      mounted = false;
      unsubscribe?.();
      window.removeEventListener("beforeunload", cleanupWindowMarker);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      setPersons([]);
      setEffets([]);
      setBases(DEFAULT_BASES);
      setSelectedPerson(null);
      setLoading(false);
      setLoadError("");
      return;
    }
    loadData();
  }, [session, authLoading]);

  useEffect(() => {
    let active = true;
    const loadRole = async () => {
      if (!session?.user?.id) {
        if (active) setRoleLabel("LECTURE");
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const role = String(data?.role || "").trim().toLowerCase();
        const nextLabel = role === "admin" ? "ADMIN" : role === "editor" ? "EDITION" : "LECTURE";
        if (active) setRoleLabel(nextLabel);
      } catch {
        if (active) setRoleLabel("LECTURE");
      }
    };
    loadRole();
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(loginEmail || "").trim(),
        password: String(loginPassword || ""),
      });
      if (error) throw error;
      setLoginPassword("");
    } catch (error) {
      setLoginError(String(error?.message || "Connexion impossible."));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
  };

  const handleForgotPassword = async () => {
    const email = String(loginEmail || "").trim();
    const resetRedirectTo = "https://nextboard-dev.github.io/Dotations/index.html?view=desktop";
    if (!email) {
      setLoginError("Saisir votre email puis cliquer 'Mot de passe oublié'.");
      return;
    }
    const now = Date.now();
    const lastSentAt = Number.parseInt(
      String(localStorage.getItem(MOBILE_PASSWORD_RESET_COOLDOWN_KEY) || ""),
      10
    );
    if (Number.isFinite(lastSentAt)) {
      const remainingMs = MOBILE_PASSWORD_RESET_COOLDOWN_MS - (now - lastSentAt);
      if (remainingMs > 0) {
        const remainingSec = Math.ceil(remainingMs / 1000);
        setLoginError(`Attends ${remainingSec}s avant de recommencer.`);
        return;
      }
    }
    setLoginError("");
    setResetBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirectTo,
      });
      if (error) throw error;
      localStorage.setItem(MOBILE_PASSWORD_RESET_COOLDOWN_KEY, String(now));
      setLoginError("Email de réinitialisation envoyé.");
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("429")) {
        setLoginError("Trop de demandes. Réessayez dans 1 heure.");
      } else {
        setLoginError(message || "Échec envoi email de réinitialisation.");
      }
    } finally {
      setResetBusy(false);
    }
  };

  useEffect(() => {
    selectedPersonRef.current = selectedPerson;
  }, [selectedPerson]);

  useEffect(() => {
    const onPopState = () => {
      skipNextPushRef.current = true;
      applyUrlState(readUrlState());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      const replaceUrl = buildUrlState(activeTab, selectedPerson?.id);
      window.history.replaceState({}, "", replaceUrl);
      return;
    }

    const nextUrl = buildUrlState(activeTab, selectedPerson?.id);
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({}, "", nextUrl);
    }
  }, [activeTab, selectedPerson?.id, loading]);

  const markUnsaved = () => setSaveStatus("unsaved");

  const handleSelectPerson = (person) => {
    setSelectedPerson(person);
  };

  const handleNavigateTo = (tab, person) => {
    if (person) setSelectedPerson(person);
    setActiveTab(tab);
  };

  const topSaveButtonStyle = (() => {
    if (saveStatus === "unsaved") {
      return {
        background: "#3f6170",
        color: "#ffffff",
        border: "1px solid rgba(63,97,112,0.3)",
      };
    }
    if (saveStatus === "saving") {
      return {
        background: "rgba(63,97,112,0.24)",
        color: "#213b48",
        border: "1px solid rgba(63,97,112,0.35)",
      };
    }
    return {
      background: "rgba(111,157,120,0.2)",
      color: "#4c6a53",
      border: "1px solid rgba(111,157,120,0.3)",
    };
  })();

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, #ebe6dc 0%, #d9e2e7 100%)", color: "#3f5662", fontSize: 12 }}>
        VERIFICATION SESSION...
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ebe6dc 0%, #d9e2e7 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 360, background: "rgba(255,255,255,0.78)", border: "1px solid rgba(63,97,112,0.25)", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1d3440" }}>CONNEXION REQUISE</div>
          <input
            type="email"
            name="username"
            autoComplete="username email"
            required
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="Email"
            style={{ height: 38, borderRadius: 8, border: "1px solid rgba(63,97,112,0.35)", padding: "0 10px" }}
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="Mot de passe"
            style={{ height: 38, borderRadius: 8, border: "1px solid rgba(63,97,112,0.35)", padding: "0 10px" }}
          />
          {loginError ? <div style={{ color: "#8e2c2c", fontSize: 12 }}>{loginError}</div> : null}
          <button
            type="button"
            onClick={() => setLoginError("Identifiant oublié : contactez un administrateur.")}
            style={{ height: 36, borderRadius: 8, border: "1px solid rgba(63,97,112,0.35)", background: "#fff", color: "#1d3440", fontWeight: 700, cursor: "pointer" }}
          >
            IDENTIFIANT OUBLIE
          </button>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={resetBusy}
            style={{ height: 36, borderRadius: 8, border: "1px solid rgba(63,97,112,0.35)", background: "#fff", color: "#1d3440", fontWeight: 700, cursor: "pointer" }}
          >
            {resetBusy ? "ENVOI..." : "MOT DE PASSE OUBLIE"}
          </button>
          <button type="submit" disabled={loginBusy} style={{ height: 38, borderRadius: 8, border: "1px solid rgba(63,97,112,0.35)", background: "#3f6170", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            {loginBusy ? "CONNEXION..." : "SE CONNECTER"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ebe6dc 0%, #d9e2e7 100%)", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <div style={{ background: "linear-gradient(180deg, #c2d2da 0%, #d9e2e7 100%)", padding: "8px 10px 8px", borderBottom: "1px solid rgba(63,97,112,0.2)", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 34 }}>
          <div style={{ width: 112, height: 26, borderRadius: 6, overflow: "hidden", background: "#dce5eb", display: "grid", placeItems: "center" }}>
            {!brandLogoReady ? (
              <span style={{ color: "#556d79", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", opacity: 0.68 }}>
                NEXTBOARD
              </span>
            ) : null}
            <img
              src={MOBILE_BRAND_LOGO_URL}
              alt="NextBoard"
              loading="eager"
              decoding="async"
              width={112}
              height={26}
              onLoad={() => setBrandLogoReady(true)}
              onError={() => setBrandLogoReady(true)}
              style={{
                width: 112,
                height: 26,
                borderRadius: 6,
                objectFit: "contain",
                objectPosition: "left center",
                display: "block",
                opacity: brandLogoReady ? 1 : 0,
                transition: "opacity 0.25s ease",
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 8, color: "#556d79", letterSpacing: "0.1em", lineHeight: 1.1 }}>SUIVI DES DOTATIONS</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#14242c", lineHeight: 1.1, whiteSpace: "nowrap" }}>ENTREE / SORTIE</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", justifyContent: "flex-start", flexWrap: "nowrap", overflowX: "auto", paddingBottom: 1, minHeight: 28 }}>
          <span
            style={{
              flex: "0 0 auto",
              height: 26,
              padding: "0 7px",
              borderRadius: 7,
              border: "1px solid rgba(63,97,112,0.3)",
              background: "rgba(63,97,112,0.12)",
              color: "#213b48",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.03em",
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            DROIT : {roleLabel}
          </span>
          <button
            type="button"
            style={{
              flex: "0 0 auto",
              fontSize: 8,
              padding: "0 9px",
              height: 26,
              borderRadius: 7,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "default",
              ...topSaveButtonStyle,
            }}
          >
            {saveStatus === "saving" ? "SAUVEGARDE..." : saveStatus === "unsaved" ? "SAUVEGARDER" : "SAUVEGARDE"}
          </button>
          <button onClick={loadData} style={{ flex: "0 0 auto", fontSize: 9, padding: "0 8px", height: 26, borderRadius: 7, border: "1px solid rgba(63,97,112,0.3)", background: "rgba(63,97,112,0.12)", color: "#213b48", cursor: "pointer" }}>
            ↻
          </button>
          <button onClick={handleLogout} style={{ flex: "0 0 auto", fontSize: 9, padding: "0 8px", height: 26, borderRadius: 7, border: "1px solid rgba(63,97,112,0.3)", background: "rgba(63,97,112,0.12)", color: "#213b48", cursor: "pointer" }}>
            ⎋
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 70 }}>
        {loadError ? (
          <div
            style={{
              margin: "10px 12px 0",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid rgba(184,96,82,0.45)",
              background: "rgba(252,234,227,0.9)",
              color: "#7d2f22",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {loadError}
          </div>
        ) : null}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#3f5662", fontSize: 12 }}>
            CHARGEMENT...
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <MobileOverview persons={persons} effets={effets} onSelectPerson={(p) => handleNavigateTo("fiche", p)} />
            )}
            {activeTab === "fiche" && (
              <MobileFichePerson
                persons={persons}
                effets={effets}
                selectedPerson={selectedPerson}
                onSelectPerson={handleSelectPerson}
                onDataChange={loadData}
                onMarkUnsaved={markUnsaved}
                setSaveStatus={setSaveStatus}
                onNavigate={handleNavigateTo}
                bases={bases}
              />
            )}
            {activeTab === "arrivee" && (
              <MobileDocumentArrivee
                persons={persons}
                effets={effets}
                selectedPerson={selectedPerson}
                onSelectPerson={handleSelectPerson}
                setSaveStatus={setSaveStatus}
                onDataChange={loadData}
                representatives={bases.representantsSignataires || []}
                pricingRules={bases.coutsRemplacement || []}
                effetTypes={bases.typesEffets || []}
              />
            )}
            {activeTab === "sortie" && (
              <MobileDocumentSortie
                persons={persons}
                effets={effets}
                selectedPerson={selectedPerson}
                onSelectPerson={handleSelectPerson}
                setSaveStatus={setSaveStatus}
                onDataChange={loadData}
                representatives={bases.representantsSignataires || []}
                pricingRules={bases.coutsRemplacement || []}
                effetTypes={bases.typesEffets || []}
              />
            )}
          </>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "linear-gradient(180deg, #c2d2da 0%, #b8cad2 100%)", borderTop: "1px solid rgba(63,97,112,0.25)", display: "grid", gridTemplateColumns: `repeat(${TABS.length}, 1fr)`, zIndex: 100 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 4px 10px",
              border: "none",
              background: activeTab === tab.id ? "rgba(63,97,112,0.22)" : "transparent",
              borderTop: activeTab === tab.id ? "2px solid #3f6170" : "2px solid transparent",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.icon}</span>
            <span style={{ fontSize: 8, letterSpacing: "0.06em", color: activeTab === tab.id ? "#213b48" : "#556d79", fontWeight: activeTab === tab.id ? 700 : 400 }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
