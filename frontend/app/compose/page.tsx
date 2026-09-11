"use client";

import { useEffect, useRef, useState } from "react";

import { API_URL } from "@/lib/api";
import {
  ArrowLeft,
  Paperclip,
  Clock3,
  Upload,
  Send,
  ChevronDown,
  X,
  Users,
} from "lucide-react";

type Sender = {
  id: string;
  email: string;
  name?: string;
  photoUrl?: string;
};

type Recipient = {
  email: string;
  name?: string;
};

/**
 * Basic but CSV-aware parser.
 * Handles:
 * email,name
 * john@example.com,John
 * "john@example.com","John Doe"
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());

  return result;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ComposePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [senderId, setSenderId] = useState("");
  const [showSenderMenu, setShowSenderMenu] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientInput, setRecipientInput] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [delaySeconds, setDelaySeconds] = useState("2");
  const [hourlyLimit, setHourlyLimit] = useState("100");

  const [scheduledAt, setScheduledAt] = useState("");
  const [showSchedule, setShowSchedule] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingSenders, setLoadingSenders] = useState(true);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSenders();
  }, []);

  async function loadSenders() {
    try {
      setError("");

      const response = await fetch(`${API_URL}/api/senders`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load senders");
      }

      const data = await response.json();

      const senderList = data.senders || data || [];

      setSenders(senderList);

      if (senderList.length > 0) {
        setSenderId(senderList[0].id);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load senders.");
    } finally {
      setLoadingSenders(false);
    }
  }

  function getSenderInitials(sender: Sender) {
    const source = sender.name?.trim() || sender.email.split("@")[0];
    const parts = source.split(/[\\s._-]+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }

  function getSelectedSender() {
    return senders.find((sender) => sender.id === senderId) ?? null;
  }

  function addRecipient() {
    const email = recipientInput.trim();

    if (!email) return;

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const alreadyExists = recipients.some(
      (recipient) =>
        recipient.email.toLowerCase() === email.toLowerCase()
    );

    if (alreadyExists) {
      setRecipientInput("");
      return;
    }

    setRecipients((current) => [
      ...current,
      {
        email,
      },
    ]);

    setRecipientInput("");
    setError("");
    setMessage("");
  }

  function removeRecipient(email: string) {
    setRecipients((current) =>
      current.filter(
        (recipient) =>
          recipient.email.toLowerCase() !== email.toLowerCase()
      )
    );
  }

  function handleRecipientKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addRecipient();
    }
  }

  async function handleCSV(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setError("");
      setMessage("");

      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw new Error("Please upload a CSV file.");
      }

      const text = await file.text();

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        throw new Error("CSV contains no recipients.");
      }

      const headers = parseCSVLine(lines[0]).map((header) =>
        header.trim().toLowerCase()
      );

      const emailIndex = headers.findIndex(
        (header) => header === "email" || header === "email address"
      );

      const nameIndex = headers.findIndex(
        (header) => header === "name" || header === "full name"
      );

      if (emailIndex === -1) {
        throw new Error(
          'CSV must contain an "email" column.'
        );
      }

      const parsed: Recipient[] = [];
      let invalidCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const columns = parseCSVLine(lines[i]);

        const email = columns[emailIndex]?.trim();
        const name =
          nameIndex >= 0
            ? columns[nameIndex]?.trim()
            : undefined;

        if (!email) {
          continue;
        }

        if (!isValidEmail(email)) {
          invalidCount++;
          continue;
        }

        const alreadyExists =
          recipients.some(
            (recipient) =>
              recipient.email.toLowerCase() ===
              email.toLowerCase()
          ) ||
          parsed.some(
            (recipient) =>
              recipient.email.toLowerCase() ===
              email.toLowerCase()
          );

        if (alreadyExists) {
          continue;
        }

        parsed.push({
          email,
          name: name || undefined,
        });
      }

      if (parsed.length === 0) {
        throw new Error(
          "No valid recipients were found in the CSV."
        );
      }

      setRecipients((current) => [
        ...current,
        ...parsed,
      ]);

      if (invalidCount > 0) {
        setMessage(
          `${parsed.length} recipients loaded. ${invalidCount} invalid email${
            invalidCount === 1 ? "" : "s"
          } skipped.`
        );
      } else {
        setMessage(
          `${parsed.length} recipient${
            parsed.length === 1 ? "" : "s"
          } loaded from CSV.`
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to read CSV file."
      );
    }

    // Allows selecting the same file again.
    event.target.value = "";
  }

  async function createCampaign() {
    try {
      setError("");
      setMessage("");

      if (!senderId) {
        setError("Please select a sender.");
        return;
      }

      if (recipients.length === 0) {
        setError("Please add at least one recipient.");
        return;
      }

      if (!subject.trim()) {
        setError("Please enter a subject.");
        return;
      }

      if (!body.trim()) {
        setError("Please enter the email body.");
        return;
      }

      if (!scheduledAt) {
        setError("Please select a start date and time.");
        return;
      }

      if (Number(delaySeconds) < 0) {
        setError("Delay cannot be negative.");
        return;
      }

      if (Number(hourlyLimit) < 1) {
        setError("Hourly limit must be at least 1.");
        return;
      }

      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/campaigns`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: subject.trim(),
            senderId,
            subject: subject.trim(),
            body: body.trim(),
            scheduledAt: new Date(scheduledAt).toISOString(),
            delaySeconds: Number(delaySeconds),
            hourlyLimit: Number(hourlyLimit),
            recipients,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create campaign."
        );
      }

      setMessage("Campaign scheduled successfully.");

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to schedule campaign."
      );
    } finally {
      setLoading(false);
    }
  }

  function getDefaultSchedule() {
    const date = new Date(
      Date.now() + 5 * 60 * 1000
    );

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");
    const hours = String(
      date.getHours()
    ).padStart(2, "0");
    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function sendLater() {
    if (!scheduledAt) {
      setScheduledAt(getDefaultSchedule());
    }

    setShowSchedule(false);
  }

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      {/* Header */}
      <header className="flex h-[72px] items-center justify-between border-b border-[#eeeeee] px-8">
        <button
          onClick={() => {
            window.location.href = "/dashboard";
          }}
          className="flex items-center gap-2 text-lg font-medium hover:text-gray-500"
        >
          <ArrowLeft size={20} />
          Compose New Email
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            title="Upload CSV"
          >
            <Paperclip size={19} />
          </button>

          <button
            type="button"
            onClick={() => setShowSchedule(true)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            title="Schedule email"
          >
            <Clock3 size={19} />
          </button>

          <button
            onClick={createCampaign}
            disabled={loading}
            className="flex h-10 items-center gap-2 rounded-full border border-[#35b94a] px-6 text-sm font-medium text-[#269b3b] hover:bg-[#f1fbf3] disabled:opacity-50"
          >
            <Send size={15} />

            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-[1000px] px-10 py-10">
        {/* From */}
        <div className="grid grid-cols-[100px_1fr] items-center border-b border-[#eeeeee] py-4">
          <span className="text-sm">
            From
          </span>

          <div className="relative w-fit">
            <button
              type="button"
              disabled={loadingSenders || senders.length === 0}
              onClick={() => setShowSenderMenu((current) => !current)}
              className="flex min-w-[290px] items-center gap-3 rounded-md bg-[#f5f7f6] px-3 py-2.5 text-left text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingSenders ? (
                <span className="text-gray-500">
                  Loading senders...
                </span>
              ) : getSelectedSender() ? (
                <>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8f5e9] text-xs font-semibold text-[#269b3b]">
                    {getSelectedSender()?.photoUrl ? (
                      <img
                        src={getSelectedSender()!.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getSenderInitials(getSelectedSender()!)
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#202124]">
                      {getSelectedSender()?.name ||
                        "Ethereal Sender"}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {getSelectedSender()?.email}
                    </span>
                  </span>
                </>
              ) : (
                <span className="text-gray-500">
                  No sender available
                </span>
              )}

              <ChevronDown
                size={15}
                className="ml-auto shrink-0 text-gray-400"
              />
            </button>

            {showSenderMenu && senders.length > 0 && (
              <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-full min-w-[290px] overflow-hidden rounded-lg border border-[#e5e5e5] bg-white p-1 shadow-xl">
                {senders.map((sender) => (
                  <button
                    key={sender.id}
                    type="button"
                    onClick={() => {
                      setSenderId(sender.id);
                      setShowSenderMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-[#f5f7f6]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8f5e9] text-xs font-semibold text-[#269b3b]">
                      {sender.photoUrl ? (
                        <img
                          src={sender.photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getSenderInitials(sender)
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#202124]">
                        {sender.name || "Ethereal Sender"}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {sender.email}
                      </span>
                    </span>

                    {sender.id === senderId && (
                      <span className="text-sm font-semibold text-[#269b3b]">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* To */}
        <div className="grid grid-cols-[100px_1fr_auto] items-center border-b border-[#eeeeee] py-4">
          <span className="text-sm">
            To
          </span>

          <div className="flex min-h-[40px] flex-wrap items-center gap-2">
            {recipients.map((recipient) => (
              <span
                key={recipient.email}
                className="flex items-center gap-1 rounded-full border border-[#39b94b] bg-[#f3fbf4] px-3 py-1 text-xs text-[#269b3b]"
              >
                {recipient.name
                  ? `${recipient.name} <${recipient.email}>`
                  : recipient.email}

                <button
                  type="button"
                  onClick={() =>
                    removeRecipient(recipient.email)
                  }
                  className="ml-1 hover:text-red-500"
                  title="Remove recipient"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            <input
              value={recipientInput}
              onChange={(event) =>
                setRecipientInput(event.target.value)
              }
              onKeyDown={handleRecipientKeyDown}
              onBlur={addRecipient}
              placeholder={
                recipients.length === 0
                  ? "recipient@example.com"
                  : "Add recipient"
              }
              className="min-w-[180px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="ml-6 flex items-center gap-2 text-sm text-[#269b3b] hover:underline"
          >
            <Upload size={15} />
            Upload List
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCSV}
            className="hidden"
          />
        </div>

        {/* Recipient count */}
        {recipients.length > 0 && (
          <div className="flex items-center gap-2 border-b border-[#eeeeee] py-3 text-xs text-gray-400">
            <Users size={14} />
            {recipients.length} recipient
            {recipients.length === 1 ? "" : "s"}
          </div>
        )}

        {/* Subject */}
        <div className="grid grid-cols-[100px_1fr] items-center border-b border-[#eeeeee] py-4">
          <span className="text-sm">
            Subject
          </span>

          <input
            value={subject}
            onChange={(event) =>
              setSubject(event.target.value)
            }
            placeholder="Subject"
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8 border-b border-[#eeeeee] py-4">
          <label className="flex items-center gap-3 text-sm">
            Delay between 2 emails

            <input
              type="number"
              min="0"
              value={delaySeconds}
              onChange={(event) =>
                setDelaySeconds(event.target.value)
              }
              className="h-9 w-[65px] rounded-md bg-[#f5f7f6] px-3 text-center text-sm outline-none"
            />

            <span className="text-xs text-gray-400">
              sec
            </span>
          </label>

          <label className="flex items-center gap-3 text-sm">
            Hourly Limit

            <input
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(event) =>
                setHourlyLimit(event.target.value)
              }
              className="h-9 w-[70px] rounded-md bg-[#f5f7f6] px-3 text-center text-sm outline-none"
            />
          </label>
        </div>

        {/* Editor */}
        <div className="mt-7 overflow-hidden rounded-lg bg-[#fafafa]">
          <textarea
            value={body}
            onChange={(event) =>
              setBody(event.target.value)
            }
            placeholder="Type Your Reply..."
            className="min-h-[350px] w-full resize-none bg-transparent p-5 text-sm leading-7 outline-none placeholder:text-gray-400"
          />

          <div className="flex h-12 items-center gap-5 border-t border-white px-5 text-gray-400">
            <button type="button">↶</button>
            <button type="button">↷</button>

            <span>|</span>

            <button
              type="button"
              className="font-bold"
            >
              B
            </button>

            <button
              type="button"
              className="italic"
            >
              I
            </button>

            <button
              type="button"
              className="underline"
            >
              U
            </button>

            <span>≡</span>
            <span>☷</span>
            <span>❝</span>
          </div>
        </div>

        {/* Status */}
        {message && (
          <p className="mt-5 text-sm text-[#269b3b]">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-5 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      {/* Send Later */}
      {showSchedule && (
        <div
          className="fixed inset-0 z-50 bg-black/10"
          onClick={() => setShowSchedule(false)}
        >
          <div
            className="absolute right-8 top-[90px] w-[300px] rounded-xl border border-[#e5e5e5] bg-white p-5 shadow-xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <h3 className="text-sm font-semibold">
              Send Later
            </h3>

            <p className="mt-4 text-xs text-gray-500">
              Pick date & time
            </p>

            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) =>
                setScheduledAt(event.target.value)
              }
              className="mt-2 h-11 w-full rounded-md border border-[#eeeeee] px-3 text-sm outline-none"
            />

            <div className="mt-5 space-y-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setScheduledAt(
                    getDefaultSchedule()
                  );
                }}
                className="w-full rounded-md px-3 py-2 text-left hover:bg-gray-50"
              >
                In 5 minutes
              </button>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowSchedule(false)
                }
                className="px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={sendLater}
                className="rounded-full border border-[#35b94a] px-5 py-2 text-sm text-[#269b3b]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}