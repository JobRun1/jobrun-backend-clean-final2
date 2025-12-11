"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { ArrowRight, CheckCircle } from "lucide-react";

interface StateTransitionPanelProps {
  currentState: string;
  leadId: string;
  onStateChange?: (newState: string, note?: string) => void;
}

export default function StateTransitionPanel({
  currentState,
  leadId,
  onStateChange,
}: StateTransitionPanelProps) {
  const [selectedState, setSelectedState] = useState(currentState);
  const [transitionNote, setTransitionNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const stateOptions = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "proposal", label: "Proposal Sent" },
    { value: "negotiation", label: "Negotiation" },
    { value: "won", label: "Won" },
    { value: "lost", label: "Lost" },
  ];

  const handleUpdateState = async () => {
    if (selectedState === currentState) return;

    setIsUpdating(true);
    try {
      if (onStateChange) {
        await onStateChange(selectedState, transitionNote);
      }
      setTransitionNote("");
    } finally {
      setIsUpdating(false);
    }
  };

  const hasChanges = selectedState !== currentState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Lead State</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current State */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Current State</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {currentState}
            </p>
          </div>

          {/* Arrow */}
          {hasChanges && (
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-gray-400" />
            </div>
          )}

          {/* New State Selector */}
          <Select
            label="New State"
            options={stateOptions}
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            fullWidth
          />

          {/* Transition Note */}
          {hasChanges && (
            <Textarea
              label="Transition Note (Optional)"
              placeholder="Add a note about this state change..."
              value={transitionNote}
              onChange={(e) => setTransitionNote(e.target.value)}
              rows={3}
              fullWidth
            />
          )}

          {/* Update Button */}
          <Button
            onClick={handleUpdateState}
            disabled={!hasChanges || isUpdating}
            isLoading={isUpdating}
            fullWidth
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Update State
          </Button>

          {/* State Transition Guide */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              Typical State Flow
            </h4>
            <div className="text-xs text-blue-800 space-y-1">
              <p>New → Contacted → Qualified</p>
              <p>Qualified → Proposal → Negotiation → Won</p>
              <p>Any state → Lost (if deal falls through)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
