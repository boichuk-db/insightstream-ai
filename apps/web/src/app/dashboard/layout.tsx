import { TrialBanner } from '@/components/billing/TrialBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-brand-bg">
      <TrialBanner />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
