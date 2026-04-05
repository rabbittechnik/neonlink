export function maskPhoneDigits(digits) {
    const d = digits.replace(/\D/g, "");
    if (d.length < 5)
        return "••••••";
    const headLen = d.length >= 11 ? 5 : 3;
    const head = d.slice(0, headLen);
    const tail = d.slice(-2);
    return `${head} •••••• ${tail}`;
}
