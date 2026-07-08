import { SiteHeader } from "@/components/site-header";
import { MarketingFooter } from "@/components/marketing";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink">
      <SiteHeader />
      {/* Clearance for the fixed header. Full-bleed hero sections pull back
          up with a negative top margin so the photograph reaches the top. */}
      <main className="pt-20 md:pt-24">{children}</main>
      <MarketingFooter />
    </div>
  );
}
