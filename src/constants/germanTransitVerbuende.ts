/**
 * Tarifverbünde / regionale Netze (Übersicht für Nutzer:innen).
 * Live-Daten kommen je nach Quelle über HAFAS (DB, VBB, BVG, HVV, …), nicht jeder Verbund hat eine eigene öffentliche API.
 */
export type VerbundEntry = {
  kurz: string;
  name: string;
  /**
   * Recherche: wo der Verbund technisch Fahrplan/Live anbietet (EFA, TRIAS, GTFS …).
   * Kein Rechtsanspruch; NeonLink bindet weiter die gemeinsame DB-HAFAS-Schicht ein, wo nicht anders vermerkt.
   */
  liveAuskunft?: string;
};

export type VerbundRegion = {
  land: string;
  /** Kurz: welche HAFAS-/Tarif-Ebene zu Live-Abfahrten passt (Orientierung, kein Rechtsanspruch). */
  coverageHint: string;
  verbuende: VerbundEntry[];
};

export const GERMAN_TRANSIT_VERBUENDE: VerbundRegion[] = [
  {
    land: "Baden-Württemberg",
    coverageHint:
      "Kein öffentliches transport.rest pro Verbund wie DB/VBB/HVV. Live kommt bei den Verbünden meist über EFA/TRIAS/GTFS (teils nur nach Anmeldung). In NeonLink: Haltestellen- und Abfahrtsdaten über DB-HAFAS (Modus „DB“ bzw. Auto).",
    verbuende: [
      {
        kurz: "VVS",
        name: "Stuttgart",
        liveAuskunft:
          "Web-Fahrplan nutzt EFA; OpenData (GTFS, Haltestellen), TRIAS/GTFS-RT u. a. auf Anfrage beim VVS (OpenData). Kein freies HAFAS-REST wie v6.db. In dieser App: Live über DB-HAFAS.",
      },
      {
        kurz: "KVV",
        name: "Karlsruhe",
        liveAuskunft:
          "GTFS täglich (Open Data, CC0); EFA/TRIAS für Entwickler nach Formular (fahrplan@kvv…). Echtzeit in EFA, wo freigeschaltet. Frühere „Live“-JSON-URLs sind inoffiziell / wechselhaft. In dieser App: DB-HAFAS.",
      },
      {
        kurz: "VRN",
        name: "Rhein-Neckar",
        liveAuskunft:
          "Open-Data-Portal: GTFS + GTFS-Realtime (Echtzeit Bus/Straßenbahn, ohne SPNV im GTFS); „Open Service“ TRIAS mit Registrierung. In dieser App: DB-HAFAS.",
      },
      {
        kurz: "DING",
        name: "Donau-Iller",
        liveAuskunft:
          "EFA-Mobile (Abfahrtsmonitor, z. B. DM-Requests mit Echtzeit). Kein separates transport.rest. In dieser App: DB-HAFAS.",
      },
      {
        kurz: "naldo",
        name: "Neckar-Alb-Donau",
        liveAuskunft:
          "Verbund verweist auf landesweite Angebote (u. a. Mobidata-BW / TRIAS-EFA-BW); kein eigenes globales öffentliches REST-API. In dieser App: DB-HAFAS.",
      },
      {
        kurz: "VGF",
        name: "Freiburg",
        liveAuskunft:
          "Regional über VAG/EFA und Tarifverbund; Live typisch in Verbund-Apps/Web. In dieser App: DB-HAFAS.",
      },
      {
        kurz: "VSB",
        name: "Schwarzwald-Baar-Heuberg",
        liveAuskunft:
          "Regional über EFA-basierte Auskünfte (BW); keine eigene transport.rest-Instanz. In dieser App: DB-HAFAS.",
      },
      {
        kurz: "bodo",
        name: "Bodensee-Oberschwaben",
        liveAuskunft:
          "EFA-gestützte Fahrpläne im Verbundgebiet; keine eigene öffentliche HAFAS-REST-Schicht. In dieser App: DB-HAFAS.",
      },
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
