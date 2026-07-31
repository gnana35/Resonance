export const AVATAR_PALETTE = [
  "from-emerald-500/40 to-bg-1",   // 0 — teal-green
  "from-rose-500/35 to-bg-1",      // 1 — maroon/rose
  "from-amber-500/40 to-bg-1",     // 2 — gold-brown
  "from-violet-400/45 to-bg-1",    // 3 — violet
  "from-sky-500/35 to-bg-1",       // 4 — sky blue
  "from-gold-3/65 to-bg-1",        // 5 — warm gold
  "from-indigo-400/40 to-bg-1",    // 6 — indigo
  "from-fuchsia-500/30 to-bg-1",   // 7 — fuchsia
  "from-teal-400/35 to-bg-1",      // 8 — teal
  "from-orange-500/35 to-bg-1",    // 9 — orange
  "from-lime-500/30 to-bg-1",      // 10 — lime
  "from-cyan-400/35 to-bg-1",      // 11 — cyan
];

function hashIndex(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash + name.charCodeAt(i)) % AVATAR_PALETTE.length;
  return hash;
}

export function CharacterAvatar({
  name,
  avatarColor,
  portraitUrl,
  className = "",
}: {
  name: string;
  avatarColor?: number;
  /** Approved design artwork — shown in place of the gradient placeholder. */
  portraitUrl?: string;
  className?: string;
}) {
  const index =
    avatarColor !== undefined && avatarColor >= 0 && avatarColor < AVATAR_PALETTE.length
      ? avatarColor
      : hashIndex(name);
  const initial = name.trim().charAt(0).toUpperCase();

  if (portraitUrl) {
    return (
      <div className={`overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portraitUrl}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br font-display text-gold-1 ${AVATAR_PALETTE[index]} ${className}`}
    >
      {initial}
    </div>
  );
}
