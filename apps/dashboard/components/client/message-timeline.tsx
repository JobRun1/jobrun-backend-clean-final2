import { MessageCircle, Phone, Mail, CheckCircle, Clock } from "lucide-react";

export interface Message {
  id: string;
  type: "sms" | "call" | "email" | "note";
  direction?: "inbound" | "outbound";
  content: string;
  timestamp: string;
  status?: "sent" | "delivered" | "failed" | "pending";
  sender?: string;
}

interface MessageTimelineProps {
  messages: Message[];
}

export default function MessageTimeline({ messages }: MessageTimelineProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "sms":
        return <MessageCircle className="h-5 w-5" />;
      case "call":
        return <Phone className="h-5 w-5" />;
      case "email":
        return <Mail className="h-5 w-5" />;
      default:
        return <MessageCircle className="h-5 w-5" />;
    }
  };

  const getColorClasses = (type: string, direction?: string) => {
    if (direction === "inbound") {
      return {
        bg: "bg-blue-100",
        text: "text-blue-600",
        border: "border-blue-200",
      };
    }

    switch (type) {
      case "sms":
        return {
          bg: "bg-green-100",
          text: "text-green-600",
          border: "border-green-200",
        };
      case "call":
        return {
          bg: "bg-purple-100",
          text: "text-purple-600",
          border: "border-purple-200",
        };
      case "email":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-600",
          border: "border-yellow-200",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-600",
          border: "border-gray-200",
        };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-600" />;
      case "failed":
        return <CheckCircle className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No messages yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const colors = getColorClasses(message.type, message.direction);
        return (
          <div key={message.id} className="flex gap-3">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${colors.bg} ${colors.text}`}>
                {getIcon(message.type)}
              </div>
              {index < messages.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 mt-2" />
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 pb-4">
              <div className={`bg-white border ${colors.border} rounded-lg p-4`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {message.type}
                    </span>
                    {message.direction && (
                      <span className="text-xs text-gray-500 capitalize">
                        ({message.direction})
                      </span>
                    )}
                    {message.status && getStatusIcon(message.status)}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{message.content}</p>
                {message.sender && (
                  <p className="text-xs text-gray-500 mt-2">From: {message.sender}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
