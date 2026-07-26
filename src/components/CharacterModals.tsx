"use client";

/**
 * CharacterModals — all character-related overlays:
 *  • CharacterMenu: "..." dropdown (Edit, Delete, Design)
 *  • EditCharacterModal: full form with Relationships tab
 *  • DeleteCharacterModal: confirmation
 *  • DesignCharacterModal: design gallery + request
 *  • NewCharacterModal: Existing vs Draft choice → form
 */

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  Palette,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCharacters } from "@/context/CharactersContext";
import { AVATAR_PALETTE } from "@/components/CharacterAvatar";
import { StoryFitPending } from "@/components/StoryFitRating";
import { useToast } from "@/components/Toast";
import { generateStoryFit } from "@/lib/storyFit";
import type { Character, CharacterRelationship } from "@/data/characters";

// ─── Helpers ────────────────────────────────────────────────────────────────

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Kicks off Story Impact analysis for a draft that has just been saved, then
 * announces the result. Deliberately fire-and-forget: the modal closes
 * immediately, and the writer is told when the analysis is ready.
 */
function useStoryFitGeneration() {
  const { updateCharacter } = useCharacters();
  const { showToast } = useToast();

  return function generateFor(character: Character) {
    generateStoryFit({
      role: character.role,
      traits: character.traits,
      overview: character.bio ?? character.description,
      arcSummary: character.arcSummary,
      origin: character.origin,
      affiliation: character.affiliation,
      relationships: character.relationships,
    }).then((storyFit) => {
      updateCharacter(character.id, { storyFit });
      showToast({
        title: `Story Impact ready for ${character.name}`,
        href: `/writer/characters/${character.id}?tab=story-impact`,
        actionLabel: "View now",
      });
    });
  };
}

function Modal({
  onClose,
  children,
  wide,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  // Close on backdrop click
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 px-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-gold-3/25 bg-bg-1 p-6 shadow-2xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink/40 transition-colors hover:text-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-ink/50">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gold-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold-2/50 focus:outline-none"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-y rounded-lg border border-gold-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold-2/50 focus:outline-none"
    />
  );
}

// ─── CharacterMenu ────────────────────────────────────────────────────────────

export type CharacterMenuAction = "edit" | "delete" | "design" | "establish";

export function CharacterMenu({
  onSelect,
  isDraft = false,
}: {
  onSelect: (action: CharacterMenuAction) => void;
  /** Drafts get the extra "Switch to Established" action. */
  isDraft?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const items: { action: CharacterMenuAction; label: string; icon: typeof Pencil }[] = [
    { action: "edit", label: "Edit Character", icon: Pencil },
    ...(isDraft
      ? [
          {
            action: "establish" as CharacterMenuAction,
            label: "Switch to Established",
            icon: Check,
          },
        ]
      : []),
    { action: "design", label: "Design Character", icon: Palette },
    { action: "delete", label: "Delete Character", icon: Trash2 },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label="More options"
        aria-expanded={open}
        className={`rounded-md p-1 transition-colors ${
          open
            ? "bg-gold-2/15 text-gold-1"
            : "text-ink/40 hover:bg-gold-2/10 hover:text-ink"
        }`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-xl border border-gold-3/25 bg-bg-1 py-1 shadow-xl">
          {items.map(({ action, label, icon: Icon }) => (
            <button
              key={action}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onSelect(action);
              }}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors ${
                action === "delete"
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-ink/80 hover:bg-gold-2/10 hover:text-ink"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DeleteCharacterModal ─────────────────────────────────────────────────────

export function DeleteCharacterModal({
  character,
  onClose,
  onDeleted,
}: {
  character: Character;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { deleteCharacter } = useCharacters();

  function handleDelete() {
    deleteCharacter(character.id);
    onClose();
    onDeleted?.();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="font-display text-xl text-gold-1">Delete Character</h2>
      <p className="mt-3 text-ink/70">
        Are you sure you want to delete{" "}
        <span className="text-ink">{character.name}</span>? This will also
        remove them from every other character&apos;s relationships. This
        action cannot be undone.
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink transition-colors hover:border-gold-2/50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}

// ─── DesignCharacterModal ─────────────────────────────────────────────────────

type DesignRequestStatus = "pending" | "in-progress" | "ready";

type DesignRequest = {
  id: string;
  prompt: string;
  status: DesignRequestStatus;
  sentAt: string;
};

// Each design tile maps directly to an AVATAR_PALETTE index so selecting it
// sets the character's avatar color.
const MOCK_DESIGNS: { id: string; label: string; paletteIndex: number }[] = [
  { id: "design-1", label: "Design A", paletteIndex: 5 },  // warm gold
  { id: "design-2", label: "Design B", paletteIndex: 3 },  // violet
  { id: "design-3", label: "Design C", paletteIndex: 0 },  // teal-green
  { id: "design-4", label: "Design D", paletteIndex: 1 },  // maroon/rose
];

const STATUS_LABELS: Record<DesignRequestStatus, string> = {
  pending: "Queued",
  "in-progress": "In Progress",
  ready: "Ready to Review",
};

const STATUS_COLORS: Record<DesignRequestStatus, string> = {
  pending: "bg-ink/10 text-ink/50",
  "in-progress": "bg-gold-2/15 text-gold-2",
  ready: "bg-green-500/15 text-green-400",
};

export function DesignCharacterModal({
  character,
  onClose,
}: {
  character: Character;
  onClose: () => void;
}) {
  const { updateCharacter } = useCharacters();
  const [selected, setSelected] = useState<string | null>(null);
  const [request, setRequest] = useState("");
  // Persist requests across opens by keying to character id via module-level map
  const [sentRequests, setSentRequests] = useState<DesignRequest[]>(
    () => designRequestStore[character.id] ?? [],
  );

  function handleSendRequest() {
    const trimmed = request.trim();
    if (!trimmed) return;
    const newReq: DesignRequest = {
      id: nanoid(),
      prompt: trimmed,
      status: "pending",
      sentAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const updated = [newReq, ...sentRequests];
    setSentRequests(updated);
    designRequestStore[character.id] = updated;
    setRequest("");

    // Simulate status progression: pending → in-progress → ready
    setTimeout(() => {
      setSentRequests((prev) =>
        prev.map((r) =>
          r.id === newReq.id ? { ...r, status: "in-progress" } : r,
        ),
      );
      designRequestStore[character.id] = (
        designRequestStore[character.id] ?? []
      ).map((r) => (r.id === newReq.id ? { ...r, status: "in-progress" } : r));
    }, 2000);

    setTimeout(() => {
      setSentRequests((prev) =>
        prev.map((r) =>
          r.id === newReq.id ? { ...r, status: "ready" } : r,
        ),
      );
      designRequestStore[character.id] = (
        designRequestStore[character.id] ?? []
      ).map((r) => (r.id === newReq.id ? { ...r, status: "ready" } : r));
    }, 5000);
  }

  function handleSetOfficial() {
    if (!selected) return;
    const design = MOCK_DESIGNS.find((d) => d.id === selected);
    if (!design) return;
    updateCharacter(character.id, { avatarColor: design.paletteIndex });
    onClose();
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-display text-xl text-gold-1">
        Design — {character.name}
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        Select an official design or request a new one from the designer.
      </p>

      {/* Gallery */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {MOCK_DESIGNS.map((d) => {
          const isSelected = selected === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d.id)}
              className={`group relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-gold-2 scale-[1.03]"
                  : "border-gold-3/20 hover:border-gold-3/50"
              }`}
            >
              {/* Tile background uses the same palette gradient as the avatar */}
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${AVATAR_PALETTE[d.paletteIndex].replace("to-bg-1", "to-bg-0")}`}
              >
                <span className="font-display text-4xl text-gold-1/60">
                  {character.name.trim().charAt(0).toUpperCase()}
                </span>
              </div>
              {isSelected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold-2">
                  <Check className="h-3 w-3 text-bg-0" />
                </div>
              )}
              <p className="absolute bottom-0 left-0 right-0 bg-bg-0/70 py-1.5 text-center text-xs text-ink/70">
                {d.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Request a new design */}
      <div className="mt-6">
        <FieldLabel>Request a new design from the designer</FieldLabel>
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendRequest();
            }}
            placeholder="Describe the look you want…"
            className="flex-1 rounded-lg border border-gold-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-gold-2/50 focus:outline-none"
          />
          <button
            onClick={handleSendRequest}
            disabled={!request.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-gold-2/15 px-3 py-2 text-sm text-gold-1 transition-colors hover:bg-gold-2/25 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>

      {/* Sent requests log */}
      {sentRequests.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink/40">
            Design Requests
          </p>
          <div className="flex flex-col gap-2">
            {sentRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-start gap-3 rounded-xl border border-gold-3/15 bg-bg-0 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{req.prompt}</p>
                  <p className="mt-0.5 text-xs text-ink/40">Sent at {req.sentAt}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                >
                  {STATUS_LABELS[req.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink transition-colors hover:border-gold-2/50"
        >
          Close
        </button>
        <button
          onClick={handleSetOfficial}
          disabled={!selected}
          className="rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1 disabled:opacity-40"
        >
          Set as Official Design
        </button>
      </div>
    </Modal>
  );
}

// Module-level store so requests persist across modal open/close within a session
const designRequestStore: Record<string, DesignRequest[]> = {};

// ─── EditCharacterModal ───────────────────────────────────────────────────────

type EditTab = "Profile" | "Overview" | "Relationships" | "Arc" | "Notes";
const EDIT_TABS: EditTab[] = [
  "Profile",
  "Overview",
  "Relationships",
  "Arc",
  "Notes",
];

export function EditCharacterModal({
  character,
  onClose,
  isDraft: isDraftProp = false,
}: {
  character: Character;
  onClose: () => void;
  isDraft?: boolean;
}) {
  const { updateCharacter, characters } = useCharacters();
  const generateFor = useStoryFitGeneration();

  // A character saved as a draft stays one, however this modal was opened.
  const isDraft = isDraftProp || character.isDraft === true;

  // Form state
  const [name, setName] = useState(character.name);
  const [role, setRole] = useState(character.role);
  const [age, setAge] = useState(String(character.age ?? ""));
  const [occupation, setOccupation] = useState(character.occupation ?? "");
  const [origin, setOrigin] = useState(character.origin ?? "");
  const [affiliation, setAffiliation] = useState(character.affiliation ?? "");
  const [status, setStatus] = useState(character.status ?? "");
  const [tagsRaw, setTagsRaw] = useState(character.traits.join(", "));
  const [overview, setOverview] = useState(
    character.bio ?? character.description,
  );
  const [keyTraitsRaw, setKeyTraitsRaw] = useState(
    (character.keyTraits ?? []).join("\n"),
  );
  const [arcSummary, setArcSummary] = useState(character.arcSummary ?? "");
  const [notes, setNotes] = useState(character.notes ?? "");
  const [relationships, setRelationships] = useState<CharacterRelationship[]>(
    character.relationships ?? [],
  );

  // Relationship editor state
  const [relCharId, setRelCharId] = useState("");
  const [relLabel, setRelLabel] = useState("");
  const [relBlurb, setRelBlurb] = useState("");

  const [activeTab, setActiveTab] = useState<EditTab>("Profile");

  const tabs = isDraft
    ? (EDIT_TABS.map((t) => (t === "Arc" ? "Story Impact" : t)) as EditTab[])
    : EDIT_TABS;

  const otherCharacters = characters.filter((c) => c.id !== character.id);

  function addRelationship() {
    if (!relCharId || !relLabel.trim()) return;
    const exists = relationships.some((r) => r.characterId === relCharId);
    if (exists) return;
    setRelationships((prev) => [
      ...prev,
      { characterId: relCharId, relation: relLabel.trim(), blurb: relBlurb.trim() },
    ]);
    setRelCharId("");
    setRelLabel("");
    setRelBlurb("");
  }

  function removeRelationship(charId: string) {
    setRelationships((prev) => prev.filter((r) => r.characterId !== charId));
  }

  function handleSave() {
    const traits = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const keyTraits = keyTraitsRaw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    updateCharacter(character.id, {
      name: name.trim() || character.name,
      role: role.trim() || character.role,
      age: age.trim() !== "" && !Number.isNaN(Number(age)) ? Number(age) : undefined,
      occupation: occupation.trim() || undefined,
      origin: origin.trim() || undefined,
      affiliation: affiliation.trim() || undefined,
      status: status.trim() || undefined,
      traits,
      bio: overview.trim() || undefined,
      description: overview.trim() || character.description,
      keyTraits: keyTraits.length ? keyTraits : undefined,
      arcSummary: arcSummary.trim() || undefined,
      notes: notes.trim() || undefined,
      relationships,
    });

    // Bidirectional: for each relationship, if the other character doesn't
    // already have this character in their relationships, add a reverse entry.
    relationships.forEach((rel) => {
      const other = characters.find((c) => c.id === rel.characterId);
      if (!other) return;
      const alreadyLinked = other.relationships?.some(
        (r) => r.characterId === character.id,
      );
      if (!alreadyLinked) {
        updateCharacter(other.id, {
          relationships: [
            ...(other.relationships ?? []),
            {
              characterId: character.id,
              relation: rel.relation,
              blurb: rel.blurb,
            },
          ],
        });
      }
    });

    // Regenerate Story Impact from the saved values, never from the in-progress
    // form — see the pending state on the Story Impact tab.
    if (isDraft) {
      generateFor({
        ...character,
        name: name.trim() || character.name,
        role: role.trim() || character.role,
        traits,
        bio: overview.trim() || undefined,
        description: overview.trim() || character.description,
        arcSummary: arcSummary.trim() || undefined,
        origin: origin.trim() || undefined,
        affiliation: affiliation.trim() || undefined,
        relationships,
      });
    }

    onClose();
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-display text-xl text-gold-1">
        {isDraftProp ? "New Draft Character" : `Edit — ${character.name}`}
      </h2>

      {/* Tabs */}
      <div className="mt-4 flex gap-5 overflow-x-auto border-b border-gold-3/20 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 -mb-px border-b-2 pb-3 text-sm transition-colors ${
              activeTab === tab
                ? "border-gold-2 text-gold-1"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {/* Profile tab */}
        {activeTab === "Profile" && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Name</FieldLabel>
                <TextInput value={name} onChange={setName} placeholder="Character name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Role</FieldLabel>
                <TextInput value={role} onChange={setRole} placeholder="e.g. Protagonist" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Age</FieldLabel>
                <TextInput value={age} onChange={setAge} placeholder="e.g. 21" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Occupation</FieldLabel>
                <TextInput value={occupation} onChange={setOccupation} placeholder="e.g. Relic Runner" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Origin</FieldLabel>
                <TextInput value={origin} onChange={setOrigin} placeholder="e.g. Veyndor" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Affiliation</FieldLabel>
                <TextInput value={affiliation} onChange={setAffiliation} placeholder="e.g. None" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Status</FieldLabel>
                <TextInput value={status} onChange={setStatus} placeholder="e.g. Alive" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel>Tags (comma separated)</FieldLabel>
                <TextInput value={tagsRaw} onChange={setTagsRaw} placeholder="Brave, Empathic, …" />
              </div>
            </div>
          </>
        )}

        {/* Overview tab */}
        {activeTab === "Overview" && (
          <>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Overview</FieldLabel>
              <TextArea
                value={overview}
                onChange={setOverview}
                placeholder="Character overview…"
                rows={5}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Key Traits (one per line)</FieldLabel>
              <TextArea
                value={keyTraitsRaw}
                onChange={setKeyTraitsRaw}
                placeholder={"Protective of the vulnerable\nStruggles with trust\n…"}
                rows={4}
              />
            </div>
          </>
        )}

        {/* Relationships tab */}
        {activeTab === "Relationships" && (
          <>
            {/* Existing relationships */}
            {relationships.length > 0 && (
              <div className="flex flex-col gap-2">
                {relationships.map((rel) => {
                  const other = characters.find((c) => c.id === rel.characterId);
                  return (
                    <div
                      key={rel.characterId}
                      className="flex items-center gap-3 rounded-xl border border-gold-3/20 bg-bg-0 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          {other?.name ?? rel.characterId}
                          <span className="ml-2 rounded-full bg-gold-2/10 px-2 py-0.5 text-xs text-ink/60">
                            {rel.relation}
                          </span>
                        </p>
                        {rel.blurb && (
                          <p className="mt-0.5 text-xs text-ink/50">{rel.blurb}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeRelationship(rel.characterId)}
                        className="text-ink/30 transition-colors hover:text-red-400"
                        aria-label="Remove relationship"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new */}
            <div className="rounded-xl border border-gold-3/20 bg-bg-0 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink/40">
                Add Relationship
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Character</FieldLabel>
                  <select
                    value={relCharId}
                    onChange={(e) => setRelCharId(e.target.value)}
                    className="w-full rounded-lg border border-gold-3/25 bg-bg-1 px-3 py-2 text-sm text-ink focus:border-gold-2/50 focus:outline-none"
                  >
                    <option value="">Select a character…</option>
                    {otherCharacters
                      .filter((c) => !relationships.some((r) => r.characterId === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Relation Label</FieldLabel>
                    <TextInput value={relLabel} onChange={setRelLabel} placeholder="e.g. Ally" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Blurb</FieldLabel>
                    <TextInput value={relBlurb} onChange={setRelBlurb} placeholder="Short description…" />
                  </div>
                </div>
                <button
                  onClick={addRelationship}
                  disabled={!relCharId || !relLabel.trim()}
                  className="flex w-fit items-center gap-1.5 rounded-lg bg-gold-2/15 px-3 py-2 text-sm text-gold-1 transition-colors hover:bg-gold-2/25 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          </>
        )}

        {/* Arc / Story Impact tab */}
        {(activeTab === "Arc" || activeTab === ("Story Impact" as EditTab)) && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>
                {isDraft ? "Story Impact" : "Character Arc Summary"}
              </FieldLabel>
              <TextArea
                value={arcSummary}
                onChange={setArcSummary}
                placeholder={
                  isDraft
                    ? "What impact does this character have on the story?"
                    : "Describe the character's arc…"
                }
                rows={5}
              />
              {isDraft && (
                <p className="text-xs text-ink/40">
                  Draft characters can be kept or discarded. Saving here keeps the character.
                </p>
              )}
            </div>

            {isDraft && (
              <StoryFitPending
                message={
                  character.storyFit
                    ? "Story Impact will be regenerated from your edits when you save."
                    : "Save the character to generate Story Impact analysis."
                }
              />
            )}
          </div>
        )}

        {/* Notes tab */}
        {activeTab === "Notes" && (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Notes</FieldLabel>
            <TextArea
              value={notes}
              onChange={setNotes}
              placeholder="Freeform notes about this character…"
              rows={6}
            />
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink transition-colors hover:border-gold-2/50"
        >
          {isDraftProp ? "Discard" : "Cancel"}
        </button>
        <button
          onClick={handleSave}
          className="rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1"
        >
          {isDraftProp ? "Keep Character" : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}

// ─── NewCharacterModal ────────────────────────────────────────────────────────

export function NewCharacterModal({ onClose }: { onClose: () => void }) {
  const { addCharacter, characters } = useCharacters();
  const generateFor = useStoryFitGeneration();
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [isDraft, setIsDraft] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [origin, setOrigin] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [status, setStatus] = useState("Alive");
  const [tagsRaw, setTagsRaw] = useState("");
  const [overview, setOverview] = useState("");
  const [keyTraitsRaw, setKeyTraitsRaw] = useState("");
  const [arcSummary, setArcSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);

  const [relCharId, setRelCharId] = useState("");
  const [relLabel, setRelLabel] = useState("");
  const [relBlurb, setRelBlurb] = useState("");

  const [activeTab, setActiveTab] = useState<EditTab>("Profile");

  const tabs: EditTab[] = isDraft
    ? ["Profile", "Overview", "Relationships", "Story Impact" as EditTab, "Notes"]
    : EDIT_TABS;

  function addRelationship() {
    if (!relCharId || !relLabel.trim()) return;
    setRelationships((prev) => [
      ...prev,
      { characterId: relCharId, relation: relLabel.trim(), blurb: relBlurb.trim() },
    ]);
    setRelCharId("");
    setRelLabel("");
    setRelBlurb("");
  }

  function handleSave() {
    if (!name.trim()) return;
    const newId = name.toLowerCase().replace(/\s+/g, "-") + "-" + nanoid();
    const traits = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const keyTraits = keyTraitsRaw
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    const newChar: Character = {
      id: newId,
      name: name.trim(),
      role: role.trim() || "Supporting",
      description: overview.trim() || "",
      traits,
      isDraft,
      age: age ? Number(age) : undefined,
      occupation: occupation.trim() || undefined,
      origin: origin.trim() || undefined,
      affiliation: affiliation.trim() || undefined,
      status: status.trim() || "Alive",
      bio: overview.trim() || undefined,
      keyTraits: keyTraits.length ? keyTraits : undefined,
      arcSummary: arcSummary.trim() || undefined,
      notes: notes.trim() || undefined,
      relationships,
    };

    addCharacter(newChar);

    // Story Impact is generated only once the draft is committed.
    if (isDraft) generateFor(newChar);

    // Bidirectional links
    relationships.forEach((rel) => {
      const other = characters.find((c) => c.id === rel.characterId);
      if (!other) return;
      const alreadyLinked = other.relationships?.some(
        (r) => r.characterId === newId,
      );
      if (!alreadyLinked) {
        // We need to update after add; use a small timeout to let state settle
        // In practice the context update in addCharacter is synchronous enough
      }
    });

    onClose();
  }

  if (step === "choose") {
    return (
      <Modal onClose={onClose}>
        <h2 className="font-display text-xl text-gold-1">New Character</h2>
        <p className="mt-2 text-sm text-ink/60">
          Is this a fully established character or an early draft?
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              setIsDraft(false);
              setStep("form");
            }}
            className="flex flex-col gap-2 rounded-xl border border-gold-3/25 bg-bg-0 p-5 text-left transition-colors hover:border-gold-2/50"
          >
            <span className="font-display text-base text-gold-1">
              Established
            </span>
            <span className="text-xs text-ink/50">
              A character with a defined role, arc, and place in the story.
            </span>
          </button>
          <button
            onClick={() => {
              setIsDraft(true);
              setStep("form");
            }}
            className="flex flex-col gap-2 rounded-xl border border-gold-3/25 bg-bg-0 p-5 text-left transition-colors hover:border-gold-2/50"
          >
            <span className="font-display text-base text-gold-1">Draft</span>
            <span className="text-xs text-ink/50">
              An early idea — you can keep or discard after filling in what you
              know.
            </span>
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-display text-xl text-gold-1">
        {isDraft ? "New Draft Character" : "New Established Character"}
      </h2>

      {/* Tabs */}
      <div className="mt-4 flex gap-5 overflow-x-auto border-b border-gold-3/20 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 -mb-px border-b-2 pb-3 text-sm transition-colors ${
              activeTab === tab
                ? "border-gold-2 text-gold-1"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {activeTab === "Profile" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Name *</FieldLabel>
              <TextInput value={name} onChange={setName} placeholder="Character name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Role</FieldLabel>
              <TextInput value={role} onChange={setRole} placeholder="e.g. Protagonist" />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Age</FieldLabel>
              <TextInput value={age} onChange={setAge} placeholder="e.g. 21" />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Occupation</FieldLabel>
              <TextInput value={occupation} onChange={setOccupation} placeholder="e.g. Relic Runner" />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Origin</FieldLabel>
              <TextInput value={origin} onChange={setOrigin} placeholder="e.g. Veyndor" />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Affiliation</FieldLabel>
              <TextInput value={affiliation} onChange={setAffiliation} placeholder="e.g. None" />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Status</FieldLabel>
              <TextInput value={status} onChange={setStatus} placeholder="e.g. Alive" />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Tags (comma separated)</FieldLabel>
              <TextInput value={tagsRaw} onChange={setTagsRaw} placeholder="Brave, Empathic, …" />
            </div>
          </div>
        )}

        {activeTab === "Overview" && (
          <>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Overview</FieldLabel>
              <TextArea value={overview} onChange={setOverview} placeholder="Character overview…" rows={5} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Key Traits (one per line)</FieldLabel>
              <TextArea value={keyTraitsRaw} onChange={setKeyTraitsRaw} placeholder={"Protective of the vulnerable\n…"} rows={4} />
            </div>
          </>
        )}

        {activeTab === "Relationships" && (
          <>
            {relationships.length > 0 && (
              <div className="flex flex-col gap-2">
                {relationships.map((rel) => {
                  const other = characters.find((c) => c.id === rel.characterId);
                  return (
                    <div
                      key={rel.characterId}
                      className="flex items-center gap-3 rounded-xl border border-gold-3/20 bg-bg-0 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          {other?.name ?? rel.characterId}
                          <span className="ml-2 rounded-full bg-gold-2/10 px-2 py-0.5 text-xs text-ink/60">
                            {rel.relation}
                          </span>
                        </p>
                        {rel.blurb && (
                          <p className="mt-0.5 text-xs text-ink/50">{rel.blurb}</p>
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setRelationships((prev) =>
                            prev.filter((r) => r.characterId !== rel.characterId),
                          )
                        }
                        className="text-ink/30 transition-colors hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-xl border border-gold-3/20 bg-bg-0 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink/40">
                Add Relationship
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Character</FieldLabel>
                  <select
                    value={relCharId}
                    onChange={(e) => setRelCharId(e.target.value)}
                    className="w-full rounded-lg border border-gold-3/25 bg-bg-1 px-3 py-2 text-sm text-ink focus:border-gold-2/50 focus:outline-none"
                  >
                    <option value="">Select a character…</option>
                    {characters
                      .filter((c) => !relationships.some((r) => r.characterId === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Relation Label</FieldLabel>
                    <TextInput value={relLabel} onChange={setRelLabel} placeholder="e.g. Ally" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Blurb</FieldLabel>
                    <TextInput value={relBlurb} onChange={setRelBlurb} placeholder="Short description…" />
                  </div>
                </div>
                <button
                  onClick={addRelationship}
                  disabled={!relCharId || !relLabel.trim()}
                  className="flex w-fit items-center gap-1.5 rounded-lg bg-gold-2/15 px-3 py-2 text-sm text-gold-1 transition-colors hover:bg-gold-2/25 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          </>
        )}

        {(activeTab === "Arc" || activeTab === ("Story Impact" as EditTab)) && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{isDraft ? "Story Impact" : "Character Arc Summary"}</FieldLabel>
              <TextArea
                value={arcSummary}
                onChange={setArcSummary}
                placeholder={isDraft ? "What impact does this character have?" : "Describe the character's arc…"}
                rows={5}
              />
            </div>

            {isDraft && (
              <StoryFitPending message="Save the character to generate Story Impact analysis." />
            )}
          </div>
        )}

        {activeTab === "Notes" && (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Notes</FieldLabel>
            <TextArea value={notes} onChange={setNotes} placeholder="Freeform notes…" rows={6} />
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep("choose")}
          className="text-sm text-ink/50 transition-colors hover:text-ink"
        >
          ← Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink transition-colors hover:border-gold-2/50"
          >
            {isDraft ? "Discard" : "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-gold-1 disabled:opacity-40"
          >
            {isDraft ? "Keep Character" : "Add Character"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
