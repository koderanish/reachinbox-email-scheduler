"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { API_URL } from "@/lib/api";
import {
  ArrowLeft,
  Clock3,
  Mail,
  Send,
  User,
} from "lucide-react";

type Email = {
  id: string;
  recipient_email?: string;
  recipient_name?: string | null;
  sender_email?: string;
  subject?: string;
  body?: string;
  status?: string;
  scheduled_at?: string;
  sent_at?: string | null;
  created_at?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmailDetailPage() {
  const params = useParams();
  const router = useRouter();

  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEmail() {
      try {
        setLoading(true);
        setError("");

        const emailId = params.id as string;

        const [sentResponse, scheduledResponse] = await Promise.all([
          fetch(`${API_URL}/api/emails?status=sent`, {
            credentials: "include",
          }),
          fetch(`${API_URL}/api/emails?status=scheduled`, {
            credentials: "include",
          }),
        ]);

        if (
          sentResponse.status === 401 ||
          scheduledResponse.status === 401
        ) {
          router.push("/");
          return;
        }

        if (!sentResponse.ok || !scheduledResponse.ok) {
          throw new Error("Failed to load emails");
        }

        const sentData = await sentResponse.json();
        const scheduledData = await scheduledResponse.json();

        const sentEmails: Email[] = Array.isArray(sentData)
          ? sentData
          : sentData.emails || [];

        const scheduledEmails: Email[] = Array.isArray(scheduledData)
          ? scheduledData
          : scheduledData.emails || [];

        const allEmails = [...sentEmails, ...scheduledEmails];

        const foundEmail = allEmails.find(
          (item) => item.id === emailId
        );

        if (!foundEmail) {
          setError("Email not found");
          return;
        }

        setEmail(foundEmail);
      } catch (err) {
        console.error(err);
        setError("Unable to load this email");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadEmail();
    }
  }, [params.id, router]);

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      {/* Header */}
      <header className="flex h-[72px] items-center justify-between border-b border-[#eeeeee] px-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-3 text-[18px] font-medium transition hover:opacity-60"
        >
          <ArrowLeft size={21} strokeWidth={1.8} />
          <span>Back</span>
        </button>

        {email && (
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[13px] font-medium ${
                email.status === "sent"
                  ? "bg-[#e5f5e9] text-[#159447]"
                  : "bg-[#fff2dc] text-[#d88700]"
              }`}
            >
              {email.status === "sent" ? "Sent" : "Scheduled"}
            </span>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="mx-auto max-w-[1000px] px-10 py-10">
        {loading && (
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="text-[15px] text-[#8b95a5]">
              Loading email...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex min-h-[500px] flex-col items-center justify-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f6f7]">
              <Mail size={25} className="text-[#9aa3af]" />
            </div>

            <p className="text-[16px] font-medium">
              {error}
            </p>

            <button
              onClick={() => router.back()}
              className="mt-5 rounded-full border border-[#22a447] px-5 py-2 text-[14px] text-[#159447] transition hover:bg-[#f0faf3]"
            >
              Go back
            </button>
          </div>
        )}

        {!loading && !error && email && (
          <>
            {/* Subject */}
            <h1 className="mb-8 text-[26px] font-semibold tracking-[-0.3px]">
              {email.subject || "(No subject)"}
            </h1>

            {/* Email information */}
            <div className="overflow-hidden rounded-xl border border-[#eeeeee]">
              {/* To */}
              <div className="grid grid-cols-[120px_1fr] items-center border-b border-[#eeeeee] px-6 py-5">
                <div className="flex items-center gap-2 text-[14px] text-[#8b95a5]">
                  <User size={16} />
                  To
                </div>

                <div className="text-[15px]">
                  {email.recipient_name
                    ? `${email.recipient_name} <${email.recipient_email}>`
                    : email.recipient_email || "—"}
                </div>
              </div>

              {/* From */}
              <div className="grid grid-cols-[120px_1fr] items-center border-b border-[#eeeeee] px-6 py-5">
                <div className="flex items-center gap-2 text-[14px] text-[#8b95a5]">
                  <Send size={16} />
                  From
                </div>

                <div className="text-[15px]">
                  {email.sender_email || "—"}
                </div>
              </div>

              {/* Scheduled */}
              <div className="grid grid-cols-[120px_1fr] items-center border-b border-[#eeeeee] px-6 py-5">
                <div className="flex items-center gap-2 text-[14px] text-[#8b95a5]">
                  <Clock3 size={16} />
                  Scheduled
                </div>

                <div className="text-[15px]">
                  {formatDate(email.scheduled_at)}
                </div>
              </div>

              {/* Sent */}
              {email.sent_at && (
                <div className="grid grid-cols-[120px_1fr] items-center px-6 py-5">
                  <div className="flex items-center gap-2 text-[14px] text-[#8b95a5]">
                    <Send size={16} />
                    Sent
                  </div>

                  <div className="text-[15px]">
                    {formatDate(email.sent_at)}
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="mt-8 rounded-xl bg-[#fafafa] px-7 py-7">
              <div className="whitespace-pre-wrap text-[15px] leading-7 text-[#30343b]">
                {email.body || ""}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}