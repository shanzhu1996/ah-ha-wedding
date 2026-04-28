import { NextResponse } from "next/server";
import {
  parseYouTubeUrl,
  canonicalVideoUrl,
} from "@/lib/music/youtube-url";
import { parseTrackTitle } from "@/lib/music/parse-title";

// One row of the preview list returned to the client. The client then
// inserts these into music_selections after user confirms.
export interface ImportedTrack {
  song_title: string;
  artist: string;
  source_url: string;
}

interface YouTubeApiError {
  error: { message?: string; code?: number };
}

interface VideoSnippet {
  title: string;
  channelTitle?: string;
  // For deleted/private videos YouTube returns title "Deleted video" or
  // "Private video" with no other useful fields. We surface them so the
  // client can show "12 of 30 — 18 unavailable" rather than silently
  // dropping.
}

interface VideoItem {
  id: string;
  snippet: VideoSnippet;
}

interface PlaylistItem {
  snippet: {
    title: string;
    resourceId: { videoId: string };
    videoOwnerChannelTitle?: string;
  };
}

interface PlaylistItemsResponse {
  items?: PlaylistItem[];
  nextPageToken?: string;
}

interface VideosResponse {
  items?: VideoItem[];
}

const API_BASE = "https://www.googleapis.com/youtube/v3";

async function fetchVideo(id: string, key: string): Promise<ImportedTrack | null> {
  const res = await fetch(
    `${API_BASE}/videos?part=snippet&id=${encodeURIComponent(id)}&key=${key}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as YouTubeApiError | null;
    throw new Error(body?.error?.message || `YouTube API error ${res.status}`);
  }
  const data = (await res.json()) as VideosResponse;
  const item = data.items?.[0];
  if (!item) return null;
  const parsed = parseTrackTitle(item.snippet.title, item.snippet.channelTitle);
  return {
    song_title: parsed.song_title,
    artist: parsed.artist,
    source_url: canonicalVideoUrl(item.id),
  };
}

async function fetchPlaylist(
  playlistId: string,
  key: string
): Promise<ImportedTrack[]> {
  const tracks: ImportedTrack[] = [];
  let pageToken: string | undefined = undefined;
  // Cap at 10 pages * 50 = 500 tracks. Wedding playlists rarely exceed
  // this; if a couple has more, surface a clear error.
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId,
      maxResults: "50",
      key,
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API_BASE}/playlistItems?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as YouTubeApiError | null;
      throw new Error(
        body?.error?.message || `YouTube API error ${res.status}`
      );
    }
    const data = (await res.json()) as PlaylistItemsResponse;
    for (const item of data.items || []) {
      const videoId = item.snippet.resourceId?.videoId;
      const title = item.snippet.title;
      // Skip deleted / private placeholders — users can't act on them.
      if (!videoId || title === "Deleted video" || title === "Private video") {
        continue;
      }
      const parsed = parseTrackTitle(title, item.snippet.videoOwnerChannelTitle);
      tracks.push({
        song_title: parsed.song_title,
        artist: parsed.artist,
        source_url: canonicalVideoUrl(videoId),
      });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return tracks;
}

export async function POST(request: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube import is not configured (missing YOUTUBE_API_KEY)." },
      { status: 503 }
    );
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json(
      { error: "Missing YouTube URL" },
      { status: 400 }
    );
  }

  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    return NextResponse.json(
      {
        error:
          "Couldn't read that link. Paste a YouTube video or playlist URL.",
      },
      { status: 400 }
    );
  }

  try {
    if (parsed.type === "video") {
      const track = await fetchVideo(parsed.id, apiKey);
      if (!track) {
        return NextResponse.json(
          { error: "Video not found, private, or deleted." },
          { status: 404 }
        );
      }
      return NextResponse.json({
        type: "video" as const,
        items: [track],
      });
    } else {
      const tracks = await fetchPlaylist(parsed.id, apiKey);
      if (tracks.length === 0) {
        return NextResponse.json(
          {
            error:
              "Playlist is empty, private, or all videos are unavailable.",
          },
          { status: 404 }
        );
      }
      return NextResponse.json({
        type: "playlist" as const,
        items: tracks,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
