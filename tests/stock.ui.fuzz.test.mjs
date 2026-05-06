import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function extractFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Function not found: ${name}`);
  const sig = source.indexOf("(", start);
  if (sig < 0) throw new Error(`Function signature not found: ${name}`);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let j = sig; j < source.length; j += 1) {
    const ch = source[j];
    if (ch === "(") parenDepth += 1;
    if (ch === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        bodyStart = source.indexOf("{", j);
        break;
      }
    }
  }
  if (bodyStart < 0) throw new Error(`Function body not found: ${name}`);
  let i = bodyStart;
  let depth = 0;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Function extraction failed: ${name}`);
}

function createStockContext() {
  const source = fs.readFileSync("app.js", "utf8");
  const fnNames = [
    "normalizeText",
    "normalizeSites",
    "getPersonSites",
    "getReferenceSites",
    "getReferenceSiteLabel",
    "getPersonSiteLabel",
    "referenceHasSite",
    "isReferenceEffectActive",
    "findReferenceById",
    "isCesKeyDesignation",
    "typeUsesReferenceCatalog",
    "getReferenceEffectiveType",
    "getStockReferenceDesignation",
    "getStockGroupingDesignation",
    "getStockSyntheticReferenceValue",
    "parseStockSyntheticReferenceValue",
    "referenceMatchesType",
    "getEffectDisplayDesignation",
    "getEffectDisplaySite",
    "getTodayIsoDate",
    "isPastDate",
    "isExitDue",
    "getEffectStatus",
    "getAllEffects",
    "getStockMovementSignedQuantity",
    "getStockSummaryRows",
  ];

  const context = {
    ALL_SITES_VALUE: "TOUS SITES",
    STOCK_SYNTHETIC_REFERENCE_PREFIX: "__STOCK_SYNTHETIC__:",
    STOCK_EMPTY_DESIGNATION_LABEL: "SANS DESIGNATION",
    state: { data: { personnes: [], listes: { referencesEffets: [] }, stocksEffetsManuels: [] } },
    Date,
  };
  vm.createContext(context);
  for (const name of fnNames) {
    vm.runInContext(extractFunctionSource(source, name), context);
  }
  return context;
}

function makeRng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

test("fuzz stock mechanics stays coherent under random personnel/effects/movements", () => {
  const rng = makeRng(20260506);
  const ctx = createStockContext();

  const types = ["CLE", "CLE CES", "BADGE INTRUSION", "CARTE TURBOSELF", "TELECOMMANDE URMET"];
  const sites = ["CDM", "LGT", "NDC"];
  const statuses = ["ACTIF", "RESTITUE", "PERDU", "VOL", "HS", "DETRUIT", "NON RENDU"];

  // Generate references
  let refId = 1;
  for (const site of sites) {
    for (const type of types) {
      for (let i = 0; i < 5; i += 1) {
        const isCes = type === "CLE CES";
        const designation = isCes ? `CES-${site}-${i}` : `${type.replace(/\s+/g, "_")}-${site}-${i}`;
        ctx.state.data.listes.referencesEffets.push({
          id: `REF${String(refId++).padStart(4, "0")}`,
          site,
          sitesAffectation: [site],
          typeEffet: type,
          designation,
          active: true,
        });
      }
    }
  }

  // Generate personnel + effects
  let personId = 1;
  let effectId = 1;
  const persons = [];
  for (let p = 0; p < 80; p += 1) {
    const person = {
      id: `P${String(personId++).padStart(4, "0")}`,
      nom: `N${p}`,
      prenom: `P${p}`,
      site: pick(rng, sites),
      sitesAffectation: [pick(rng, sites)],
      dateSortiePrevue: "",
      dateSortieReelle: "",
      effetsConfies: [],
    };
    const effectCount = 1 + Math.floor(rng() * 7);
    for (let e = 0; e < effectCount; e += 1) {
      const reference = pick(rng, ctx.state.data.listes.referencesEffets);
      const status = pick(rng, statuses);
      const effect = {
        id: `E${String(effectId++).padStart(5, "0")}`,
        typeEffet: reference.typeEffet,
        referenceEffetId: reference.id,
        siteReference: reference.site,
        designation: reference.designation,
        statutManuel: status === "RESTITUE" || status === "NON RENDU" ? "ACTIF" : status,
        dateRetour: status === "RESTITUE" ? "2026-05-01" : "",
      };
      if (status === "NON RENDU") {
        person.dateSortieReelle = "2026-04-01";
      }
      person.effetsConfies.push(effect);
    }
    persons.push(person);
  }
  ctx.state.data.personnes = persons;

  // Generate manual stock movements
  for (let i = 0; i < 300; i += 1) {
    const reference = pick(rng, ctx.state.data.listes.referencesEffets);
    const action = pick(rng, ["ENTREE", "SORTIE", "AJUSTEMENT_PLUS", "AJUSTEMENT_MOINS"]);
    ctx.state.data.stocksEffetsManuels.push({
      id: `STKM${String(i + 1).padStart(4, "0")}`,
      typeEffet: reference.typeEffet,
      site: reference.site,
      referenceEffetId: reference.id,
      designation: reference.designation,
      action,
      quantite: 1 + Math.floor(rng() * 4),
      motif: "FUZZ",
      commentaire: "",
      date: "2026-05-06",
    });
  }

  const rows = ctx.getStockSummaryRows();
  assert.ok(rows.length > 0);

  // Invariants
  for (const row of rows) {
    assert.equal(Number.isFinite(row.stockCourant), true, `stockCourant NaN for ${row.key}`);
    assert.equal(Number.isFinite(row.manuelDelta), true, `manuelDelta NaN for ${row.key}`);
    assert.equal(Number.isInteger(row.dotes), true, `dotes non-integer for ${row.key}`);
    assert.equal(Number.isInteger(row.rendus), true, `rendus non-integer for ${row.key}`);
    assert.equal(row.stockCourant, row.manuelDelta - row.dotes + row.rendus, `formula mismatch for ${row.key}`);
  }

  // Sanity by type aggregation
  const byType = new Map();
  for (const row of rows) {
    const t = row.typeEffet;
    if (!byType.has(t)) byType.set(t, 0);
    byType.set(t, byType.get(t) + row.stockCourant);
  }
  for (const [type, total] of byType.entries()) {
    assert.equal(Number.isFinite(total), true, `type total NaN for ${type}`);
  }
});

test("legacy CLE reference with CES designation matches CLE CES stock selection", () => {
  const ctx = createStockContext();
  const reference = {
    id: "REF0001",
    site: "CDM",
    sitesAffectation: ["CDM"],
    typeEffet: "CLE",
    designation: "CES-VLOC",
    active: true,
  };

  assert.equal(ctx.getReferenceEffectiveType(reference), "CLE CES");
  assert.equal(ctx.referenceMatchesType(reference, "CLE CES"), true);
  assert.equal(ctx.referenceMatchesType(reference, "CLE"), false);

  ctx.state.data.listes.referencesEffets.push(reference);
  const rows = ctx.getStockSummaryRows();
  assert.equal(rows.some((row) => row.typeEffet === "CLE CES" && row.designation === "CES-VLOC"), true);
});

test("manual stock supports references with empty base designation", () => {
  const ctx = createStockContext();
  const reference = {
    id: "REF_EMPTY",
    site: "CDM",
    sitesAffectation: ["CDM"],
    typeEffet: "BADGE INTRUSION",
    designation: "",
    active: true,
  };

  ctx.state.data.listes.referencesEffets.push(reference);
  ctx.state.data.stocksEffetsManuels.push({
    id: "STKM_EMPTY",
    typeEffet: "BADGE INTRUSION",
    site: "CDM",
    referenceEffetId: "REF_EMPTY",
    designation: ctx.getStockReferenceDesignation(reference),
    action: "ENTREE",
    quantite: 3,
    motif: "TEST",
    commentaire: "",
    date: "2026-05-06",
  });

  const rows = ctx.getStockSummaryRows();
  const row = rows.find(
    (entry) =>
      entry.site === "CDM" &&
      entry.typeEffet === "BADGE INTRUSION" &&
      entry.designation === "SANS DESIGNATION"
  );
  assert.ok(row);
  assert.equal(row.manuelDelta, 3);
  assert.equal(row.stockCourant, 3);
});

test("stock summary groups effects without reference or designation as sans designation", () => {
  const ctx = createStockContext();
  ctx.state.data.personnes.push({
    id: "P_EMPTY_EFFECT",
    nom: "TEST",
    prenom: "STOCK",
    site: "CDM",
    sitesAffectation: ["CDM"],
    effetsConfies: [
      {
        id: "E_EMPTY_EFFECT",
        typeEffet: "BADGE INTRUSION",
        designation: "",
        referenceEffetId: "",
        statutManuel: "ACTIF",
      },
    ],
  });

  const rows = ctx.getStockSummaryRows();
  const row = rows.find(
    (entry) =>
      entry.site === "CDM" &&
      entry.typeEffet === "BADGE INTRUSION" &&
      entry.designation === "SANS DESIGNATION"
  );
  assert.ok(row);
  assert.equal(row.dotes, 1);
  assert.equal(row.stockCourant, -1);
});

test("synthetic stock reference keys separate same designation across sites", () => {
  const ctx = createStockContext();
  const cdmKey = ctx.getStockSyntheticReferenceValue("CDM", "CARTE TURBOSELF", "SANS DESIGNATION");
  const allSitesKey = ctx.getStockSyntheticReferenceValue("TOUS SITES", "CARTE TURBOSELF", "SANS DESIGNATION");

  assert.notEqual(cdmKey, allSitesKey);
  assert.equal(JSON.stringify(ctx.parseStockSyntheticReferenceValue(cdmKey)), JSON.stringify({
    site: "CDM",
    typeEffet: "CARTE TURBOSELF",
    designation: "SANS DESIGNATION",
  }));
  assert.equal(JSON.stringify(ctx.parseStockSyntheticReferenceValue(allSitesKey)), JSON.stringify({
    site: "TOUS SITES",
    typeEffet: "CARTE TURBOSELF",
    designation: "SANS DESIGNATION",
  }));
});

test("stock grouping ignores designation for badge card and remote control types", () => {
  const ctx = createStockContext();
  const groupedTypes = ["BADGE INTRUSION", "CARTE TURBOSELF", "TELECOMMANDE URMET"];

  for (const typeEffet of groupedTypes) {
    ctx.state.data.personnes.push({
      id: `P_${typeEffet.replace(/\s+/g, "_")}`,
      nom: "TEST",
      prenom: typeEffet,
      site: "CDM",
      sitesAffectation: ["CDM"],
      effetsConfies: [
        {
          id: `E_${typeEffet.replace(/\s+/g, "_")}`,
          typeEffet,
          designation: "NUMERO-INDIVIDUEL",
          referenceEffetId: "",
          statutManuel: "ACTIF",
        },
      ],
    });
  }

  const rows = ctx.getStockSummaryRows();
  for (const typeEffet of groupedTypes) {
    assert.equal(ctx.getStockGroupingDesignation(typeEffet, "NUMERO-INDIVIDUEL"), "SANS DESIGNATION");
    assert.equal(
      rows.some((row) => row.site === "CDM" && row.typeEffet === typeEffet && row.designation === "SANS DESIGNATION"),
      true
    );
    assert.equal(
      rows.some((row) => row.site === "CDM" && row.typeEffet === typeEffet && row.designation === "NUMERO-INDIVIDUEL"),
      false
    );
  }
});
