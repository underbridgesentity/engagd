import { MarketingNav, MarketingFooter } from "@/components/marketing";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
