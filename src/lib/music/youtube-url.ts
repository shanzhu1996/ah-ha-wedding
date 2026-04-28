// YouTube URL parser. Two cases we support:
//
//   /playlist?list=PLAYLIST_ID    → playlist (import all items)
//   /watch?v=VIDEO_ID             → single video
//   youtu.be/VIDEO_ID             → single video (short link)
//
// A `watch?v=X&list=Y` URL imports just video X. To import the
// playlist, the user must share via the "playlist" link.

export type ParsedYouTubeUrl =
  | { type: "video"; id: string }
  | { type: "playlist"; id: string };

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  const isYouTube =
    host === "youtube.com" ||
    host === "music.youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtu.be";
  if (!isYouTube) return null;

  // Short link: youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return id ? { type: "video", id } : null;
  }

  if (url.pathname === "/playlist") {
    const id = url.searchParams.get("list");
    return id ? { type: "playlist", id } : null;
  }

  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v");
    return id ? { type: "video", id } : null;
  }

  return null;
}

// Canonical share URL for a track (used as source_url in the DB so
// duplicate detection survives different URL forms — e.g. youtu.be vs
// www.youtube.com vs music.youtube.com all normalize to the same key).
export function canonicalVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function canonicalPlaylistUrl(playlistId: string): string {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}
