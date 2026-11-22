import "server-only";

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" };

let cached: Promise<OgFont[]> | null = null;

/**
 * Inter (regular / bold / extra-bold) for ticket images, fetched once from Google Fonts
 * and kept in memory. Returns [] on failure so images still render with the default font.
 */
export function ticketFonts(): Promise<OgFont[]> {
  cached ??= (async () => {
    try {
      const css = await fetch("https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800", {
        signal: AbortSignal.timeout(5000),
      }).then((r) => r.text());
      const faces = [...css.matchAll(/font-weight: (\d+);[\s\S]*?url\(([^)]+)\) format\('truetype'\)/g)];
      const fonts = await Promise.all(
        faces.map(async ([, weight, url]) => ({
          name: "Inter",
          data: await fetch(url, { signal: AbortSignal.timeout(5000) }).then((r) => r.arrayBuffer()),
          weight: Number(weight) as OgFont["weight"],
          style: "normal" as const,
        })),
      );
      return fonts;
    } catch {
      cached = null; // try again on the next request
      return [];
    }
  })();
  return cached;
}
