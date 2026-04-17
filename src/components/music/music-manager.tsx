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
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

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

// ── Phases: grouped by wedding day flow ────────────────────────────────

interface Phase {
  value: string;
  label: string;
  description: string;
}

interface PhaseGroup {
  label: string;
  phases: Phase[];
}

const PHASE_GROUPS: PhaseGroup[] = [
  {
    label: "Ceremony",
    phases: [
      { value: "prelude", label: "Guest Arrival", description: "Background playlist as guests are seated · ~10 songs" },
      { value: "processional", label: "Walking Down the Aisle", description: "The wedding party and couple enter · 1-2 songs" },
      { value: "recessional", label: "Walking Back Up", description: "The celebratory exit after the kiss · 1 song" },
    ],
  },
  {
    label: "Cocktail & Dinner",
    phases: [
      { value: "cocktail_hour", label: "Cocktail Hour", description: "Background vibes while guests mingle · ~15 songs" },
      { value: "dinner", label: "Dinner", description: "Background music during the meal · ~10-15 songs" },
    ],
  },
  {
    label: "The Moments",
    phases: [
      { value: "grand_entrance", label: "Grand Entrance", description: "Your dramatic entrance into the reception · 1 song" },
      { value: "first_dance", label: "First Dance", description: "Your first dance as a married couple · 1 song" },
      { value: "parent_dances", label: "Parent Dances", description: "Father-daughter, mother-son dances · 1-2 songs" },
      { value: "cake_cutting", label: "Cake Cutting", description: "The song for cutting the cake · 1 song" },
    ],
  },
  {
    label: "The Party",
    phases: [
      { value: "open_dancing", label: "Party Playlist", description: "The songs that get everyone dancing · ~30-45 songs" },
      { value: "last_dance", label: "Last Dance", description: "The final song of the night · 1 song" },
    ],
  },
];

const ALL_PHASES = PHASE_GROUPS.flatMap((g) => g.phases);


// ── Component ──────────────────────────────────────────────────────────

export function MusicManager({ songs: initialSongs, weddingId }: MusicManagerProps) {
  const router = useRouter();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [addingToPhase, setAddingToPhase] = useState<string>("first_dance");
  const [saving, setSaving] = useState(false);

  // Form state
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");

  const doNotPlaySongs = initialSongs.filter((s) => s.is_do_not_play);
  const totalSongs = initialSongs.filter((s) => !s.is_do_not_play).length;
  const phasesPlanned = ALL_PHASES.filter((p) => songsForPhase(p.value).length > 0).length;

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

  function openAddDialog(phase: string) {
    setAddingToPhase(phase);
    resetForm();
    setShowDialog(true);
  }

  async function handleAddSong() {
    if (!songTitle.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const isDoNotPlay = addingToPhase === "do_not_play";
    const existingSongs = isDoNotPlay ? doNotPlaySongs : songsForPhase(addingToPhase);

    await supabase.from("music_selections").insert({
      wedding_id: weddingId,
      phase: addingToPhase,
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


  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("music_selections").delete().eq("id", id);
    router.refresh();
  }

  async function handleReorder(phase: string, id: string, direction: "up" | "down") {
    const isDoNotPlay = phase === "do_not_play";
    const list = isDoNotPlay ? doNotPlaySongs : songsForPhase(phase);
    const idx = list.findIndex((s) => s.id === id);
    if (idx < 0) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;

    const supabase = createClient();
    await Promise.all([
      supabase.from("music_selections").update({ sort_order: list[swapIdx].sort_order }).eq("id", list[idx].id),
      supabase.from("music_selections").update({ sort_order: list[idx].sort_order }).eq("id", list[swapIdx].id),
    ]);
    router.refresh();
  }

  // ── Render helpers ─────────────────────────────────────────────────

  function renderSongRow(song: Song, idx: number, total: number, phase: string) {
    return (
      <div
        key={song.id}
        className="flex items-center gap-2 group"
      >
        {/* Song pill */}
        <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/30 group-hover:border-border/60 transition-colors">
          <span className="text-[11px] text-muted-foreground/50 shrink-0 tabular-nums">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{song.song_title}</span>
            {song.artist && (
              <span className="text-xs text-muted-foreground ml-1.5">{song.artist}</span>
            )}
          </div>
        </div>

        {/* Actions — hover only */}
        <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            disabled={idx === 0}
            onClick={() => handleReorder(phase, song.id, "up")}
            className="h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 rounded"
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            disabled={idx === total - 1}
            onClick={() => handleReorder(phase, song.id, "down")}
            className="h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 rounded"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleDelete(song.id)}
            className="h-6 w-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive rounded"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }


  function renderPhaseRow(phase: Phase) {
    const songs = songsForPhase(phase.value);
    const isExpanded = expandedPhase === phase.value;
    const count = songs.length;

    return (
      <div key={phase.value}>
        {/* Phase header — clickable */}
        <button
          onClick={() => setExpandedPhase(isExpanded ? null : phase.value)}
          className="w-full flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/20 transition-colors text-left"
        >
          <ChevronRight className={cn("h-3.5 w-3.5 text-muted-foreground/60 transition-transform shrink-0", isExpanded && "rotate-90")} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground">{phase.label}</span>
            {!isExpanded && (
              <span className="text-xs text-muted-foreground ml-1.5">— {phase.description.split(" · ")[0]}</span>
            )}
          </div>
          {/* Count: "3 / 1-2" — yours vs suggested */}
          {(() => {
            const guidancePart = phase.description.split(" · ")[1];
            return (
              <span className="text-[11px] tabular-nums shrink-0">
                <span className="font-semibold text-foreground/80">{count}</span>
                {guidancePart && (
                  <span className="text-muted-foreground/50"> / {guidancePart.replace(/^~/, "")}</span>
                )}
              </span>
            );
          })()}
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="pl-7 pb-3">
            <p className="text-xs text-muted-foreground mb-2">{phase.description.split(" · ")[0]}</p>
            {songs.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {songs.map((song, idx) => renderSongRow(song, idx, songs.length, phase.value))}
              </div>
            )}

            <button
              onClick={() => openAddDialog(phase.value)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <Plus className="h-3 w-3" />
              Add song
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Music
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium text-foreground/80">{totalSongs}</span> song{totalSongs !== 1 ? "s" : ""}
          <span className="text-muted-foreground/50"> · </span>
          <span className="font-medium text-foreground/80">{phasesPlanned}</span> of {ALL_PHASES.length} moments planned
          {doNotPlaySongs.length > 0 && (
            <>
              <span className="text-muted-foreground/50"> · </span>
              <span className="font-medium text-foreground/80">{doNotPlaySongs.length}</span> do-not-play
            </>
          )}
        </p>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
        Plan songs for every moment of your day. Your DJ or band will use this as their playbook.
      </p>

      {/* Phase groups */}
      {PHASE_GROUPS.map((group) => (
        <div key={group.label}>
          {/* Group label */}
          <div className="flex items-center gap-3 mb-2 pb-1 border-b border-border/50">
            <span className="text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80">
              {group.label}
            </span>
          </div>

          {/* Phases in group */}
          <div className="space-y-0">
            {group.phases.map((phase) => renderPhaseRow(phase))}
          </div>
        </div>
      ))}

      {/* Do Not Play */}
      <div>
        <div className="flex items-center gap-3 mb-2 pb-1 border-b border-border/50">
          <span className="text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80">
            Do Not Play
          </span>
        </div>
        <div>
          <button
            onClick={() => setExpandedPhase(expandedPhase === "do_not_play" ? null : "do_not_play")}
            className="w-full flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-muted/20 transition-colors text-left"
          >
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground/60 transition-transform shrink-0", expandedPhase === "do_not_play" && "rotate-90")} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Ban className="h-3.5 w-3.5 text-red-500" />
                <span className="text-sm font-semibold text-foreground">Do Not Play List</span>
                {doNotPlaySongs.length > 0 && (
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{doNotPlaySongs.length} song{doNotPlaySongs.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Songs you absolutely do not want played</p>
            </div>
          </button>

          {expandedPhase === "do_not_play" && (
            <div className="pl-7 pb-4">
              {doNotPlaySongs.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {doNotPlaySongs.map((song, idx) => renderSongRow(song, idx, doNotPlaySongs.length, "do_not_play"))}
                </div>
              )}
              <button
                onClick={() => openAddDialog("do_not_play")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <Plus className="h-3 w-3" />
                Add to do-not-play list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Song Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addingToPhase === "do_not_play"
                ? "Add to Do Not Play List"
                : `Add Song — ${ALL_PHASES.find((p) => p.value === addingToPhase)?.label ?? addingToPhase}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Song Title *</Label>
              <Input
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Enter song title"
                onKeyDown={(e) => { if (e.key === "Enter" && songTitle.trim()) handleAddSong(); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Artist</Label>
              <Input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name"
                onKeyDown={(e) => { if (e.key === "Enter" && songTitle.trim()) handleAddSong(); }}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={addingToPhase === "do_not_play" ? "Why should this not be played?" : "Any notes for the DJ or band"}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleAddSong} disabled={saving || !songTitle.trim()}>
                {saving ? "Adding..." : addingToPhase === "do_not_play" ? "Add to Do Not Play" : "Add Song"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
