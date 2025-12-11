"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Modal, ModalFooter } from "../ui/modal";
import { Textarea } from "../ui/textarea";
import { MessageCircle, Phone, Mail, FileText } from "lucide-react";

interface LeadActionsProps {
  leadId: string;
  onAction?: (action: string, data: any) => void;
}

export default function LeadActions({ leadId, onAction }: LeadActionsProps) {
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [smsContent, setSmsContent] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const handleSendSms = () => {
    if (onAction) {
      onAction("sms", { content: smsContent });
    }
    setSmsContent("");
    setShowSmsModal(false);
  };

  const handleSendEmail = () => {
    if (onAction) {
      onAction("email", { subject: emailSubject, content: emailContent });
    }
    setEmailSubject("");
    setEmailContent("");
    setShowEmailModal(false);
  };

  const handleAddNote = () => {
    if (onAction) {
      onAction("note", { content: noteContent });
    }
    setNoteContent("");
    setShowNoteModal(false);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowSmsModal(true)}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Send SMS
        </Button>
        <Button variant="outline" onClick={() => setShowEmailModal(true)}>
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>
        <Button variant="outline">
          <Phone className="h-4 w-4 mr-2" />
          Log Call
        </Button>
        <Button variant="outline" onClick={() => setShowNoteModal(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Add Note
        </Button>
      </div>

      {/* SMS Modal */}
      <Modal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        title="Send SMS"
        description="Send a text message to this lead"
      >
        <Textarea
          label="Message"
          placeholder="Type your message here..."
          value={smsContent}
          onChange={(e) => setSmsContent(e.target.value)}
          rows={4}
          fullWidth
        />
        <p className="text-xs text-gray-500 mt-2">
          {smsContent.length} / 160 characters
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowSmsModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendSms} disabled={!smsContent.trim()}>
            Send SMS
          </Button>
        </ModalFooter>
      </Modal>

      {/* Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Send Email"
        description="Send an email to this lead"
        size="lg"
      >
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
          <Textarea
            placeholder="Email content..."
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            rows={8}
            fullWidth
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEmailModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSendEmail} disabled={!emailSubject.trim() || !emailContent.trim()}>
            Send Email
          </Button>
        </ModalFooter>
      </Modal>

      {/* Note Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Add Note"
        description="Add a note to this lead's timeline"
      >
        <Textarea
          label="Note"
          placeholder="Type your note here..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          rows={6}
          fullWidth
        />
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowNoteModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddNote} disabled={!noteContent.trim()}>
            Add Note
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
