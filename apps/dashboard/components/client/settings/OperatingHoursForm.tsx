"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
}

interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface OperatingHoursFormProps {
  clientId: string;
}

const days = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export function OperatingHoursForm({ clientId }: OperatingHoursFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    monday: { enabled: true, open: "09:00", close: "17:00" },
    tuesday: { enabled: true, open: "09:00", close: "17:00" },
    wednesday: { enabled: true, open: "09:00", close: "17:00" },
    thursday: { enabled: true, open: "09:00", close: "17:00" },
    friday: { enabled: true, open: "09:00", close: "17:00" },
    saturday: { enabled: false, open: "09:00", close: "17:00" },
    sunday: { enabled: false, open: "09:00", close: "17:00" },
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=hours`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const response = await res.json();
          const data = response?.data ?? response;
          if (data.operatingHours) {
            setOperatingHours(data.operatingHours);
          }
        }
      } catch (error) {
        console.error("Failed to fetch operating hours:", error);
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
        `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=hours`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operatingHours }),
        }
      );

      if (res.ok) {
        setMessage({ type: "success", text: "Operating hours saved successfully!" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: "Failed to save operating hours. Please try again." });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: keyof OperatingHours, field: keyof DaySchedule, value: any) => {
    setOperatingHours({
      ...operatingHours,
      [day]: {
        ...operatingHours[day],
        [field]: value,
      },
    });
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
        {days.map((day) => {
          const schedule = operatingHours[day.key as keyof OperatingHours];
          return (
            <div
              key={day.key}
              className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="w-32">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(e) => updateDay(day.key as keyof OperatingHours, "enabled", e.target.checked)}
                    className="h-5 w-5 rounded border-gray-300 text-jobrun-green focus:ring-jobrun-green focus:ring-2 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light">
                    {day.label}
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1">
                  <label className="block text-xs text-jobrun-grey mb-1">Open</label>
                  <input
                    type="time"
                    disabled={!schedule.enabled}
                    value={schedule.open}
                    onChange={(e) => updateDay(day.key as keyof OperatingHours, "open", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  />
                </div>

                <span className="text-jobrun-grey pt-5">-</span>

                <div className="flex-1">
                  <label className="block text-xs text-jobrun-grey mb-1">Close</label>
                  <input
                    type="time"
                    disabled={!schedule.enabled}
                    value={schedule.close}
                    onChange={(e) => updateDay(day.key as keyof OperatingHours, "close", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 jobrun-gradient text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Operating Hours"}
        </button>
      </div>
    </form>
  );
}
