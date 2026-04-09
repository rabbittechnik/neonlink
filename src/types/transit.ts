/** Einheitliches Modell für die Abfahrts-Anzeige (BVG/DB-kompatibel mappbar). */

/** Datenquelle: BVG (v6.bvg) im Berlin/Brandenburg-Gebiet, sonst DB (v6.db). */
export type TransitProvider = "bvg" | "db";

export type TransitLineType = "SBAHN" | "ICE" | "RE" | "BUS" | "SUBWAY" | "TRAM" | "OTHER";

export type TransitDeparture = {
  id: string;
  minutes: number;
  line: string;
  type: TransitLineType;
  /** Zwischenstationen / Weg (oft nur ein oder zwei Einträge von HAFAS). */
  route: string[];
  destination: string;
  platform: string | null;
  /** HH:mm */
  time: string;
  /** Verspätung in Minuten (nur wenn > 0 sinnvoll anzeigen). */
  delayMinutes: number | null;
  /** Optional: z. B. hafas_db, hafas_bvg — gesetzt wenn Backend liefert. */
  sources?: string[];
};

export type TransitStopRef = {
  id: string;
  name: string;
  /** Welche API die Haltestelle bedient (IDs sind nicht übertragbar). */
  provider: TransitProvider;
  distance?: number;
};
