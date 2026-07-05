import { TrialBanner } from '@/components/billing/TrialBanner';
import { DevtoolsShortcut } from '@/components/dashboard/DevtoolsShortcut';
import { TeamProvider } from '@/contexts/TeamContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TeamProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-brand-bg">
        <TrialBanner />
        <DevtoolsShortcut />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </TeamProvider>
  );
}
