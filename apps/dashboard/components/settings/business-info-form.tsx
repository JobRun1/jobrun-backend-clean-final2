"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Building2, Save } from "lucide-react";

export interface BusinessInfo {
  businessName: string;
  phone: string;
  email: string;
  website?: string;
  address?: string;
  description?: string;
}

interface BusinessInfoFormProps {
  initialData?: Partial<BusinessInfo>;
  onSave?: (data: BusinessInfo) => void;
}

export default function BusinessInfoForm({ initialData, onSave }: BusinessInfoFormProps) {
  const [formData, setFormData] = useState<BusinessInfo>({
    businessName: initialData?.businessName ?? "",
    phone: initialData?.phone ?? "",
    email: initialData?.email ?? "",
    website: initialData?.website ?? "",
    address: initialData?.address ?? "",
    description: initialData?.description ?? "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BusinessInfo, string>>>({});

  const handleChange = (field: keyof BusinessInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BusinessInfo, string>> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business name is required";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

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
          <Building2 className="h-5 w-5 text-blue-600" />
          <CardTitle>Business Information</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Business Name"
            value={formData.businessName}
            onChange={(e) => handleChange("businessName", e.target.value)}
            error={errors.businessName}
            placeholder="Your Company Inc."
            fullWidth
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              error={errors.phone}
              placeholder="(555) 123-4567"
              fullWidth
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              error={errors.email}
              placeholder="contact@company.com"
              fullWidth
              required
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={formData.website}
            onChange={(e) => handleChange("website", e.target.value)}
            placeholder="https://www.yourcompany.com"
            fullWidth
          />

          <Input
            label="Business Address"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="123 Main St, City, State 12345"
            fullWidth
          />

          <Textarea
            label="Business Description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe your business..."
            rows={4}
            fullWidth
          />

          <Button type="submit" isLoading={isSaving} fullWidth>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
