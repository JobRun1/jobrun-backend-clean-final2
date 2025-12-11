"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MessageCircle, Save } from "lucide-react";

export interface MessageSettings {
  autoReplyEnabled: boolean;
  autoReplyMessage?: string;
  businessHoursOnly: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  smsSignature?: string;
}

interface MessageSettingsFormProps {
  initialData?: Partial<MessageSettings>;
  onSave?: (data: MessageSettings) => void;
}

export default function MessageSettingsForm({ initialData, onSave }: MessageSettingsFormProps) {
  const [formData, setFormData] = useState<MessageSettings>({
    autoReplyEnabled: initialData?.autoReplyEnabled ?? false,
    autoReplyMessage: initialData?.autoReplyMessage ?? "",
    businessHoursOnly: initialData?.businessHoursOnly ?? false,
    businessHoursStart: initialData?.businessHoursStart ?? "09:00",
    businessHoursEnd: initialData?.businessHoursEnd ?? "17:00",
    smsSignature: initialData?.smsSignature ?? "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof MessageSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(formData);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <CardTitle>Message Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Auto Reply Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Enable Auto-Reply
              </label>
              <p className="text-sm text-gray-600">
                Automatically respond to new leads
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoReplyEnabled}
                onChange={(e) => handleChange("autoReplyEnabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Auto Reply Message */}
          {formData.autoReplyEnabled && (
            <Textarea
              label="Auto-Reply Message"
              value={formData.autoReplyMessage}
              onChange={(e) => handleChange("autoReplyMessage", e.target.value)}
              placeholder="Thanks for your message! We'll get back to you soon."
              rows={3}
              fullWidth
            />
          )}

          {/* Business Hours Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Business Hours Only
              </label>
              <p className="text-sm text-gray-600">
                Only send auto-replies during business hours
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.businessHoursOnly}
                onChange={(e) => handleChange("businessHoursOnly", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Business Hours */}
          {formData.businessHoursOnly && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                value={formData.businessHoursStart}
                onChange={(e) => handleChange("businessHoursStart", e.target.value)}
                fullWidth
              />
              <Input
                label="End Time"
                type="time"
                value={formData.businessHoursEnd}
                onChange={(e) => handleChange("businessHoursEnd", e.target.value)}
                fullWidth
              />
            </div>
          )}

          {/* SMS Signature */}
          <Input
            label="SMS Signature"
            value={formData.smsSignature}
            onChange={(e) => handleChange("smsSignature", e.target.value)}
            placeholder="- Your Business Name"
            helperText="Automatically added to the end of SMS messages"
            fullWidth
          />

          <Button type="submit" isLoading={isSaving} fullWidth>
            <Save className="h-4 w-4 mr-2" />
            Save Message Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
