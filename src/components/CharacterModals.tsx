"use client";

/**
 * CharacterModals — all character-related overlays:
 *  • EditCharacterModal: full tabbed form; hand-edited fields are locked on save
 *  • DeleteCharacterModal: confirmation with cascade
 *  • DesignCharacterModal: avatar color picker
 *  • NewCharacterModal: Established vs Draft choice → form
 */

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  Plus,
  X,
} from "lucide-react";
import { useCharacters } from "@/context/CharactersContext";
import { AVATAR_PALETTE } from "@/components/CharacterAvatar";
import type { Character, CharacterRelationship, LockableField } from "@/data/characters";

// ─── Helpers ────────────────────────────────────────────────────────────────

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

function Modal({
  onClose,
  children,
  wide,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 px-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
        <span className="text-ink">{character.name}</span>? This removes them from
        every relationship, arc record, and evaluation. This cannot be undone.
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

export function DesignCharacterModal({
  character,
  onClose,
}: {
  character: Character;
  onClose: () => void;
}) {
  const { updateCharacter } = useCharacters();
  const [selected, setSelected] = useState<number | null>(character.avatarColor ?? null);

  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-display text-xl text-gold-1">Design — {character.name}</h2>
      <p className="mt-1 text-sm text-ink/50">Choose an avatar colour.</p>

      <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6">
        {AVATAR_PALETTE.map((gradient, idx) => (
          <button
            key={idx}
            onClick={() => setSelected(idx)}
            className={`aspect-square overflow-hidden rounded-xl border-2 transition-all ${
              selected === idx ? "scale-105 border-gold-2" : "border-gold-3/20 hover:border-gold-3/50"
            }`}
          >
            <div
              className={`flex h-full w-full items-center justify-center bg-gradient-to-br font-display text-2xl text-gold-1 ${gradient}`}
            >
              {character.name.trim().charAt(0).toUpperCase()}
            </div>
            {selected === idx && (
              <div className="absolute inset-0 flex items-end justify-end p-1">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gold-2">
                  <Check className="h-2.5 w-2.5 text-bg-0" />
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink hover:border-gold-2/50">
          Cancel
        </button>
        <button
          onClick={() => { if (selected !== null) { updateCharacter(character.id, { avatarColor: selected }); onClose(); } }}
          disabled={selected === null}
          className="rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 hover:bg-gold-1 disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </Modal>
  );
}

// ─── EditCharacterModal ───────────────────────────────────────────────────────

type EditTab = "Profile" | "Overview" | "Relationships" | "Arc" | "Notes";
const EDIT_TABS: EditTab[] = ["Profile", "Overview", "Relationships", "Arc", "Notes"];

export function EditCharacterModal({
  character,
  onClose,
}: {
  character: Character;
  onClose: () => void;
}) {
  const { updateCharacter, lockField, allCharacters } = useCharacters();
  const isDraft = character.isDraft;

  // Track which fields the user actually edits so we can lock them
  const editedFields = useRef<Set<LockableField>>(new Set());

  function markEdited(field: LockableField) {
    editedFields.current.add(field);
  }

  // Form state — initialised from character
  const [name,        setName]        = useState(character.name);
  const [role,        setRole]        = useState(character.role);
  const [age,         setAge]         = useState(String(character.age ?? ""));
  const [occupation,  setOccupation]  = useState(character.occupation ?? "");
  const [origin,      setOrigin]      = useState(character.origin ?? "");
  const [affiliation, setAffiliation] = useState(character.affiliation ?? "");
  const [status,      setStatus]      = useState(character.status ?? "");
  const [tagsRaw,     setTagsRaw]     = useState(character.traits.join(", "));
  const [overview,    setOverview]    = useState(character.bio ?? character.description);
  const [keyTraitsRaw, setKeyTraitsRaw] = useState((character.keyTraits ?? []).join("\n"));
  const [arcSummary,  setArcSummary]  = useState(character.arcSummary ?? "");
  const [notes,       setNotes]       = useState(character.notes ?? "");
  const [relationships, setRelationships] = useState<CharacterRelationship[]>(character.relationships ?? []);

  const [relCharId, setRelCharId] = useState("");
  const [relLabel,  setRelLabel]  = useState("");
  const [relBlurb,  setRelBlurb]  = useState("");
  const [activeTab, setActiveTab] = useState<EditTab>("Profile");

  const tabs: EditTab[] = isDraft
    ? ["Profile", "Overview", "Relationships", "Arc", "Notes"]
    : EDIT_TABS;

  const otherChars = allCharacters.filter((c) => c.id !== character.id);

  function addRelationship() {
    if (!relCharId || !relLabel.trim()) return;
    if (relationships.some((r) => r.characterId === relCharId)) return;
    setRelationships((prev) => [
      ...prev,
      { characterId: relCharId, relation: relLabel.trim(), blurb: relBlurb.trim() },
    ]);
    setRelCharId(""); setRelLabel(""); setRelBlurb("");
  }

  function removeRelationship(charId: string) {
    // Also remove reverse link
    const other = allCharacters.find((c) => c.id === charId);
    if (other) {
      updateCharacter(other.id, {
        relationships: (other.relationships ?? []).filter((r) => r.characterId !== character.id),
      });
    }
    setRelationships((prev) => prev.filter((r) => r.characterId !== charId));
  }

  function handleSave() {
    const traits     = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    const keyTraits  = keyTraitsRaw.split("\n").map((t) => t.trim()).filter(Boolean);
    const edited     = editedFields.current;

    const update: Partial<Character> = {
      name:        name.trim() || character.name,
      role:        role.trim() || character.role,
      age:         age.trim() !== "" && !Number.isNaN(Number(age)) ? Number(age) : undefined,
      occupation:  occupation.trim() || undefined,
      origin:      origin.trim() || undefined,
      affiliation: affiliation.trim() || undefined,
      status:      status.trim() || undefined,
      traits,
      bio:         overview.trim() || undefined,
      description: overview.trim() || character.description,
      keyTraits:   keyTraits.length ? keyTraits : undefined,
      arcSummary:  arcSummary.trim() || undefined,
      notes:       notes.trim() || undefined,
      relationships,
    };

    updateCharacter(character.id, update);

    // Lock every field the writer touched
    for (const field of edited) {
      lockField(character.id, field);
    }

    // Bidirectional relationships: add reverse entry where missing
    relationships.forEach((rel) => {
      const other = allCharacters.find((c) => c.id === rel.characterId);
      if (!other) return;
      const alreadyLinked = other.relationships?.some((r) => r.characterId === character.id);
      if (!alreadyLinked) {
        updateCharacter(other.id, {
          relationships: [
            ...(other.relationships ?? []),
            {
              characterId: character.id,
              relation: rel.relation,
              blurb: rel.blurb,
              proposed: other.isDraft || isDraft,
            },
          ],
        });
      }
    });

    onClose();
  }

  const tabLabel = (tab: EditTab) => isDraft && tab === "Arc" ? "Story Impact" : tab;

  // Defined before return so the linter does not flag .current access inside JSX
  const profileFields: { label: string; value: string; set: (v: string) => void; placeholder?: string }[] = [
    { label: "Name",        value: name,        set: (v) => { setName(v);        markEdited("name"); } },
    { label: "Role",        value: role,        set: (v) => { setRole(v);        markEdited("role"); },        placeholder: "e.g. Protagonist" },
    { label: "Age",         value: age,         set: (v) => { setAge(v);         markEdited("age"); },         placeholder: "e.g. 21" },
    { label: "Occupation",  value: occupation,  set: (v) => { setOccupation(v);  markEdited("occupation"); },  placeholder: "e.g. Relic Runner" },
    { label: "Origin",      value: origin,      set: (v) => { setOrigin(v);      markEdited("origin"); } },
    { label: "Affiliation", value: affiliation, set: (v) => { setAffiliation(v); markEdited("affiliation"); } },
    { label: "Status",      value: status,      set: (v) => { setStatus(v);      markEdited("status"); } },
    { label: "Tags (comma separated)", value: tagsRaw, set: (v) => { setTagsRaw(v); markEdited("traits"); }, placeholder: "Brave, Empathic, …" },
  ];

  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-display text-xl text-gold-1">Edit — {character.name}</h2>

      <div className="mt-4 flex gap-5 overflow-x-auto border-b border-gold-3/20 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 -mb-px border-b-2 pb-3 text-sm transition-colors ${
              activeTab === tab ? "border-gold-2 text-gold-1" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {/* Profile */}
        {activeTab === "Profile" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profileFields.map(({ label, value, set, placeholder }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <FieldLabel>{label}</FieldLabel>
                <TextInput value={value} onChange={set} placeholder={placeholder} />
              </div>
            ))}
          </div>
        )}

        {/* Overview */}
        {activeTab === "Overview" && (
          <>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Overview</FieldLabel>
              <TextArea value={overview} onChange={(v) => { setOverview(v); markEdited("bio"); }} placeholder="Character overview…" rows={5} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Key Traits (one per line)</FieldLabel>
              <TextArea value={keyTraitsRaw} onChange={(v) => { setKeyTraitsRaw(v); markEdited("keyTraits"); }} placeholder={"Protective of the vulnerable\nStruggles with trust\n…"} rows={4} />
            </div>
          </>
        )}

        {/* Relationships */}
        {activeTab === "Relationships" && (
          <>
            {relationships.length > 0 && (
              <div className="flex flex-col gap-2">
                {relationships.map((rel) => {
                  const other = allCharacters.find((c) => c.id === rel.characterId);
                  return (
                    <div key={rel.characterId} className="flex items-center gap-3 rounded-xl border border-gold-3/20 bg-bg-0 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          {other?.name ?? rel.characterId}
                          <span className="ml-2 rounded-full bg-gold-2/10 px-2 py-0.5 text-xs text-ink/60">{rel.relation}</span>
                        </p>
                        {rel.blurb && <p className="mt-0.5 text-xs text-ink/50">{rel.blurb}</p>}
                      </div>
                      <button onClick={() => removeRelationship(rel.characterId)} className="text-ink/30 hover:text-red-400" aria-label="Remove">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-xl border border-gold-3/20 bg-bg-0 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink/40">Add Relationship</p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Character</FieldLabel>
                  <select value={relCharId} onChange={(e) => setRelCharId(e.target.value)}
                    className="w-full rounded-lg border border-gold-3/25 bg-bg-1 px-3 py-2 text-sm text-ink focus:border-gold-2/50 focus:outline-none">
                    <option value="">Select a character…</option>
                    {otherChars.filter((c) => !relationships.some((r) => r.characterId === c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Relation</FieldLabel>
                    <TextInput value={relLabel} onChange={setRelLabel} placeholder="e.g. Ally" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Blurb</FieldLabel>
                    <TextInput value={relBlurb} onChange={setRelBlurb} placeholder="Short description…" />
                  </div>
                </div>
                <button onClick={addRelationship} disabled={!relCharId || !relLabel.trim()}
                  className="flex w-fit items-center gap-1.5 rounded-lg bg-gold-2/15 px-3 py-2 text-sm text-gold-1 hover:bg-gold-2/25 disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" />Add
                </button>
              </div>
            </div>
          </>
        )}

        {/* Arc / Story Impact */}
        {activeTab === "Arc" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{isDraft ? "Intended Arc / Story Impact" : "Character Arc Summary"}</FieldLabel>
              <TextArea
                value={arcSummary}
                onChange={(v) => { setArcSummary(v); markEdited("arcSummary"); }}
                placeholder={isDraft ? "What impact does this character have on the story?" : "Describe the character's arc…"}
                rows={5}
              />
              {isDraft && (
                <p className="text-xs text-ink/40">
                  Save and use the Fit Evaluation button on the Arc tab to evaluate this character against the manuscript.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {activeTab === "Notes" && (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Notes</FieldLabel>
            <TextArea value={notes} onChange={setNotes} placeholder="Freeform notes about this character…" rows={6} />
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink hover:border-gold-2/50">
          Cancel
        </button>
        <button onClick={handleSave} className="rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 hover:bg-gold-1">
          Save Changes
        </button>
      </div>
    </Modal>
  );
}

// ─── NewCharacterModal ────────────────────────────────────────────────────────

export function NewCharacterModal({ onClose }: { onClose: () => void }) {
  const { addCharacter, allCharacters, updateCharacter } = useCharacters();
  // New Character always creates a Draft. Established characters come from the
  // manuscript — they need no creation form.
  const isDraft = true;

  // Infer the active project from localStorage
  const projectId = (() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("resonance:activeProject") ?? "";
  })();

  // Form state — all fields blank (no seed data)
  const [name,         setName]         = useState("");
  const [role,         setRole]         = useState("");
  const [age,          setAge]          = useState("");
  const [occupation,   setOccupation]   = useState("");
  const [origin,       setOrigin]       = useState("");
  const [affiliation,  setAffiliation]  = useState("");
  const [status,       setStatus]       = useState("Alive");
  const [tagsRaw,      setTagsRaw]      = useState("");
  const [overview,     setOverview]     = useState("");
  const [keyTraitsRaw, setKeyTraitsRaw] = useState("");
  const [arcSummary,   setArcSummary]   = useState("");
  const [notes,        setNotes]        = useState("");
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);

  const [relCharId, setRelCharId] = useState("");
  const [relLabel,  setRelLabel]  = useState("");
  const [relBlurb,  setRelBlurb]  = useState("");
  const [activeTab, setActiveTab] = useState<EditTab>("Profile");

  const projectChars = allCharacters.filter((c) => !projectId || c.projectId === projectId);

  function addRelationship() {
    if (!relCharId || !relLabel.trim()) return;
    if (relationships.some((r) => r.characterId === relCharId)) return;
    setRelationships((prev) => [...prev, { characterId: relCharId, relation: relLabel.trim(), blurb: relBlurb.trim() }]);
    setRelCharId(""); setRelLabel(""); setRelBlurb("");
  }

  function handleSave() {
    if (!name.trim()) return;
    const newId   = `${Date.now()}-${nanoid()}`;
    const traits  = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    const keyTraits = keyTraitsRaw.split("\n").map((t) => t.trim()).filter(Boolean);
    const now     = Date.now();

    const newChar: Character = {
      id:          newId,
      projectId:   projectId || `proj-${nanoid()}`,
      name:        name.trim(),
      role:        role.trim() || "Supporting",
      description: overview.trim() || "",
      traits,
      isDraft,
      age:         age ? Number(age) : undefined,
      occupation:  occupation.trim() || undefined,
      origin:      origin.trim() || undefined,
      affiliation: affiliation.trim() || undefined,
      status:      status.trim() || "Alive",
      bio:         overview.trim() || undefined,
      keyTraits:   keyTraits.length ? keyTraits : undefined,
      arcSummary:  arcSummary.trim() || undefined,
      notes:       notes.trim() || undefined,
      relationships,
      // Writer created this manually — lock the fields they provided
      lockedFields: {
        ...(name.trim()        ? { name: true as const } : {}),
        ...(role.trim()        ? { role: true as const } : {}),
        ...(overview.trim()    ? { bio: true as const, description: true as const } : {}),
        ...(arcSummary.trim()  ? { arcSummary: true as const } : {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    addCharacter(newChar);

    // Bidirectional relationships
    relationships.forEach((rel) => {
      const other = allCharacters.find((c) => c.id === rel.characterId);
      if (!other) return;
      const alreadyLinked = other.relationships?.some((r) => r.characterId === newId);
      if (!alreadyLinked) {
        updateCharacter(other.id, {
          relationships: [
            ...(other.relationships ?? []),
            { characterId: newId, relation: rel.relation, blurb: rel.blurb, proposed: isDraft },
          ],
        });
      }
    });

    // Save active project so the characters page can find it
    if (newChar.projectId) {
      localStorage.setItem("resonance:activeProject", newChar.projectId);
    }

    onClose();
  }

  const tabLabel = (tab: EditTab) => tab === "Arc" ? "Story Impact" : tab;

  return (
    <Modal onClose={onClose} wide>
      <h2 className="font-display text-xl text-gold-1">New Draft Character</h2>
      <p className="mt-1 text-sm text-ink/50">
        Established characters appear automatically when you write them into a chapter.
      </p>

      <div className="mt-4 flex gap-5 overflow-x-auto border-b border-gold-3/20 pb-px">
        {(["Profile", "Overview", "Relationships", "Arc", "Notes"] as EditTab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`shrink-0 -mb-px border-b-2 pb-3 text-sm transition-colors ${
              activeTab === tab ? "border-gold-2 text-gold-1" : "border-transparent text-ink/50 hover:text-ink"
            }`}>
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {activeTab === "Profile" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { label: "Name *", value: name, set: setName, placeholder: "Character name" },
              { label: "Role",   value: role, set: setRole, placeholder: "e.g. Protagonist" },
              { label: "Age",    value: age,  set: setAge,  placeholder: "e.g. 21" },
              { label: "Occupation",  value: occupation,  set: setOccupation,  placeholder: "e.g. Relic Runner" },
              { label: "Origin",      value: origin,      set: setOrigin },
              { label: "Affiliation", value: affiliation, set: setAffiliation },
              { label: "Status",      value: status,      set: setStatus },
              { label: "Tags (comma separated)", value: tagsRaw, set: setTagsRaw, placeholder: "Brave, Empathic, …" },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <FieldLabel>{label}</FieldLabel>
                <TextInput value={value} onChange={set} placeholder={placeholder} />
              </div>
            ))}
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
                  const other = allCharacters.find((c) => c.id === rel.characterId);
                  return (
                    <div key={rel.characterId} className="flex items-center gap-3 rounded-xl border border-gold-3/20 bg-bg-0 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          {other?.name ?? rel.characterId}
                          <span className="ml-2 rounded-full bg-gold-2/10 px-2 py-0.5 text-xs text-ink/60">{rel.relation}</span>
                        </p>
                        {rel.blurb && <p className="mt-0.5 text-xs text-ink/50">{rel.blurb}</p>}
                      </div>
                      <button onClick={() => setRelationships((p) => p.filter((r) => r.characterId !== rel.characterId))}
                        className="text-ink/30 hover:text-red-400">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-xl border border-gold-3/20 bg-bg-0 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink/40">Add Relationship</p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Character</FieldLabel>
                  <select value={relCharId} onChange={(e) => setRelCharId(e.target.value)}
                    className="w-full rounded-lg border border-gold-3/25 bg-bg-1 px-3 py-2 text-sm text-ink focus:border-gold-2/50 focus:outline-none">
                    <option value="">Select a character…</option>
                    {projectChars.filter((c) => !relationships.some((r) => r.characterId === c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Relation</FieldLabel>
                    <TextInput value={relLabel} onChange={setRelLabel} placeholder="e.g. Ally" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Blurb</FieldLabel>
                    <TextInput value={relBlurb} onChange={setRelBlurb} placeholder="Short description…" />
                  </div>
                </div>
                <button onClick={addRelationship} disabled={!relCharId || !relLabel.trim()}
                  className="flex w-fit items-center gap-1.5 rounded-lg bg-gold-2/15 px-3 py-2 text-sm text-gold-1 hover:bg-gold-2/25 disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" />Add
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === "Arc" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>{isDraft ? "Intended Arc / Story Impact" : "Character Arc Summary"}</FieldLabel>
              <TextArea value={arcSummary} onChange={setArcSummary}
                placeholder={isDraft ? "What impact does this character have on the story?" : "Describe the character's arc…"}
                rows={5} />
              {isDraft && (
                <p className="text-xs text-ink/40">
                  After saving, use the Fit Evaluation button on the Arc tab to evaluate this character against the manuscript.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "Notes" && (
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Notes</FieldLabel>
            <TextArea value={notes} onChange={setNotes} placeholder="Freeform notes…" rows={6} />
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink hover:border-gold-2/50">
          Discard
        </button>
        <button onClick={handleSave} disabled={!name.trim()}
          className="rounded-full bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 hover:bg-gold-1 disabled:opacity-40">
          Keep Draft
        </button>
      </div>
    </Modal>
  );
}
