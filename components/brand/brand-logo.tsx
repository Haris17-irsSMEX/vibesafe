import Link from "next/link";
import { cn } from "@/lib/utils";
import { productName } from "@/lib/brand";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  href?: string;
};

function CtrlCodeMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 3.5 26 7.2v7.2c0 6.4-3.9 11.6-10 14.1-6.1-2.5-10-7.7-10-14.1V7.2L16 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m13 11-4 5 4 5m6-10 4 5-4 5m-.7-11-4.6 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BrandLogo({
  compact = false,
  className,
  iconClassName,
  wordmarkClassName,
  href = "/",
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      aria-label={productName}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cc-border-strong bg-cc-surface-raised text-cc-text transition-colors group-hover:bg-cc-surface-hover">
        <CtrlCodeMark className={cn("h-5 w-5", iconClassName)} />
      </span>
      {!compact && (
        <span
          className={cn(
            "text-xl font-semibold tracking-[-0.03em] text-cc-text",
            wordmarkClassName
          )}
        >
          {productName}
        </span>
      )}
    </Link>
  );
}

export { CtrlCodeMark };
