// Best-effort split of a YouTube video title into { song_title, artist }.
//
// Most music videos follow "Artist - Song (Official Music Video)" or some
// variant. We strip trailing noise like "(Official Video)" / "[HD]" /
// "(Lyrics)", split on " - " or " — " (with spaces, to avoid splitting
// hyphenated words like "Self-Care"), and use the channel name to decide
// which side is the artist when both look plausible.
//
// Edge cases that intentionally fall through to "title only, no artist":
//   - "BACKR00MS FT TRAVIS SCOTT" — no separator
//   - "Pulp Fiction - Misirlou" — looks parseable but "Pulp Fiction" is
//     a movie. We can't tell. The user can edit after import.
// The preview UI shows the parsed result so the user can spot wrong
// splits before they hit Import.

const NOISE_KEYWORDS =
  /(official|music\s*video|m\/v|mv|hd|4k|remaster(?:ed)?|lyric|audio(?:\s*only)?|live\s*(?:performance|version)?|visualizer|extended|version|edit|premiere)/i;

// Strips trailing parenthetical / bracket noise like "(Official Video)".
// Runs iteratively because titles often stack: "Song (Official) (4K)".
// Also strips bare trailing "M/V" / "MV" (common on K-pop uploads).
function stripNoise(s: string): string {
  let prev = s;
  for (let i = 0; i < 5; i++) {
    const next = prev
      .replace(/\s*[(\[][^)\]]*[)\]]\s*$/, (match) =>
        NOISE_KEYWORDS.test(match) ? "" : match
      )
      .replace(/\s+M\/?V\s*$/i, "")
      .trim();
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

// Channel names often have suffixes that confuse equality checks:
//   "Rick AstleyVEVO", "Taylor Swift - Topic", "BLACKPINK Official"
function normalizeChannel(channel: string): string {
  return channel
    .replace(/\s*[-–—]\s*Topic\s*$/i, "")
    .replace(/VEVO\s*$/i, "")
    .replace(/\s+Official\s*$/i, "")
    .trim();
}

// Strip uploader-added stylistic wrapping quotes from a title segment:
//   'How You Like That' → How You Like That
//   "BACKR00MS"         → BACKR00MS
//   「夢の続き」         → 夢の続き
// Only strips when leading + trailing are a MATCHED pair, so internal
// apostrophes like "Don't Stop Believin'" are preserved.
const WRAP_PAIRS: Array<[string, string]> = [
  ["'", "'"],
  ['"', '"'],
  ["\u2018", "\u2019"], // ‘ ’
  ["\u201C", "\u201D"], // “ ”
  ["\u300C", "\u300D"], // 「 」
  ["\u300E", "\u300F"], // 『 』
];
function stripWrappingQuotes(s: string): string {
  for (const [open, close] of WRAP_PAIRS) {
    if (
      s.length >= open.length + close.length + 1 &&
      s.startsWith(open) &&
      s.endsWith(close)
    ) {
      return s.slice(open.length, s.length - close.length).trim();
    }
  }
  return s;
}

function looseEqual(a: string, b: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[\s'’`"]/g, "").trim();
  if (!a || !b) return false;
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  // One contains the other — handles "Rick Astley" vs "Rick Astley Official".
  if (na.length >= 3 && nb.length >= 3 && (na.includes(nb) || nb.includes(na))) {
    return true;
  }
  return false;
}

export interface ParsedTrack {
  song_title: string;
  artist: string;
}

export function parseTrackTitle(
  rawTitle: string,
  channelTitle?: string | null
): ParsedTrack {
  const cleaned = stripNoise(rawTitle.trim());

  // Try " - " or " — " or " | " (with spaces around to avoid in-word splits).
  // We split on the FIRST separator so "Artist - Song - Remix" → artist + rest.
  const sepMatch = cleaned.match(/^(.+?)\s+[-–—|]\s+(.+)$/);
  if (!sepMatch) {
    return {
      song_title: stripWrappingQuotes(cleaned || rawTitle),
      artist: "",
    };
  }
  const left = sepMatch[1].trim();
  const right = sepMatch[2].trim();

  const ch = channelTitle ? normalizeChannel(channelTitle) : "";
  let artist: string;
  let song_title: string;
  if (ch && looseEqual(left, ch)) {
    artist = left;
    song_title = right;
  } else if (ch && looseEqual(right, ch)) {
    // "Song - Artist" pattern (rare but happens with some uploads).
    artist = right;
    song_title = left;
  } else {
    // Default: "Artist - Song" — by far the most common.
    artist = left;
    song_title = right;
  }
  return {
    song_title: stripWrappingQuotes(song_title),
    artist: stripWrappingQuotes(artist),
  };
}
