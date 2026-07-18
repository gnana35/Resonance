const PALETTE = [
  "from-gold-3/60 to-bg-1",
  "from-violet-400/40 to-bg-1",
  "from-emerald-500/30 to-bg-1",
  "from-rose-500/30 to-bg-1",
  "from-sky-500/30 to-bg-1",
  "from-amber-500/30 to-bg-1",
];

function paletteIndex(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % PALETTE.length;
  return hash;
}

export function CharacterAvatar({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br font-display text-gold-1 ${PALETTE[paletteIndex(name)]} ${className}`}
    >
      {initial}
    </div>
  );
}
