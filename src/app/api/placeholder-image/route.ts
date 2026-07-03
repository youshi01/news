const palettes = [
  { bg: "#f4f0e8", ink: "#1c2733", accent: "#b42318", muted: "#55606a" },
  { bg: "#e8f1ef", ink: "#132f2b", accent: "#0f766e", muted: "#49615d" },
  { bg: "#eef0f6", ink: "#20243a", accent: "#4056a1", muted: "#5d6476" },
  { bg: "#f5ece3", ink: "#2d241f", accent: "#b45309", muted: "#6a5b52" },
  { bg: "#eaf1f7", ink: "#172b3a", accent: "#0369a1", muted: "#536878" },
  { bg: "#f2eee9", ink: "#202020", accent: "#7f1d1d", muted: "#5f5b55" }
];

function hash(input: string) {
  let value = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

function cleanText(input: string | null, fallback: string, max = 90) {
  const text = String(input || "")
    .replace(/\s+/g, " ")
    .trim();

  return (text || fallback).slice(0, max);
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function titleLines(title: string) {
  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > 34 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }

    if (lines.length === 2) {
      break;
    }
  }

  if (current && lines.length < 2) {
    lines.push(current);
  }

  return lines.length ? lines : [title];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = cleanText(searchParams.get("title"), "Latest News");
  const category = cleanText(searchParams.get("category"), "news", 28).toUpperCase();
  const seed = cleanText(searchParams.get("seed"), title, 120);
  const palette = palettes[hash(seed) % palettes.length];
  const lines = titleLines(title).map(escapeXml);
  const topLine = lines[0] || "Latest News";
  const bottomLine = lines[1] || "";
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escapeXml(title)}">
  <rect width="1200" height="675" fill="${palette.bg}"/>
  <rect x="0" y="0" width="1200" height="18" fill="${palette.accent}"/>
  <rect x="72" y="86" width="170" height="6" fill="${palette.accent}"/>
  <text x="72" y="140" fill="${palette.muted}" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" letter-spacing="3">${escapeXml(category)}</text>
  <text x="72" y="330" fill="${palette.ink}" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700">${topLine}</text>
  ${bottomLine ? `<text x="72" y="425" fill="${palette.ink}" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700">${bottomLine}</text>` : ""}
  <rect x="72" y="540" width="420" height="2" fill="${palette.muted}" opacity="0.35"/>
  <text x="72" y="592" fill="${palette.muted}" font-family="Arial, Helvetica, sans-serif" font-size="28">News briefing</text>
  <rect x="940" y="500" width="188" height="34" fill="${palette.accent}" opacity="0.14"/>
  <rect x="880" y="554" width="248" height="34" fill="${palette.accent}" opacity="0.2"/>
  <rect x="1010" y="608" width="118" height="34" fill="${palette.accent}" opacity="0.26"/>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800"
    }
  });
}
