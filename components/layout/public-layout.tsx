import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { legalCompanyName, shortDescription, supportEmail } from "@/lib/brand";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-cc-bg text-cc-text selection:bg-white/20">
      <header className="fixed top-0 z-50 w-full border-b border-cc-border bg-cc-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <BrandLogo />

          <nav aria-label="Primary navigation" className="hidden items-center gap-8 md:flex">
            <Link
              href="/#product"
              className="text-sm font-medium text-cc-muted transition-colors hover:text-cc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Product
            </Link>
            <Link
              href="/pricing"
              className="text-sm font-medium text-cc-muted transition-colors hover:text-cc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-cc-muted transition-colors hover:text-cc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-cc-muted transition-colors hover:text-cc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:block"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-cc-text px-3 text-xs font-semibold text-cc-bg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-5 sm:text-sm"
            >
              Start review <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">{children}</main>

      <footer className="border-t border-cc-border bg-cc-secondary py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-1 lg:col-span-2">
              <BrandLogo />
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-cc-muted">
                {shortDescription}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-cc-text">Product</h3>
              <ul className="mt-4 space-y-3 text-sm text-cc-muted">
                <li>
                  <Link href="/#product" className="transition-colors hover:text-cc-text">
                    Product tour
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="transition-colors hover:text-cc-text">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="transition-colors hover:text-cc-text">
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-cc-text">Company</h3>
              <ul className="mt-4 space-y-3 text-sm text-cc-muted">
                <li>
                  <Link href="/contact" className="transition-colors hover:text-cc-text">
                    Contact
                  </Link>
                </li>
                <li>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="break-all transition-colors hover:text-cc-text"
                  >
                    {supportEmail}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-cc-text">Legal</h3>
              <ul className="mt-4 space-y-3 text-sm text-cc-muted">
                <li>
                  <Link href="/privacy" className="transition-colors hover:text-cc-text">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition-colors hover:text-cc-text">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className="transition-colors hover:text-cc-text">
                    Refund Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-14 flex flex-col gap-4 border-t border-cc-border pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-cc-subtle">
              &copy; {new Date().getFullYear()} {legalCompanyName}. CtrlCode is a product
              of {legalCompanyName}.
            </p>
            <p className="text-xs text-cc-subtle">Review your code before attackers do.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
