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
    "normalizeCesDesignationLabel",
    "normalizeReferenceDesignationByType",
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
    "normalizeDateString",
    "isExitDue",
    "getEffectStatus",
    "getAllEffects",
    "getStockMovementSignedQuantity",
    "referenceMatchesStockIdentity",
    "hasActiveStockReference",
    "isStockMovementAllowedInSummary",
    "getFilteredStockSummaryRows",
    "getStockInstantSelectionValue",
    "getStockSummaryRows",
  ];

  const context = {
    ALL_SITES_VALUE: "TOUS SITES",
    ALL_TYPES_VALUE: "TOUS TYPES",
    ALL_DESIGNATIONS_VALUE: "TOUTES DESIGNATIONS",
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

function stockRowKey(row) {
  return `${row.site}__${row.typeEffet}__${row.designation}`;
}

function indexStockRows(rows) {
  return new Map(rows.map((row) => [stockRowKey(row), row]));
}

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function normalizeTestText(value) {
  return String(value || "").trim().toUpperCase();
}

function expectedStatusCounters(person, effect) {
  const status = person.dateSortieReelle && !effect.dateRetour && normalizeTestText(effect.statutManuel) === "ACTIF"
    ? "NON RENDU"
    : effect.dateRetour
      ? "RESTITUE"
      : normalizeTestText(effect.statutManuel || "ACTIF");
  return {
    rendus: status === "RESTITUE" ? 1 : 0,
    nonRendus: status === "NON RENDU" ? 1 : 0,
    perdus: status === "PERDU" ? 1 : 0,
    voles: status === "VOL" ? 1 : 0,
    hs: status === "HS" ? 1 : 0,
    detruits: status === "DETRUIT" ? 1 : 0,
  };
}

function effectUsesIndividualNumber(typeEffet) {
  return ["BADGE INTRUSION", "CARTE TURBOSELF", "TELECOMMANDE URMET"].includes(String(typeEffet || "").trim().toUpperCase());
}

function aggregateStockByType(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.typeEffet, (map.get(row.typeEffet) || 0) + Number(row.stockCourant || 0));
  }
  return map;
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

test("complete stock logic fuzz covers manual automatic save reload and all effect shapes", () => {
  const ctx = createStockContext();
  const sites = ["CDM", "LGT", "NDC", "TOUS SITES"];
  const types = ["CLE", "CLE CES", "BADGE INTRUSION", "CARTE TURBOSELF", "TELECOMMANDE URMET"];
  const manualActions = ["ENTREE", "SORTIE", "AJUSTEMENT_PLUS", "AJUSTEMENT_MOINS"];
  const manualReasons = ["CORRECTION INVENTAIRE", "DOUBLE", "ACHAT", "CASSE", "PERTE", "VOL"];
  const statuses = ["ACTIF", "RESTITUE", "PERDU", "VOL", "HS", "DETRUIT", "NON RENDU"];
  const expected = new Map();

  const addExpected = (site, typeEffet, designation, patch) => {
    const row = {
      site: ctx.normalizeText(site),
      typeEffet: ctx.normalizeText(typeEffet),
      designation: ctx.getStockGroupingDesignation(typeEffet, designation),
      dotes: 0,
      rendus: 0,
      nonRendus: 0,
      perdus: 0,
      voles: 0,
      hs: 0,
      detruits: 0,
      manuelDelta: 0,
    };
    const key = stockRowKey(row);
    const current = expected.get(key) || row;
    Object.entries(patch).forEach(([field, value]) => {
      current[field] += value;
    });
    expected.set(key, current);
  };

  let refSeq = 1;
  const references = [];
  for (const site of sites) {
    for (const typeEffet of types) {
      const designations = typeEffet === "CLE"
        ? ["A1", "E1???", ""]
        : typeEffet === "CLE CES"
          ? ["CES-PG", "CES-VLOC", ""]
          : ["", `${typeEffet.replace(/\s+/g, "-")}-${site}`];
      for (const designation of designations) {
        const reference = {
          id: `REF_FUZZ_${String(refSeq++).padStart(4, "0")}`,
          site,
          sitesAffectation: [site],
          typeEffet: typeEffet === "CLE CES" ? "CLE" : typeEffet,
          designation,
          active: true,
        };
        references.push(reference);
        ctx.state.data.listes.referencesEffets.push(reference);
        const effectiveType = ctx.getReferenceEffectiveType(reference);
        addExpected(site, effectiveType, ctx.getStockReferenceDesignation(reference), {});
      }
    }
  }

  let moveSeq = 1;
  references.forEach((reference, index) => {
    const effectiveType = ctx.getReferenceEffectiveType(reference);
    const designation = ctx.getStockReferenceDesignation(reference);
    manualActions.forEach((action, actionIndex) => {
      const quantity = actionIndex + 1;
      const movement = {
        id: `STKM_FUZZ_${String(moveSeq++).padStart(5, "0")}`,
        typeEffet: effectiveType,
        site: ctx.getReferenceSiteLabel(reference),
        referenceEffetId: index % 2 === 0 ? reference.id : "",
        designation,
        action,
        quantite: quantity,
        motif: manualReasons[(index + actionIndex) % manualReasons.length],
        commentaire: "FUZZ MANUAL",
        date: "2026-05-07",
      };
      ctx.state.data.stocksEffetsManuels.push(movement);
      if (ctx.isStockMovementAllowedInSummary(movement)) {
        addExpected(movement.site, movement.typeEffet, movement.designation, {
          manuelDelta: ctx.getStockMovementSignedQuantity(movement),
        });
      }
    });
  });

  let personSeq = 1;
  let effectSeq = 1;
  references.forEach((reference, index) => {
    const effectiveType = ctx.getReferenceEffectiveType(reference);
    const site = ctx.getReferenceSiteLabel(reference);
    const designation = ctx.getStockReferenceDesignation(reference);
    statuses.forEach((status, statusIndex) => {
      const person = {
        id: `P_FUZZ_${String(personSeq++).padStart(5, "0")}`,
        nom: "FUZZ",
        prenom: `${effectiveType}_${status}_${statusIndex}`,
        site,
        sitesAffectation: [site],
        dateSortiePrevue: "",
        dateSortieReelle: status === "NON RENDU" ? "2026-05-01" : "",
        effetsConfies: [],
      };
      const effect = {
        id: `E_FUZZ_${String(effectSeq++).padStart(6, "0")}`,
        typeEffet: effectiveType,
        siteReference: site,
        referenceEffetId: reference.id,
        designation,
        numeroIdentification: effectUsesIndividualNumber(effectiveType) ? `NUM-${index}-${statusIndex}` : "",
        statutManuel: status === "RESTITUE" || status === "NON RENDU" ? "ACTIF" : status,
        dateRetour: status === "RESTITUE" ? "2026-05-02" : "",
      };
      person.effetsConfies.push(effect);
      ctx.state.data.personnes.push(person);

      const counters = expectedStatusCounters(person, effect);
      addExpected(site, effectiveType, designation, {
        dotes: 1,
        ...counters,
      });
    });
  });

  ctx.state.data.stocksEffetsManuels.push({
    id: "STKM_ORPHAN_AFTER_DELETE",
    typeEffet: "CLE",
    site: "CDM",
    referenceEffetId: "",
    designation: "SUPPRIMEE-ORPHELINE",
    action: "ENTREE",
    quantite: 9,
    motif: "CORRECTION INVENTAIRE",
    date: "2026-05-07",
  });

  const mutationRefA = references.find(
    (reference) => ctx.getReferenceEffectiveType(reference) === "CLE" && ctx.getReferenceSiteLabel(reference) === "CDM"
  );
  const mutationRefB = references.find(
    (reference) => ctx.getReferenceEffectiveType(reference) === "CLE CES" && ctx.getReferenceSiteLabel(reference) === "LGT"
  );
  const mutationRefC = references.find(
    (reference) => ctx.getReferenceEffectiveType(reference) === "TELECOMMANDE URMET" && ctx.getReferenceSiteLabel(reference) === "NDC"
  );

  const mutatedPerson = {
    id: "P_MUTATION_STOCK",
    nom: "MUTATION",
    prenom: "STOCK",
    site: "CDM",
    sitesAffectation: ["CDM"],
    dateSortiePrevue: "",
    dateSortieReelle: "",
    effetsConfies: [],
  };

  const addedThenRemovedEffect = {
    id: "E_ADDED_THEN_REMOVED",
    typeEffet: ctx.getReferenceEffectiveType(mutationRefA),
    siteReference: ctx.getReferenceSiteLabel(mutationRefA),
    referenceEffetId: mutationRefA.id,
    designation: ctx.getStockReferenceDesignation(mutationRefA),
    statutManuel: "ACTIF",
    dateRetour: "",
  };
  mutatedPerson.effetsConfies.push(addedThenRemovedEffect);
  mutatedPerson.effetsConfies = mutatedPerson.effetsConfies.filter((effect) => effect.id !== "E_ADDED_THEN_REMOVED");

  const modifiedEffect = {
    id: "E_MODIFIED_SITE_TYPE_DESIGNATION",
    typeEffet: ctx.getReferenceEffectiveType(mutationRefA),
    siteReference: ctx.getReferenceSiteLabel(mutationRefA),
    referenceEffetId: mutationRefA.id,
    designation: ctx.getStockReferenceDesignation(mutationRefA),
    statutManuel: "ACTIF",
    dateRetour: "",
  };
  modifiedEffect.typeEffet = ctx.getReferenceEffectiveType(mutationRefB);
  modifiedEffect.siteReference = ctx.getReferenceSiteLabel(mutationRefB);
  modifiedEffect.referenceEffetId = mutationRefB.id;
  modifiedEffect.designation = ctx.getStockReferenceDesignation(mutationRefB);
  modifiedEffect.statutManuel = "PERDU";
  mutatedPerson.effetsConfies.push(modifiedEffect);
  addExpected(modifiedEffect.siteReference, modifiedEffect.typeEffet, modifiedEffect.designation, {
    dotes: 1,
    perdus: 1,
  });

  const returnedOnExitEffect = {
    id: "E_RETURNED_ON_EXIT",
    typeEffet: ctx.getReferenceEffectiveType(mutationRefC),
    siteReference: ctx.getReferenceSiteLabel(mutationRefC),
    referenceEffetId: mutationRefC.id,
    designation: ctx.getStockReferenceDesignation(mutationRefC),
    statutManuel: "ACTIF",
    dateRetour: "2026-05-06",
  };
  mutatedPerson.dateSortieReelle = "2026-05-07";
  mutatedPerson.effetsConfies.push(returnedOnExitEffect);
  addExpected(returnedOnExitEffect.siteReference, returnedOnExitEffect.typeEffet, returnedOnExitEffect.designation, {
    dotes: 1,
    rendus: 1,
  });

  ctx.state.data.personnes.push(mutatedPerson);

  let rows = ctx.getStockSummaryRows();
  let actual = indexStockRows(rows);

  for (const [key, expectedRow] of expected.entries()) {
    const row = actual.get(key);
    assert.ok(row, `missing stock row ${key}`);
    assert.equal(row.dotes, expectedRow.dotes, `dotes mismatch ${key}`);
    assert.equal(row.rendus, expectedRow.rendus, `rendus mismatch ${key}`);
    assert.equal(row.nonRendus, expectedRow.nonRendus, `nonRendus mismatch ${key}`);
    assert.equal(row.perdus, expectedRow.perdus, `perdus mismatch ${key}`);
    assert.equal(row.voles, expectedRow.voles, `voles mismatch ${key}`);
    assert.equal(row.hs, expectedRow.hs, `hs mismatch ${key}`);
    assert.equal(row.detruits, expectedRow.detruits, `detruits mismatch ${key}`);
    assert.equal(row.manuelDelta, expectedRow.manuelDelta, `manual delta mismatch ${key}`);
    assert.equal(row.stockCourant, row.manuelDelta - row.dotes + row.rendus, `formula mismatch ${key}`);
  }

  assert.equal(
    rows.some((row) => row.typeEffet === "CLE" && row.designation === "SUPPRIMEE-ORPHELINE"),
    false,
    "orphan precise key movement must not create stock row"
  );

  assert.equal(
    rows.some((row) => row.key.includes("E_ADDED_THEN_REMOVED")),
    false,
    "removed effects must not leave stock rows"
  );

  const allRowsKpi = aggregateStockByType(rows);
  ctx.state.stockTableFilters = { site: "", typeEffet: "", referenceEffetId: "" };
  const visibleRows = ctx.getFilteredStockSummaryRows();
  assert.deepEqual(
    Array.from(aggregateStockByType(visibleRows).entries()).sort(),
    Array.from(allRowsKpi.entries()).sort(),
    "KPI totals must match visible stock table with no filters"
  );

  const cesCases = [
    ["VLOC", "CES-VLOC"],
    ["CES VLOC", "CES-VLOC"],
    ["CES-VLOC", "CES-VLOC"],
    ["ces_pg", "CES-PG"],
    [" CES - PG ", "CES-PG"],
    ["CES-CES-PG", "CES-PG"],
  ];
  for (const [input, expectedLabel] of cesCases) {
    assert.equal(ctx.normalizeCesDesignationLabel(input), expectedLabel, `CES label normalization mismatch for ${input}`);
    assert.equal(
      ctx.normalizeReferenceDesignationByType("CLE CES", input),
      expectedLabel,
      `CLE CES reference normalization mismatch for ${input}`
    );
    assert.equal(ctx.isCesKeyDesignation(expectedLabel), true, `normalized CES label must be detected for ${input}`);
  }

  for (const site of sites) {
    ctx.state.stockTableFilters = { site, typeEffet: "", referenceEffetId: "" };
    const filteredRows = ctx.getFilteredStockSummaryRows();
    assert.equal(
      filteredRows.every((row) => row.site === site || site === "TOUS SITES"),
      true,
      `site filter mismatch for ${site}`
    );
    const filteredKpi = aggregateStockByType(filteredRows);
    for (const [typeEffet, total] of filteredKpi.entries()) {
      const manualTotal = filteredRows
        .filter((row) => row.typeEffet === typeEffet)
        .reduce((sum, row) => sum + row.stockCourant, 0);
      assert.equal(total, manualTotal, `KPI filtered total mismatch ${site}/${typeEffet}`);
    }
  }

  const beforeReload = rows.map((row) => ({ ...row })).sort((a, b) => stockRowKey(a).localeCompare(stockRowKey(b), "fr"));
  const reloaded = createStockContext();
  reloaded.state.data = cloneData(ctx.state.data);
  const afterReload = reloaded.getStockSummaryRows()
    .map((row) => ({ ...row }))
    .sort((a, b) => stockRowKey(a).localeCompare(stockRowKey(b), "fr"));
  assert.equal(
    JSON.stringify(afterReload),
    JSON.stringify(beforeReload),
    "stock summary must be stable after JSON save/reload"
  );
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

test("all-sites CLE CES reference can receive manual stock movement", () => {
  const ctx = createStockContext();
  const reference = {
    id: "REF_CES_PG",
    site: "TOUS SITES",
    sitesAffectation: ["TOUS SITES"],
    typeEffet: "CLE",
    designation: "CES-PG",
    active: true,
  };

  ctx.state.data.listes.referencesEffets.push(reference);
  ctx.state.data.stocksEffetsManuels.push({
    id: "STKM_CES_PG",
    typeEffet: ctx.getReferenceEffectiveType(reference),
    site: "TOUS SITES",
    referenceEffetId: reference.id,
    designation: ctx.getStockReferenceDesignation(reference),
    action: "ENTREE",
    quantite: 2,
    motif: "TEST",
    commentaire: "",
    date: "2026-05-06",
  });

  const rows = ctx.getStockSummaryRows();
  const row = rows.find(
    (entry) => entry.site === "TOUS SITES" && entry.typeEffet === "CLE CES" && entry.designation === "CES-PG"
  );
  assert.ok(row);
  assert.equal(row.manuelDelta, 2);
  assert.equal(row.stockCourant, 2);
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

test("instant stock KPI value totals visible stock summary rows from current filters", () => {
  const ctx = createStockContext();
  ctx.state.data.listes.referencesEffets = [
    {
      id: "REF_REMOTE",
      site: "CDM",
      typeEffet: "TELECOMMANDE URMET",
      designation: "URMET 12",
      statut: "ACTIF",
    },
  ];
  ctx.state.data.personnes = [
    {
      id: "P1",
      nom: "DUPONT",
      prenom: "ALICE",
      site: "CDM",
      effets: [
        {
          id: "E1",
          referenceEffetId: "REF_REMOTE",
          typeEffet: "TELECOMMANDE URMET",
          designation: "URMET 12",
          dateRemise: "2026-05-01",
          statutManuel: "ACTIF",
        },
      ],
    },
  ];
  ctx.state.data.stocksEffetsManuels = [
    {
      id: "STKM1",
      typeEffet: "TELECOMMANDE URMET",
      site: "CDM",
      referenceEffetId: "REF_REMOTE",
      designation: "TELECOMMANDE URMET",
      action: "ENTREE",
      quantite: 4,
      motif: "ACHAT",
      date: "2026-05-07",
    },
  ];

  const summaryRow = ctx.getStockSummaryRows().find(
    (row) => row.site === "CDM" && row.typeEffet === "TELECOMMANDE URMET" && row.designation === "SANS DESIGNATION"
  );
  const instant = ctx.getStockInstantSelectionValue({
    site: "CDM",
    typeEffet: "TELECOMMANDE URMET",
    referenceEffetId: "REF_REMOTE",
  });

  assert.equal(summaryRow.stockCourant, 4);
  assert.equal(instant.isPrecise, true);
  assert.equal(instant.stockCourant, summaryRow.stockCourant);
  assert.equal(
    ctx.getStockInstantSelectionValue({ site: "CDM", typeEffet: "TELECOMMANDE URMET", referenceEffetId: "" }).stockCourant,
    summaryRow.stockCourant
  );
  assert.equal(
    ctx.getStockInstantSelectionValue({ site: "NDC", typeEffet: "TELECOMMANDE URMET", referenceEffetId: "" }).isPrecise,
    false
  );
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

test("orphan manual key stock movement is hidden when reference no longer exists", () => {
  const ctx = createStockContext();

  ctx.state.data.stocksEffetsManuels.push({
    id: "STKM_ORPHAN_E1",
    typeEffet: "CLE",
    site: "CDM",
    referenceEffetId: "",
    designation: "E1???",
    action: "ENTREE",
    quantite: 1,
    motif: "CORRECTION INVENTAIRE",
    date: "2026-05-06",
  });

  const rows = ctx.getStockSummaryRows();
  assert.equal(
    rows.some((row) => row.site === "CDM" && row.typeEffet === "CLE" && row.designation === "E1???"),
    false
  );
});

test("manual key stock movement remains visible while matching reference is active", () => {
  const ctx = createStockContext();

  ctx.state.data.listes.referencesEffets.push({
    id: "REF_E1",
    site: "CDM",
    sitesAffectation: ["CDM"],
    typeEffet: "CLE",
    designation: "E1???",
    active: true,
  });
  ctx.state.data.stocksEffetsManuels.push({
    id: "STKM_E1",
    typeEffet: "CLE",
    site: "CDM",
    referenceEffetId: "",
    designation: "E1???",
    action: "ENTREE",
    quantite: 1,
    motif: "CORRECTION INVENTAIRE",
    date: "2026-05-06",
  });

  const rows = ctx.getStockSummaryRows();
  const row = rows.find((entry) => entry.site === "CDM" && entry.typeEffet === "CLE" && entry.designation === "E1???");
  assert.equal(row?.manuelDelta, 1);
  assert.equal(row?.stockCourant, 1);
});


