"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface NotificationSettings {
  emailAlerts: boolean;
  smsAlerts: boolean;
  dailySummary: boolean;
}

interface NotificationSettingsFormProps {
  clientId: string;
}

export function NotificationSettingsForm({ clientId }: NotificationSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    emailAlerts: true,
    smsAlerts: false,
    dailySummary: true,
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=notifications`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const response = await res.json();
          const data = response?.data ?? response;
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch notification settings:", error);
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
        `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=notifications`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }
      );

      if (res.ok) {
        setMessage({ type: "success", text: "Notification settings saved successfully!" });
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

      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <input
            type="checkbox"
            id="emailAlerts"
            checked={settings.emailAlerts}
            onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
            className="h-5 w-5 mt-0.5 rounded border-gray-300 text-jobrun-green focus:ring-jobrun-green focus:ring-2 cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="emailAlerts"
              className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light cursor-pointer"
            >
              Email Alerts
            </label>
            <p className="text-xs text-jobrun-grey mt-1">
              Receive email notifications for new leads, messages, and bookings
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <input
            type="checkbox"
            id="smsAlerts"
            checked={settings.smsAlerts}
            onChange={(e) => setSettings({ ...settings, smsAlerts: e.target.checked })}
            className="h-5 w-5 mt-0.5 rounded border-gray-300 text-jobrun-green focus:ring-jobrun-green focus:ring-2 cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="smsAlerts"
              className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light cursor-pointer"
            >
              SMS Alerts
            </label>
            <p className="text-xs text-jobrun-grey mt-1">
              Receive text message alerts for urgent notifications
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <input
            type="checkbox"
            id="dailySummary"
            checked={settings.dailySummary}
            onChange={(e) => setSettings({ ...settings, dailySummary: e.target.checked })}
            className="h-5 w-5 mt-0.5 rounded border-gray-300 text-jobrun-green focus:ring-jobrun-green focus:ring-2 cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="dailySummary"
              className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light cursor-pointer"
            >
              Daily Summary
            </label>
            <p className="text-xs text-jobrun-grey mt-1">
              Get a daily email summary of leads, conversations, and bookings
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 jobrun-gradient text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Notification Settings"}
        </button>
      </div>
    </form>
  );
}
