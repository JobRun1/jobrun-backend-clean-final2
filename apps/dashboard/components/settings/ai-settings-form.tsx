"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Brain, Save } from "lucide-react";

export interface AISettings {
  aiEnabled: boolean;
  responseStyle: "professional" | "friendly" | "casual";
  leadQualification: boolean;
  autoFollowUp: boolean;
  customInstructions?: string;
}

interface AISettingsFormProps {
  initialData?: Partial<AISettings>;
  onSave?: (data: AISettings) => void;
}

export default function AISettingsForm({ initialData, onSave }: AISettingsFormProps) {
  const [formData, setFormData] = useState<AISettings>({
    aiEnabled: initialData?.aiEnabled ?? false,
    responseStyle: initialData?.responseStyle ?? "professional",
    leadQualification: initialData?.leadQualification ?? false,
    autoFollowUp: initialData?.autoFollowUp ?? false,
    customInstructions: initialData?.customInstructions ?? "",
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof AISettings, value: any) => {
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

  const styleOptions = [
    { value: "professional", label: "Professional" },
    { value: "friendly", label: "Friendly" },
    { value: "casual", label: "Casual" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          <CardTitle>AI Assistant Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Enable AI Assistant
              </label>
              <p className="text-sm text-gray-600">
                Use AI to help respond to leads
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.aiEnabled}
                onChange={(e) => handleChange("aiEnabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.aiEnabled && (
            <>
              <Select
                label="Response Style"
                options={styleOptions}
                value={formData.responseStyle}
                onChange={(e) => handleChange("responseStyle", e.target.value as any)}
                helperText="How should the AI communicate with leads?"
                fullWidth
              />

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    AI Lead Qualification
                  </label>
                  <p className="text-sm text-gray-600">
                    Automatically qualify leads based on responses
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.leadQualification}
                    onChange={(e) => handleChange("leadQualification", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    Auto Follow-Up
                  </label>
                  <p className="text-sm text-gray-600">
                    Automatically send follow-up messages
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoFollowUp}
                    onChange={(e) => handleChange("autoFollowUp", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <Textarea
                label="Custom AI Instructions"
                value={formData.customInstructions}
                onChange={(e) => handleChange("customInstructions", e.target.value)}
                placeholder="Add specific instructions for how the AI should handle your leads..."
                rows={5}
                helperText="Optional: Provide context about your business, typical questions, or how to handle specific scenarios"
                fullWidth
              />
            </>
          )}

          <Button type="submit" isLoading={isSaving} fullWidth>
            <Save className="h-4 w-4 mr-2" />
            Save AI Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
