"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface AssistantSettings {
  aiTone: string;
  aiResponseLength: string;
  aiBookingStyle: string;
}

interface AssistantSettingsFormProps {
  clientId: string;
}

export function AssistantSettingsForm({ clientId }: AssistantSettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [settings, setSettings] = useState<AssistantSettings>({
    aiTone: "friendly",
    aiResponseLength: "medium",
    aiBookingStyle: "conversational",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=assistant`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const response = await res.json();
          const data = response?.data ?? response;
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch assistant settings:", error);
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
        `${API_BASE_URL}/api/client/settings?clientId=${clientId}&tab=assistant`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        }
      );

      if (res.ok) {
        setMessage({ type: "success", text: "AI assistant settings saved successfully!" });
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
          Conversation Tone
        </label>
        <select
          value={settings.aiTone}
          onChange={(e) => setSettings({ ...settings, aiTone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
        >
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
        </select>
        <p className="text-xs text-jobrun-grey mt-1">
          How the AI assistant communicates with your customers
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
          Response Length
        </label>
        <select
          value={settings.aiResponseLength}
          onChange={(e) => setSettings({ ...settings, aiResponseLength: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
        >
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="detailed">Detailed</option>
        </select>
        <p className="text-xs text-jobrun-grey mt-1">
          Preferred length of AI responses to customer inquiries
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-jobrun-black dark:text-jobrun-grey-light mb-2">
          Booking Style
        </label>
        <select
          value={settings.aiBookingStyle}
          onChange={(e) => setSettings({ ...settings, aiBookingStyle: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-jobrun-black dark:text-jobrun-grey-light focus:ring-2 focus:ring-jobrun-green focus:border-transparent transition-all"
        >
          <option value="direct">Direct</option>
          <option value="conversational">Conversational</option>
        </select>
        <p className="text-xs text-jobrun-grey mt-1">
          How the AI assistant handles booking requests and scheduling
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 jobrun-gradient text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save AI Assistant Settings"}
        </button>
      </div>
    </form>
  );
}
