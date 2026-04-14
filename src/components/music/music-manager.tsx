"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GripVertical,
  Music,
  Ban,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";

interface Song {
  id: string;
  wedding_id: string;
  phase: string;
  song_title: string;
  artist: string;
  notes: string | null;
  is_do_not_play: boolean;
  sort_order: number;
  created_at: string;
}

interface MusicManagerProps {
  songs: Song[];
  weddingId: string;
}

const PHASES = [
  { value: "prelude", label: "Prelude" },
  { value: "processional", label: "Processional" },
  { value: "recessional", label: "Recessional" },
  { value: "cocktail_hour", label: "Cocktail Hour" },
  { value: "dinner", label: "Dinner" },
  { value: "first_dance", label: "First Dance" },
  { value: "parent_dances", label: "Parent Dances" },
  { value: "open_dancing", label: "Open Dancing" },
  { value: "last_dance", label: "Last Dance" },
] as const;

const PHASE_SUGGESTIONS: Record<string, string[]> = {
  prelude: [
    "Canon in D - Pachelbel",
    "Clair de Lune - Debussy",
    "A Thousand Years - Christina Perri",
  ],
  processional: [
    "Here Comes the Sun - Beatles",
    "Bridal Chorus - Wagner",
    "Can't Help Falling in Love - Elvis",
  ],
  recessional: [
    "Signed, Sealed, Delivered - Stevie Wonder",
    "Beautiful Day - U2",
    "Happy - Pharrell Williams",
  ],
  cocktail_hour: [
    "Jazz standards playlist",
    "Bossa nova classics",
    "Acoustic covers of pop hits",
  ],
  dinner: [
    "Frank Sinatra classics",
    "Norah Jones - Come Away with Me",
    "Michael Buble - Everything",
  ],
  first_dance: [
    "At Last - Etta James",
    "Perfect - Ed Sheeran",
    "Thinking Out Loud - Ed Sheeran",
  ],
  parent_dances: [
    "My Girl - The Temptations",
    "Unforgettable - Nat King Cole",
    "What a Wonderful World - Louis Armstrong",
  ],
  open_dancing: [
    "Uptown Funk - Bruno Mars",
    "Shut Up and Dance - Walk the Moon",
    "September - Earth, Wind & Fire",
  ],
  last_dance: [
    "Last Dance - Donna Summer",
    "Don't Stop Believin' - Journey",
    "I Gotta Feeling - Black Eyed Peas",
  ],
};

export function MusicManager({ songs: initialSongs, weddingId }: MusicManagerProps) {
  const router = useRouter();
  const [tab, setTab] = useState("prelude");
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");

  const doNotPlaySongs = initialSongs.filter((s) => s.is_do_not_play);

  function songsForPhase(phase: string): Song[] {
    return initialSongs
      .filter((s) => s.phase === phase && !s.is_do_not_play)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  function resetForm() {
    setSongTitle("");
    setArtist("");
    setNotes("");
  }

  function openAddDialog() {
    resetForm();
    setShowDialog(true);
  }

  async function handleAddSong() {
    if (!songTitle.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const isDoNotPlay = tab === "do_not_play";
    const phase = isDoNotPlay ? "do_not_play" : tab;
    const existingSongs = isDoNotPlay ? doNotPlaySongs : songsForPhase(phase);

    await supabase.from("music_selections").insert({
      wedding_id: weddingId,
      phase,
      song_title: songTitle.trim(),
      artist: artist.trim(),
      notes: notes.trim() || null,
      is_do_not_play: isDoNotPlay,
      sort_order: existingSongs.length,
    });

    setSaving(false);
    setShowDialog(false);
    resetForm();
    router.refresh();
  }

  async function handleQuickAdd(title: string, artistName: string) {
    const supabase = createClient();
    const existing = songsForPhase(tab);

    await supabase.from("music_selections").insert({
      wedding_id: weddingId,
      phase: tab,
      song_title: title,
      artist: artistName,
      notes: null,
      is_do_not_play: false,
      sort_order: existing.length,
    });

    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("music_selections").delete().eq("id", id);
    router.refresh();
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const phase = tab;
    const isDoNotPlay = tab === "do_not_play";
    const list = isDoNotPlay ? doNotPlaySongs : songsForPhase(phase);
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    const supabase = createClient();
    const current = list[idx];
    const swap = list[swapIdx];

    await Promise.all([
      supabase
        .from("music_selections")
        .update({ sort_order: swap.sort_order })
        .eq("id", current.id),
      supabase
        .from("music_selections")
        .update({ sort_order: current.sort_order })
        .eq("id", swap.id),
    ]);

    router.refresh();
  }

  function renderSongList(songs: Song[]) {
    if (songs.length === 0) {
      return (
        <Card>
          <CardContent className="py-16 flex flex-col items-center text-center">
            <Music className="h-12 w-12 text-primary/40 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Set the mood</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Plan every musical moment — from the processional to the last dance. Use our suggestions or add your own.
            </p>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Song
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        {songs.map((song, idx) => (
          <div
            key={song.id}
            className="flex items-center gap-3 p-3 border rounded-lg group hover:bg-muted/30 transition-colors"
          >
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
                disabled={idx === 0}
                onClick={() => handleReorder(song.id, "up")}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <GripVertical className="h-4 w-4 text-muted-foreground/40 mx-auto" />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100"
                disabled={idx === songs.length - 1}
                onClick={() => handleReorder(song.id, "down")}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{song.song_title}</span>
                {song.is_do_not_play && (
                  <Badge variant="destructive" className="text-xs shrink-0">
                    <Ban className="h-3 w-3 mr-1" />
                    Do Not Play
                  </Badge>
                )}
              </div>
              {song.artist && (
                <p className="text-sm text-muted-foreground truncate">
                  {song.artist}
                </p>
              )}
              {song.notes && (
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                  {song.notes}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
              onClick={() => handleDelete(song.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    );
  }

  function renderSuggestions(phase: string) {
    const suggestions = PHASE_SUGGESTIONS[phase];
    if (!suggestions) return null;

    // Check which suggestions are already added
    const phaseSongs = songsForPhase(phase);
    const addedTitles = new Set(
      phaseSongs.map((s) => s.song_title.toLowerCase())
    );

    const available = suggestions.filter((s) => {
      const title = s.split(" - ")[0]?.trim().toLowerCase() ?? "";
      return !addedTitles.has(title);
    });

    if (available.length === 0) return null;

    return (
      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Popular suggestions
        </p>
        <div className="flex flex-wrap gap-2">
          {available.map((suggestion) => {
            const parts = suggestion.split(" - ");
            const title = parts[0]?.trim() ?? suggestion;
            const suggArtist = parts[1]?.trim() ?? "";
            return (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickAdd(title, suggArtist)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {suggestion}
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  // Count songs per phase for badge display
  function phaseCount(phase: string): number {
    return initialSongs.filter(
      (s) => s.phase === phase && !s.is_do_not_play
    ).length;
  }

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {initialSongs.filter((s) => !s.is_do_not_play).length}
            </div>
            <p className="text-xs text-muted-foreground">Total Songs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {PHASES.filter((p) => phaseCount(p.value) > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Phases Planned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {doNotPlaySongs.length}
            </div>
            <p className="text-xs text-muted-foreground">Do Not Play</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v ?? "prelude")}>
        <div className="flex items-center justify-between gap-4">
          <div className="overflow-x-auto">
            <TabsList className="h-auto flex-wrap">
              {PHASES.map((phase) => {
                const count = phaseCount(phase.value);
                return (
                  <TabsTrigger key={phase.value} value={phase.value} className="gap-1.5">
                    {phase.label}
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 min-w-4 px-1">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
              <TabsTrigger value="do_not_play" className="gap-1.5 text-red-600">
                <Ban className="h-3.5 w-3.5" />
                Do Not Play
                {doNotPlaySongs.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 min-w-4 px-1">
                    {doNotPlaySongs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>
          <Button onClick={openAddDialog} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add Song
          </Button>
        </div>

        {/* Phase tab content */}
        {PHASES.map((phase) => (
          <TabsContent key={phase.value} value={phase.value} className="mt-6">
            {renderSongList(songsForPhase(phase.value))}
            {renderSuggestions(phase.value)}
          </TabsContent>
        ))}

        {/* Do Not Play tab */}
        <TabsContent value="do_not_play" className="mt-6">
          {doNotPlaySongs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Ban className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>No songs on the do-not-play list.</p>
                <p className="text-sm mt-1">
                  Add songs here that you absolutely do not want played at your wedding.
                </p>
              </CardContent>
            </Card>
          ) : (
            renderSongList(doNotPlaySongs)
          )}
        </TabsContent>
      </Tabs>

      {/* Add Song Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tab === "do_not_play"
                ? "Add to Do Not Play List"
                : `Add Song — ${PHASES.find((p) => p.value === tab)?.label ?? tab}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Song Title *</Label>
              <Input
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Enter song title"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && songTitle.trim()) handleAddSong();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Artist</Label>
              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && songTitle.trim()) handleAddSong();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={
                  tab === "do_not_play"
                    ? "Why should this not be played?"
                    : "Any notes for the DJ or band"
                }
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddSong}
                disabled={saving || !songTitle.trim()}
              >
                {saving
                  ? "Adding..."
                  : tab === "do_not_play"
                    ? "Add to Do Not Play"
                    : "Add Song"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
