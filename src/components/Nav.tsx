import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Glass surface 1 of 3 (nav · dropdown · modal). Floating and translucent so
 * ledger rows scroll visibly beneath it, which is what earns the blur here —
 * it establishes hierarchy against moving content rather than decorating.
 */
export function Nav() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 pointer-events-none">
      <nav className="glass pointer-events-auto flex items-center gap-1 rounded-full pl-4 pr-1.5 py-1.5 max-w-full">
        <Link href="/" className="mr-2 shrink-0 hover:opacity-80 transition-opacity">
          <Logo />
        </Link>
        <span className="h-4 w-px bg-line-strong mr-1 shrink-0" aria-hidden />
        {[
          ["Ledger", "/ledger", ""],
          ["Categories", "/category/rebalancing", "hidden sm:block"],
          ["Method", "/#method", "hidden md:block"],
        ].map(([label, href, hide]) => (
          <Link
            key={label}
            href={href}
            className={`${hide} px-2.5 sm:px-3 py-1.5 rounded-full text-[13px] text-fg-secondary
                       hover:text-fg hover:bg-surface-hover transition-colors whitespace-nowrap`}
          >
            {label}
          </Link>
        ))}
        <ThemeToggle />
        <a
          href="https://bscscan.com/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"
          target="_blank"
          rel="noreferrer noopener"
          className="ml-1 px-3 sm:px-3.5 py-1.5 rounded-full bg-accent text-bg text-[13px] font-semibold
                     hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
        >
          <span className="sm:hidden">Verify</span>
          <span className="hidden sm:inline">Verify on chain</span>
        </a>
      </nav>
    </div>
  );
}
