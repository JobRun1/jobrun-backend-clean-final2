"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface BusinessSettings {
  businessName: string;
  phone: string;
  twilioNumber: string;
  region: string;
  timezone: string;
}

interface BusinessSettingsFormProps {
  clientId: string;
}

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
];

export function BusinessSettingsForm({ clientId }: BusinessSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState<BusinessSettings>({
    businessName: "",
    phone: "",
    twilioNumber: "",
    region: "US",
    timezone: "America/New_York",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=business`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const response = await res.json();
          const data = response?.data ?? response;
          setFormData(data);
        }
      } catch (error) {
        console.error("Failed to fetch business settings:", error);
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
        `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=business`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) {
        setMessage({ type: "success", text: "Business settings saved successfully!" });
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
          Business Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
          placeholder="Your Business Name"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
          Twilio Number
        </label>
        <input
          type="tel"
          value={formData.twilioNumber}
          onChange={(e) => setFormData({ ...formData, twilioNumber: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
          placeholder="+1 (555) 987-6543"
        />
        <p className="text-xs text-jobrun-grey mt-1">
          The Twilio phone number used for outbound messaging
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
          Region
        </label>
        <input
          type="text"
          value={formData.region}
          onChange={(e) => setFormData({ ...formData, region: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
          placeholder="US"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
          Timezone
        </label>
        <select
          value={formData.timezone}
          onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 jobrun-gradient text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Business Settings"}
        </button>
      </div>
    </form>
  );
}
