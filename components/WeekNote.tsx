"use client";

import { useEffect, useRef, useState } from "react";
import type { DataStore, WeekNotes } from "@/lib/store/types";
import { Textarea } from "@/components/ui/textarea";

const SAVE_DELAY_MS = 800;

const SAVE_MESSAGES = {
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save — check your connection and try again.",
} as const;

/** `notes` with `weekKey`'s note replaced, or removed when it's blank. */
export function withWeekNote(notes: WeekNotes, weekKey: string, note: string): WeekNotes {
  const next = { ...notes };
  if (note.trim() === "") delete next[weekKey];
  else next[weekKey] = note;
  return next;
}

/** A week's note, saved automatically shortly after typing stops and when the field loses focus. */
export function WeekNote({
  weekKey,
  note,
  store,
  onSaved,
}: {
  weekKey: string;
  note: string;
  store: DataStore;
  onSaved: (weekKey: string, note: string) => void;
}) {
  const [draft, setDraft] = useState(note);
  const [saveState, setSaveState] = useState<keyof typeof SAVE_MESSAGES | null>(null);
  const savedRef = useRef(note);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function save(value: string) {
    clearTimeout(timer.current);
    if (value === savedRef.current) return;
    setSaveState("saving");
    try {
      await store.saveWeekNote(weekKey, value);
      savedRef.current = value;
      onSaved(weekKey, value);
      setSaveState("saved");
    } catch (err) {
      console.error("Could not save week note:", err);
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`note-${weekKey}`} className="text-xs text-muted-foreground">
        Notes
      </label>
      <Textarea
        id={`note-${weekKey}`}
        value={draft}
        maxLength={2000}
        placeholder="Anything worth remembering about this week…"
        onChange={(e) => {
          const value = e.target.value;
          setDraft(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => save(value), SAVE_DELAY_MS);
        }}
        onBlur={() => save(draft)}
      />
      {saveState && (
        <span
          aria-live="polite"
          className={
            saveState === "error" ? "text-xs text-destructive" : "text-xs text-muted-foreground"
          }
        >
          {SAVE_MESSAGES[saveState]}
        </span>
      )}
    </div>
  );
}

/** Read-only version for a History week that isn't being edited. */
export function WeekNoteView({ note }: { note: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">Notes</span>
      <p className="text-sm whitespace-pre-wrap">{note}</p>
    </div>
  );
}
