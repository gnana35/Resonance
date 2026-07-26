/**
 * Marks a character as an early idea rather than an established part of the
 * story. Established characters are the default state and carry no badge.
 *
 * Same pill treatment as the relationship badges ("Ally", "Adversary"), with
 * gold text so it reads as a status rather than a label.
 */
export function DraftBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`shrink-0 rounded-full bg-gold-2/15 px-2.5 py-0.5 text-xs font-medium text-gold-2 ${className}`}
    >
      Draft
    </span>
  );
}
