"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface BookingSettings {
  defaultJobDuration: number;
  allowSameDayBookings: boolean;
}

interface BookingSettingsFormProps {
  clientId: string;
}

export function BookingSettingsForm({ clientId }: BookingSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [settings, setSettings] = useState<BookingSettings>({
    defaultJobDuration: 60,
    allowSameDayBookings: true,
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=booking`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const response = await res.json();
          const data = response?.data ?? response;
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch booking settings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=booking`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }
      );

      if (res.ok) {
        setMessage({ type: "success", text: "Booking settings saved successfully!" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: "Failed to save settings. Please try again." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 border-4 border-jobrun-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
          Default Job Duration (minutes)
        </label>
        <input
          type="number"
          min="15"
          max="480"
          step="15"
          value={settings.defaultJobDuration}
          onChange={(e) => setSettings({ ...settings, defaultJobDuration: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
        />
        <p className="text-xs text-jobrun-grey mt-1">
          Default duration for appointments (15-480 minutes)
        </p>
      </div>

      <div className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <input
          type="checkbox"
          id="allowSameDayBookings"
          checked={settings.allowSameDayBookings}
          onChange={(e) => setSettings({ ...settings, allowSameDayBookings: e.target.checked })}
          className="h-5 w-5 mt-0.5 rounded border-gray-300 text-jobrun-green focus:ring-jobrun-green focus:ring-2 cursor-pointer"
        />
        <div className="flex-1">
          <label
            htmlFor="allowSameDayBookings"
            className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light cursor-pointer"
          >
            Allow Same-Day Bookings
          </label>
          <p className="text-xs text-jobrun-grey mt-1">
            Enable customers to book appointments for the same day
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 jobrun-gradient text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Booking Settings"}
        </button>
      </div>
    </form>
  );
}
