import React, { useState } from "react";
import { getDossierStatus, getEffectStatus } from "@/lib/businessRules";

const card = { background: "rgba(244,241,234,0.98)", border: "1px solid rgba(173,190,199,0.98)", borderRadius: 11, padding: "10px 12px", marginBottom: 8, boxShadow: "0 4px 12px rgba(31,49,59,0.10)" };
const label = { fontSize: 9, color: "#4a6170", letterSpacing: "0.08em", margin: "0 0 2px" };
const value = { fontSize: 22, fontWeight: 700, color: "#0f1e26", margin: 0, lineHeight: 1 };
const normalizeTextLocal = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

function statusColor(s) {
  if (s === "EN POSTE") return { bg: "rgba(89,148,117,0.16)", color: "#2f5e43", border: "rgba(89,148,117,0.38)" };
  if (s === "SORTIE PREVUE") return { bg: "rgba(224,147,82,0.2)", color: "#8e4d1e", border: "rgba(224,147,82,0.42)" };
  if (s === "SORTI") return { bg: "rgba(202,91,96,0.19)", color: "#7d2a31", border: "rgba(202,91,96,0.42)" };
  return { bg: "rgba(93,120,134,0.12)", color: "#213b48", border: "rgba(93,120,134,0.3)" };
}

function formatDateFr(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return raw;
}

export default function MobileOverview({ persons, effets, documentsArchives, uiAlertsReadonly, onSelectPerson }) {
  const [search, setSearch] = useState("");
  const todayIso = new Date().toISOString().slice(0, 10);

  const filtered = persons.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (p.nom || "").toLowerCase().includes(q) ||
      (p.prenom || "").toLowerCase().includes(q) ||
      (p.sites || []).join(" ").toLowerCase().includes(q);
  });

  const personById = new Map((persons || []).map((p) => [String(p.id), p]));
  const totalEffetsFromPersons = (persons || []).reduce((sum, p) => {
    const arr = Array.isArray(p?.effetsConfies) ? p.effetsConfies : [];
    return sum + arr.length;
  }, 0);
  const fallbackEffets = Array.isArray(effets) ? effets : [];
  const usePersonsEffects = totalEffetsFromPersons > 0;
  const totalEffets = usePersonsEffects ? totalEffetsFromPersons : fallbackEffets.length;
  const nonRendus = usePersonsEffects
    ? (persons || []).reduce((sum, p) => {
        const arr = Array.isArray(p?.effetsConfies) ? p.effetsConfies : [];
        return sum + arr.filter((e) => getEffectStatus(p, e) === "NON RENDU").length;
      }, 0)
    : fallbackEffets.filter((e) => {
        const person = personById.get(String(e.personId));
        return getEffectStatus(person, e) === "NON RENDU";
      }).length;
  const enPoste = persons.filter((p) => getDossierStatus(p) !== "SORTI").length;
  const alerts = persons.flatMap((p) => {
    const sortiePrevue = String(p?.dateSortiePrevue || "");
    const sortieReelle = String(p?.dateSortieReelle || "");
    const sortiePrevueDate = sortiePrevue ? new Date(`${sortiePrevue}T00:00:00`) : null;
    const todayDate = new Date(`${todayIso}T00:00:00`);
    const daysUntilSortiePrevue =
      sortiePrevueDate && Number.isFinite(sortiePrevueDate.getTime())
        ? Math.round((sortiePrevueDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000))
        : null;
    const hasNonRendu = effets.some(
      (e) => String(e.personId) === String(p.id) && getEffectStatus(p, e) === "NON RENDU"
    );

    let alert = null;
    if (
      sortiePrevue &&
      !sortieReelle &&
      Number.isFinite(daysUntilSortiePrevue) &&
      daysUntilSortiePrevue >= 1 &&
      daysUntilSortiePrevue <= 2
    ) {
      alert = {
        key: `${p.id}-soon`,
        personId: p.id,
        type: "dateSortiePrevue",
        text: `${p.nom} ${p.prenom} : ALERTE - SORTIE PREVUE DANS ${daysUntilSortiePrevue} JOUR${daysUntilSortiePrevue > 1 ? "S" : ""} (${formatDateFr(sortiePrevue)})`,
      };
    } else if (sortiePrevue && !sortieReelle && sortiePrevue <= todayIso) {
      alert = {
        key: `${p.id}-planned`,
        personId: p.id,
        type: "dateSortiePrevue",
        text:
          sortiePrevue === todayIso
            ? `${p.nom} ${p.prenom} : ALERTE - SORTIE PREVUE AUJOURD'HUI (${formatDateFr(sortiePrevue)})`
            : `${p.nom} ${p.prenom} : ALERTE - DATE DE SORTIE PREVUE DEPASSEE (${formatDateFr(sortiePrevue)})`,
      };
    } else if (sortieReelle && sortieReelle <= todayIso && hasNonRendu) {
      alert = {
        key: `${p.id}-real`,
        personId: p.id,
        type: "dateSortieReelle",
        text:
          sortieReelle === todayIso
            ? `${p.nom} ${p.prenom} : ALERTE - SORTIE REELLE AUJOURD'HUI AVEC EFFETS NON RENDUS (${formatDateFr(sortieReelle)})`
            : `${p.nom} ${p.prenom} : ALERTE - DATE DE SORTIE REELLE DEPASSEE (${formatDateFr(sortieReelle)})`,
      };
    }
    return alert ? [alert] : [];
  });
  const signatureAlerts = persons.flatMap((p) => {
    const personEffetsCount = (effets || []).filter((e) => String(e.personId) === String(p.id)).length;
    const arrivalPersonnel = String(p?.signatures?.arrival?.personnel?.validatedAt || "").trim();
    const arrivalRepresentant = String(p?.signatures?.arrival?.representant?.validatedAt || "").trim();
    const exitPersonnel = String(p?.signatures?.exit?.personnel?.validatedAt || "").trim();
    const exitRepresentant = String(p?.signatures?.exit?.representant?.validatedAt || "").trim();
    const arrivalSigned = Boolean(arrivalPersonnel && arrivalRepresentant);
    const exitSigned = Boolean(exitPersonnel && exitRepresentant);

    const hasSignedArchiveFor = (typeLabel, signedAt) => {
      const archives = (documentsArchives || []).filter((entry) => {
        if (String(entry?.personId || "") !== String(p.id || "")) return false;
        if (normalizeTextLocal(entry?.typeDocument) !== normalizeTextLocal(typeLabel)) return false;
        if (normalizeTextLocal(entry?.statutSignature) !== "SIGNE") return false;
        return Boolean(String(entry?.pdfPath || "").trim());
      });
      if (!archives.length) return false;
      if (!signedAt) return true;
      const signedMs = Date.parse(String(signedAt || "")) || 0;
      return archives.some((entry) => (Date.parse(String(entry?.dateArchivage || "")) || 0) >= signedMs);
    };

    const list = [];
    if (personEffetsCount > 0 && !arrivalSigned) {
      list.push({
        key: `${p.id}-sig-arrival`,
        personId: p.id,
        type: "signaturePdf",
        text: `${p.nom} ${p.prenom} : ALERTE - ARRIVEE NON SIGNEE (2 SIGNATURES REQUISES)`,
      });
    } else if (arrivalSigned && !hasSignedArchiveFor("ARRIVEE", arrivalRepresentant || arrivalPersonnel)) {
      list.push({
        key: `${p.id}-pdf-arrival`,
        personId: p.id,
        type: "signaturePdf",
        text: `${p.nom} ${p.prenom} : ALERTE - ARRIVEE SIGNEE, PDF ABSENT OU NON MIS A JOUR`,
      });
    }
    if (exitSigned && !hasSignedArchiveFor("SORTIE", exitRepresentant || exitPersonnel)) {
      list.push({
        key: `${p.id}-pdf-exit`,
        personId: p.id,
        type: "signaturePdf",
        text: `${p.nom} ${p.prenom} : ALERTE - SORTIE SIGNEE, PDF ABSENT OU NON MIS A JOUR`,
      });
    }
    return list;
  });
  const computedAlerts = [...alerts, ...signatureAlerts];
  const readonlyAlerts = Array.isArray(uiAlertsReadonly) ? uiAlertsReadonly : [];
  const allAlerts = readonlyAlerts.length > 0 ? readonlyAlerts : computedAlerts;
  const isAlertListScrollable = allAlerts.length > 3;

  const alertStyle = (type) => {
    if (type === "signaturePdf") {
      return {
        bg: "linear-gradient(90deg, rgba(111, 138, 232, 0.16) 0%, rgba(76, 106, 203, 0.08) 100%)",
        color: "#3450a6",
        border: "rgba(95, 122, 214, 0.34)",
        borderLeft: "rgba(74, 102, 196, 0.96)",
      };
    }
    if (type === "dateSortieReelle") {
      return {
        bg: "linear-gradient(90deg, rgba(242, 136, 136, 0.2) 0%, rgba(218, 87, 87, 0.08) 100%)",
        color: "#8b2a2a",
        border: "rgba(203, 74, 74, 0.34)",
        borderLeft: "rgba(190, 38, 38, 0.95)",
      };
    }
    return {
      bg: "linear-gradient(90deg, rgba(248, 218, 146, 0.22) 0%, rgba(236, 180, 68, 0.08) 100%)",
      color: "#8a5518",
      border: "rgba(214, 156, 46, 0.34)",
      borderLeft: "rgba(219, 145, 11, 0.92)",
    };
  };

  const alertIcon = (type) => (type === "dateSortieReelle" ? "✕" : "!");
  const alertIconStyle = (type) => {
    if (type === "signaturePdf") {
      return {
        background: "linear-gradient(180deg, #7b93eb 0%, #4e66c5 100%)",
        color: "#ffffff",
        boxShadow: "0 4px 10px rgba(78, 102, 197, 0.24)",
      };
    }
    if (type === "dateSortieReelle") {
      return {
        background: "linear-gradient(180deg, #ec7272 0%, #bf3030 100%)",
        color: "#ffffff",
        boxShadow: "0 4px 10px rgba(191, 48, 48, 0.28)",
      };
    }
    return {
      background: "linear-gradient(180deg, #f1cc62 0%, #dc9029 100%)",
      color: "#7a3218",
      boxShadow: "0 4px 10px rgba(220, 144, 41, 0.24)",
    };
  };

  return (
    <div style={{ padding: "12px 12px 0" }}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        {[
          { label: "EN POSTE", value: enPoste },
          { label: "EFFETS CONFIES", value: totalEffets },
          { label: "NON RENDUS A CE JOUR", value: nonRendus },
        ].map(k => (
          <div key={k.label} style={{ ...card, padding: "8px 10px", marginBottom: 0, display: "flex", flexDirection: "column" }}>
            <p style={label}>{k.label}</p>
            <p style={value}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerts (compact) */}
      {allAlerts.length > 0 && (
        <div style={{ ...card, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: "#4a6170", letterSpacing: "0.08em", fontWeight: 700 }}>ALERTES</span>
            <span style={{ fontSize: 9, color: "#8e4d1e", fontWeight: 700 }}>{allAlerts.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: isAlertListScrollable ? 142 : "none", overflowY: isAlertListScrollable ? "auto" : "visible", paddingRight: isAlertListScrollable ? 2 : 0 }}>
            {allAlerts.map((a) => {
              const s = alertStyle(a.type);
              const iconS = alertIconStyle(a.type);
              const person = persons.find((p) => String(p.id) === String(a.personId));
              const personPrefix = person ? `${person.nom || ""} ${person.prenom || ""}`.trim() : "";
              const displayText = personPrefix ? `${personPrefix} : ${a.text}` : a.text;
              return (
                <button
                  key={a.key}
                  onClick={() => person && onSelectPerson(person)}
                  style={{ width: "100%", textAlign: "left", padding: "5px 8px", borderRadius: 8, border: `1px solid ${s.border}`, borderLeft: `3px solid ${s.borderLeft}`, background: s.bg, color: s.color, fontSize: 10, cursor: "pointer" }}
                  title={displayText}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, lineHeight: 1, flex: "0 0 auto", ...iconS }}>
                      {alertIcon(a.type)}
                    </span>
                    <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayText}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ ...card, padding: "8px 10px", marginBottom: 8 }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="RECHERCHER UN NOM, PRENOM, SITE..."
          style={{ width: "100%", padding: "7px 10px", borderRadius: 9, border: "1px solid rgba(173,190,199,0.98)", background: "#fffdfa", fontSize: 12, color: "#0f1e26", boxSizing: "border-box" }}
        />
      </div>

      {/* Person list */}
      <div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#3f5662", fontSize: 11, padding: 20 }}>AUCUN RESULTAT</div>
        )}
        {filtered.map(p => {
          const personEffets = effets.filter(e => e.personId === p.id);
          const dossierStatus = getDossierStatus(p);
          const sc = statusColor(dossierStatus);
          return (
            <button
              key={p.id}
              onClick={() => onSelectPerson(p)}
              style={{ ...card, width: "100%", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0f1e26", marginBottom: 2 }}>{p.nom} {p.prenom}</div>
                <div style={{ fontSize: 10, color: "#3f5662" }}>{(p.sites || []).join(", ")} • {p.typePersonnel || "—"}</div>
                <div style={{ fontSize: 10, color: "#3f5662", marginTop: 2 }}>{personEffets.length} effet(s)</div>
              </div>
              <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 99, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
                {dossierStatus || "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
