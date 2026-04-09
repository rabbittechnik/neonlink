/**
 * Tarifverbünde / regionale Netze (Übersicht für Nutzer:innen).
 * Live-Daten kommen je nach Quelle über HAFAS (DB, VBB, BVG, HVV, …), nicht jeder Verbund hat eine eigene öffentliche API.
 */
export type VerbundRegion = {
  land: string;
  /** Kurz: welche HAFAS-/Tarif-Ebene zu Live-Abfahrten passt (Orientierung, kein Rechtsanspruch). */
  coverageHint: string;
  verbuende: { kurz: string; name: string }[];
};

export const GERMAN_TRANSIT_VERBUENDE: VerbundRegion[] = [
  {
    land: "Baden-Württemberg",
    coverageHint: "Live-Abfahrten typischerweise über DB-HAFAS (bundesweit); regionale Tarife: VVS, KVV, …",
    verbuende: [
      { kurz: "VVS", name: "Stuttgart" },
      { kurz: "KVV", name: "Karlsruhe" },
      { kurz: "VRN", name: "Rhein-Neckar" },
      { kurz: "DING", name: "Donau-Iller" },
      { kurz: "naldo", name: "Neckar-Alb-Donau" },
      { kurz: "VGF", name: "Freiburg" },
      { kurz: "VSB", name: "Schwarzwald-Baar-Heuberg" },
      { kurz: "bodo", name: "Bodensee-Oberschwaben" },
    ],
  },
  {
    land: "Bayern",
    coverageHint: "DB-HAFAS; Großräume oft MVV / VGN / … als Tarifverbünde",
    verbuende: [
      { kurz: "MVV", name: "München" },
      { kurz: "VGN", name: "Nürnberg" },
      { kurz: "AVV", name: "Augsburg" },
      { kurz: "RVV", name: "Regensburg" },
      { kurz: "VVM", name: "Mainfranken" },
      { kurz: "VGO", name: "Oberallgäu" },
      { kurz: "VGI", name: "Ingolstadt" },
    ],
  },
  {
    land: "Berlin / Brandenburg",
    coverageHint: "Nah: VBB-HAFAS oder BVG; „In der Nähe“ (Auto) nutzt hier VBB mit Fallback",
    verbuende: [{ kurz: "VBB", name: "Verkehrsverbund Berlin-Brandenburg" }],
  },
  {
    land: "Hessen",
    coverageHint: "DB-HAFAS; RMV/NVV als Tarifverbünde",
    verbuende: [
      { kurz: "RMV", name: "Rhein-Main" },
      { kurz: "NVV", name: "Nordhessen" },
    ],
  },
  {
    land: "Nordrhein-Westfalen",
    coverageHint: "DB-HAFAS; VRR, VRS, … als regionale Tarife",
    verbuende: [
      { kurz: "VRR", name: "Rhein-Ruhr" },
      { kurz: "VRS", name: "Rhein-Sieg" },
      { kurz: "AVV", name: "Aachen" },
      { kurz: "Westfalentarif", name: "Westfalen" },
    ],
  },
  {
    land: "Niedersachsen / Bremen",
    coverageHint: "DB-HAFAS; VBN, GVH, VRB als Verbünde",
    verbuende: [
      { kurz: "VBN", name: "Bremen/Niedersachsen" },
      { kurz: "GVH", name: "Hannover" },
      { kurz: "VRB", name: "Braunschweig" },
    ],
  },
  {
    land: "Hamburg / Schleswig-Holstein",
    coverageHint: "Großraum Hamburg: HVV-HAFAS; sonst DB · NAH.SH Tarif SH",
    verbuende: [
      { kurz: "HVV", name: "Hamburg" },
      { kurz: "NAH.SH", name: "Schleswig-Holstein" },
    ],
  },
  {
    land: "Rheinland-Pfalz / Saarland",
    coverageHint: "DB-HAFAS; VRN (RLP) u. a. — Namenskollision mit VRN Baden-Württemberg beachten",
    verbuende: [
      { kurz: "VRN", name: "Rhein-Neckar (RLP)" },
      { kurz: "RNN", name: "Nahe-Nahverkehr" },
      { kurz: "VRT", name: "Trier" },
      { kurz: "saarVV", name: "Saarland" },
    ],
  },
  {
    land: "Sachsen",
    coverageHint: "DB-HAFAS; VVO, MDV, VMS",
    verbuende: [
      { kurz: "VVO", name: "Dresden" },
      { kurz: "MDV", name: "Leipzig" },
      { kurz: "VMS", name: "Chemnitz" },
    ],
  },
  {
    land: "Sachsen-Anhalt",
    coverageHint: "DB-HAFAS; MDV, marego",
    verbuende: [
      { kurz: "MDV", name: "Mitteldeutschland" },
      { kurz: "marego", name: "Magdeburg" },
    ],
  },
  {
    land: "Thüringen",
    coverageHint: "DB-HAFAS; VMT",
    verbuende: [{ kurz: "VMT", name: "Mittelthüringen" }],
  },
  {
    land: "Mecklenburg-Vorpommern",
    coverageHint: "DB-HAFAS; VVG, NVS",
    verbuende: [
      { kurz: "VVG", name: "Vorpommern" },
      { kurz: "NVS", name: "Schwerin" },
    ],
  },
];
