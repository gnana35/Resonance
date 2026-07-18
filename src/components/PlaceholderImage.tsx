import { Image as ImageIcon } from "lucide-react";

const GRADIENTS = [
  "from-violet-900/50 via-bg-1 to-bg-0",
  "from-indigo-900/45 via-bg-1 to-bg-0",
  "from-slate-800/55 via-bg-1 to-bg-0",
  "from-amber-900/35 via-bg-1 to-bg-0",
  "from-stone-800/45 via-bg-1 to-bg-0",
  "from-purple-950/55 via-bg-1 to-bg-0",
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash + seed.charCodeAt(i)) % GRADIENTS.length;
  return hash;
}

export function PlaceholderImage({
  seed,
  icon: Icon = ImageIcon,
  className = "",
}: {
  seed: string;
  icon?: typeof ImageIcon;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${GRADIENTS[hashSeed(seed)]} ${className}`}
    >
      <Icon className="h-6 w-6 text-violet-2/40" />
    </div>
  );
}
