import { BusinessSettingsForm } from "@/components/client/settings/BusinessSettingsForm";
import { OperatingHoursForm } from "@/components/client/settings/OperatingHoursForm";
import { NotificationSettingsForm } from "@/components/client/settings/NotificationSettingsForm";
import { AssistantSettingsForm } from "@/components/client/settings/AssistantSettingsForm";
import { BookingSettingsForm } from "@/components/client/settings/BookingSettingsForm";
import Link from "next/link";

interface SearchParams {
  clientId?: string;
  tab?: string;
}

export default async function ClientSettingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { clientId, tab = "business" } = await searchParams;

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-jobrun-black dark:text-jobrun-grey-light mb-2">
            Missing Client ID
          </h2>
          <p className="text-jobrun-grey">
            Please access this page through the client dashboard.
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "business", label: "Business Profile" },
    { id: "hours", label: "Operating Hours" },
    { id: "notifications", label: "Notifications" },
    { id: "assistant", label: "AI Assistant" },
    { id: "booking", label: "Booking Preferences" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your business settings and preferences</p>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <Link
                key={t.id}
                href={`/client/settings?clientId=${clientId}&tab=${t.id}`}
                className={`
                  px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200
                  ${
                    isActive
                      ? "jobrun-gradient text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-jobrun-grey-dark dark:text-jobrun-grey hover:bg-green-50 dark:hover:bg-gray-600"
                  }
                `}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-jobrun-grey-dark rounded-xl shadow-card p-6">
        {tab === "business" && <BusinessSettingsForm clientId={clientId} />}
        {tab === "hours" && <OperatingHoursForm clientId={clientId} />}
        {tab === "notifications" && <NotificationSettingsForm clientId={clientId} />}
        {tab === "assistant" && <AssistantSettingsForm clientId={clientId} />}
        {tab === "booking" && <BookingSettingsForm clientId={clientId} />}
      </div>
    </div>
  );
}
