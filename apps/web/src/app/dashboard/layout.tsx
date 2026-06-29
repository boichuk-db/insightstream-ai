import { TrialBanner } from '@/components/billing/TrialBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <TrialBanner />
      {children}
    </div>
  );
}
