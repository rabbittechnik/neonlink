export const MIETE_PAID_LABELS = {
    person1: "Person 1",
    person2: "Person 2",
    household: "Haushalt gesamt",
};
/** Pflicht-/Standardfelder + erweiterbare monatliche Kosten (alles monatlich). */
export const HOUSEHOLD_SIMPLE_COST_KEYS = [
    { centsKey: "internetCents", label: "Internet" },
    { centsKey: "versicherungenCents", label: "Versicherungen" },
    { centsKey: "autoCents", label: "Auto", hint: "Sprit, Leasing, Versicherung …" },
    { centsKey: "stromCents", label: "Strom" },
    { centsKey: "wasserCents", label: "Wasser" },
    { centsKey: "heizungCents", label: "Heizung" },
    { centsKey: "handyCents", label: "Handyverträge" },
    { centsKey: "streamingCents", label: "Streaming & Abos", hint: "Netflix & Co." },
    { centsKey: "krediteCents", label: "Kredite / Raten" },
    { centsKey: "lebensmittelCents", label: "Lebensmittel", hint: "optional als Durchschnitt" },
];
export function emptyHouseholdCosts() {
    return {
        mieteCents: 0,
        mietePaidBy: "household",
        internetCents: 0,
        versicherungenCents: 0,
        autoCents: 0,
        stromCents: 0,
        wasserCents: 0,
        heizungCents: 0,
        handyCents: 0,
        streamingCents: 0,
        krediteCents: 0,
        lebensmittelCents: 0,
    };
}
export function eurosStringToCents(raw) {
    const t = raw.replace(",", ".").trim();
    if (!t)
        return 0;
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n) || n < 0)
        return 0;
    return Math.round(n * 100);
}
export function centsToEurosInput(cents) {
    if (!cents)
        return "";
    return (cents / 100).toFixed(2).replace(".", ",");
}
export function sumHouseholdMonthlyCents(costs) {
    return (costs.mieteCents +
        costs.internetCents +
        costs.versicherungenCents +
        costs.autoCents +
        costs.stromCents +
        costs.wasserCents +
        costs.heizungCents +
        costs.handyCents +
        costs.streamingCents +
        costs.krediteCents +
        costs.lebensmittelCents);
}
