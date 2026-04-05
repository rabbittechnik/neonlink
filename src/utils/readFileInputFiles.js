/**
 * Liest alle Dateien aus einem file-Input und setzt den Wert danach zurück
 * (damit dieselbe Datei erneut gewählt werden kann).
 *
 * Wichtig: Manche Browser (v. a. Windows/Chrome) leeren die FileList, wenn man
 * `input.value = ""` in derselben Event-Runde setzt — dann wirkt „Öffnen“ ohne Wirkung.
 */
export function readFilesFromFileInputEvent(e) {
    const input = e.target;
    const files = Array.from(input.files ?? []);
    queueMicrotask(() => {
        input.value = "";
    });
    return files;
}
