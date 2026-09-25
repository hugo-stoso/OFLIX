import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="OFLIX início">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-sm font-black text-white">O</span>
      <span>
        <span className="block text-[17px] font-black tracking-[-.03em] text-navy">OFLIX</span>
        {!compact && <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-blue">território em movimento</span>}
      </span>
    </Link>
  );
}
