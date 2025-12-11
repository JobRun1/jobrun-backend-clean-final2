"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Button } from "../ui/button";
import { Calendar, Save } from "lucide-react";

export interface BookingSettings {
  calendarEnabled: boolean;
  bookingUrl?: string;
  defaultDuration: number;
  bufferTime: number;
  maxAdvanceBooking: number;
}

interface BookingSettingsFormProps {
  initialData?: Partial<BookingSettings>;
  onSave?: (data: BookingSettings) => void;
}

export default function BookingSettingsForm({ initialData, onSave }: BookingSettingsFormProps) {
  const [formData, setFormData] = useState<BookingSettings>({
    calendarEnabled: initialData?.calendarEnabled ?? false,
    bookingUrl: initialData?.bookingUrl ?? "",
    defaultDuration: initialData?.defaultDuration ?? 30,
    bufferTime: initialData?.bufferTime ?? 15,
    maxAdvanceBooking: initialData?.maxAdvanceBooking ?? 30,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (field: keyof BookingSettings, value: any) => {
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

  const durationOptions = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" },
  ];

  const bufferOptions = [
    { value: "0", label: "No buffer" },
    { value: "5", label: "5 minutes" },
    { value: "10", label: "10 minutes" },
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
  ];

  const advanceBookingOptions = [
    { value: "7", label: "1 week" },
    { value: "14", label: "2 weeks" },
    { value: "30", label: "1 month" },
    { value: "60", label: "2 months" },
    { value: "90", label: "3 months" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <CardTitle>Booking Settings</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Calendar Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">
                Enable Calendar Booking
              </label>
              <p className="text-sm text-gray-600">
                Allow leads to book appointments directly
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.calendarEnabled}
                onChange={(e) => handleChange("calendarEnabled", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.calendarEnabled && (
            <>
              <Input
                label="Booking URL"
                type="url"
                value={formData.bookingUrl}
                onChange={(e) => handleChange("bookingUrl", e.target.value)}
                placeholder="https://calendly.com/yourname"
                helperText="Your Calendly, Cal.com, or other booking link"
                fullWidth
              />

              <Select
                label="Default Appointment Duration"
                options={durationOptions}
                value={formData.defaultDuration.toString()}
                onChange={(e) => handleChange("defaultDuration", parseInt(e.target.value))}
                fullWidth
              />

              <Select
                label="Buffer Time Between Appointments"
                options={bufferOptions}
                value={formData.bufferTime.toString()}
                onChange={(e) => handleChange("bufferTime", parseInt(e.target.value))}
                fullWidth
              />

              <Select
                label="Maximum Advance Booking"
                options={advanceBookingOptions}
                value={formData.maxAdvanceBooking.toString()}
                onChange={(e) => handleChange("maxAdvanceBooking", parseInt(e.target.value))}
                helperText="How far in advance can leads book?"
                fullWidth
              />
            </>
          )}

          <Button type="submit" isLoading={isSaving} fullWidth>
            <Save className="h-4 w-4 mr-2" />
            Save Booking Settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
