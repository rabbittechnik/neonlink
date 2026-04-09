/** Einheitliches Modell für die Abfahrts-Anzeige (BVG/DB-kompatibel mappbar). */

export type TransitLineType = "SBAHN" | "ICE" | "RE" | "BUS" | "SUBWAY" | "TRAM" | "OTHER";

export type TransitDeparture = {
  id: string;
  minutes: number;
  line: string;
  type: TransitLineType;
  /** Kurze Weg-Beschreibung (Zwischenhalte oft nicht von der API geliefert). */
  route: string;
  destination: string;
  platform: string | null;
  /** HH:mm */
  time: string;
  /** Verspätung in Minuten (nur wenn > 0 sinnvoll anzeigen). */
  delayMinutes: number | null;
};

export type TransitStopRef = {
  id: string;
  name: string;
  distance?: number;
};
