"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { API_URL } from "@/lib/api";
import {
  Clock3,
  Send,
  Search,
  RefreshCw,
  Star,
  Plus,
  ChevronDown,
  Loader2,
  MessageSquare,
  LogOut,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string;
};

type Email = {
  id: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  body: string;
  status: string;
  scheduled_at: string;
  sent_at?: string | null;
  campaign_name?: string;
};

type SlackStatus = {
  connected: boolean;
  teamName?: string | null;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);

  const [activeTab, setActiveTab] = useState<
    "scheduled" | "sent"
  >("scheduled");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [showUserMenu, setShowUserMenu] = useState(false);

  const [slack, setSlack] = useState<SlackStatus>({
    connected: false,
  });

  const [slackLoading, setSlackLoading] = useState(true);

  async function loadDashboard() {
    try {
      setError("");

      const userResponse = await fetch(
        `${API_URL}/api/auth/me`,
        {
          credentials: "include",
        }
      );

      if (!userResponse.ok) {
        window.location.href = "/";
        return;
      }

      const userData = await userResponse.json();

      setUser(userData.user);

      const emailResponse = await fetch(
        `${API_URL}/api/emails?status=${activeTab}`,
        {
          credentials: "include",
        }
      );

      if (!emailResponse.ok) {
        throw new Error("Failed to fetch emails");
      }

      const emailData = await emailResponse.json();

      setEmails(emailData.emails || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load emails.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadSlackStatus() {
    try {
      const response = await fetch(
        `${API_URL}/api/slack/status`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      setSlack({
        connected: Boolean(data.connected),
        teamName: data.teamName || null,
      });
    } catch (err) {
      console.error(
        "Failed to load Slack status:",
        err
      );
    } finally {
      setSlackLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    loadSlackStatus();
  }, [activeTab]);

  function refresh() {
    setRefreshing(true);
    loadDashboard();
    loadSlackStatus();
  }

  const filteredEmails = emails.filter((email) => {
    const text = `
      ${email.recipient_email}
      ${email.recipient_name || ""}
      ${email.subject}
      ${email.body}
    `.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function openEmail(emailId: string) {
    router.push(`/email/${emailId}`);
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#202124]">
      <div className="flex min-h-screen">

        {/* ================= SIDEBAR ================= */}
        <aside className="w-[260px] border-r border-[#eeeeee] px-4 py-6">

          {/* Logo */}
          <div className="px-3">
            <h1 className="text-[28px] font-black tracking-[-2px]">
              ONB
            </h1>
          </div>

          {/* ================= USER ================= */}
          <div className="relative mt-5">
            <button
              type="button"
              onClick={() =>
                setShowUserMenu(
                  (current) => !current
                )
              }
              className="w-full rounded-lg bg-[#f7f9f8] px-3 py-3 text-left hover:bg-[#f1f4f2]"
            >
              <div className="flex items-center justify-between">

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dce9df] text-sm font-semibold">
                    {user?.name
                      ?.charAt(0)
                      ?.toUpperCase() || "U"}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user?.name || "User"}
                    </p>

                    <p className="truncate text-[11px] text-gray-500">
                      {user?.email || ""}
                    </p>
                  </div>

                </div>

                <ChevronDown
                  size={15}
                  className={`text-gray-400 transition ${
                    showUserMenu
                      ? "rotate-180"
                      : ""
                  }`}
                />

              </div>
            </button>

            {/* ================= USER MENU ================= */}
            {showUserMenu && (
              <div className="absolute left-0 right-0 top-[58px] z-50 rounded-xl border border-[#eeeeee] bg-white p-3 shadow-xl">

                {/* Slack */}
                <div className="rounded-lg bg-[#f8faf9] p-3">

                  <div className="flex items-center justify-between">

                    <div className="flex items-center gap-2">
                      <MessageSquare
                        size={16}
                        className="text-[#611f69]"
                      />

                      <span className="text-sm font-medium">
                        Slack
                      </span>
                    </div>

                    {slack.connected && (
                      <span className="text-xs font-medium text-[#269b3b]">
                        Connected
                      </span>
                    )}

                  </div>

                  {slackLoading ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <Loader2
                        size={13}
                        className="animate-spin"
                      />
                      Checking connection...
                    </div>
                  ) : slack.connected ? (
                    <p className="mt-2 text-xs text-gray-500">
                      {slack.teamName
                        ? `Connected to ${slack.teamName}`
                        : "Slack workspace connected"}
                    </p>
                  ) : (
                    <>
                      <p className="mt-2 text-xs text-gray-500">
                        Connect Slack for hourly limit alerts.
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          window.location.href =
                            `${API_URL}/api/slack/oauth`;
                        }}
                        className="mt-3 w-full rounded-full border border-[#611f69] px-3 py-2 text-xs font-medium text-[#611f69] hover:bg-[#f8f0fa]"
                      >
                        Connect Slack
                      </button>
                    </>
                  )}

                </div>

                {/* Logout */}
                <button
                  type="button"
                  onClick={logout}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>

              </div>
            )}
          </div>

          {/* ================= COMPOSE ================= */}
          <button
            onClick={() => router.push("/compose")}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#35b94a] text-sm font-medium text-[#269b3b] hover:bg-[#f1fbf3]"
          >
            <Plus size={16} />
            Compose
          </button>

          {/* ================= CORE ================= */}
          <div className="mt-8">

            <p className="px-3 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Core
            </p>

            {/* Scheduled */}
            <button
              type="button"
              onClick={() =>
                setActiveTab("scheduled")
              }
              className={`mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                activeTab === "scheduled"
                  ? "bg-[#e6f6ea] font-medium"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <Clock3 size={16} />
                Scheduled
              </span>

              {activeTab === "scheduled" && (
                <span className="text-xs text-gray-500">
                  {emails.length}
                </span>
              )}
            </button>

            {/* Sent */}
            <button
              type="button"
              onClick={() =>
                setActiveTab("sent")
              }
              className={`mt-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm ${
                activeTab === "sent"
                  ? "bg-[#e6f6ea] font-medium"
                  : "hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <Send size={16} />
                Sent
              </span>

              {activeTab === "sent" && (
                <span className="text-xs text-gray-500">
                  {emails.length}
                </span>
              )}
            </button>

          </div>

          {/* ================= SYSTEM ================= */}
          <div className="mt-8">

            <p className="px-3 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              System
            </p>

            <button
              type="button"
              onClick={() => {
                window.open(
                  `${API_URL}/admin/queues`,
                  "_blank"
                );
              }}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Queue Monitor
            </button>

          </div>

        </aside>

        {/* ================= MAIN ================= */}
        <section className="flex-1">

          {/* Top bar */}
          <div className="flex items-center gap-4 border-b border-[#eeeeee] px-8 py-5">

            <div className="relative max-w-[650px] flex-1">

              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search"
                className="h-10 w-full rounded-full bg-[#f5f7f6] pl-11 pr-4 text-sm outline-none"
              />

            </div>

            <button
              type="button"
              onClick={refresh}
              className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>

          </div>

          {/* ================= EMAIL LIST ================= */}
          <div className="px-8">

            {loading ? (
              <div className="flex h-[400px] items-center justify-center">
                <Loader2
                  size={24}
                  className="animate-spin text-gray-400"
                />
              </div>
            ) : error ? (
              <div className="flex h-[400px] items-center justify-center text-sm text-red-500">
                {error}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex h-[400px] flex-col items-center justify-center">

                <div className="mb-3 rounded-full bg-[#f5f7f6] p-4">
                  {activeTab === "scheduled" ? (
                    <Clock3
                      size={22}
                      className="text-gray-400"
                    />
                  ) : (
                    <Send
                      size={22}
                      className="text-gray-400"
                    />
                  )}
                </div>

                <p className="text-sm font-medium">
                  No {activeTab} emails
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {search
                    ? "Try a different search"
                    : "Your emails will appear here"}
                </p>

              </div>
            ) : (
              <div>

                {filteredEmails.map((email) => (
                  <button
                    key={email.id}
                    type="button"
                    onClick={() =>
                      openEmail(email.id)
                    }
                    className="group flex w-full cursor-pointer items-center gap-5 border-b border-[#eeeeee] px-3 py-4 text-left transition hover:bg-[#fafafa]"
                  >

                    {/* Recipient */}
                    <div className="w-[180px] shrink-0">
                      <p className="truncate text-sm font-medium">
                        To:{" "}
                        {email.recipient_name ||
                          email.recipient_email}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="shrink-0 rounded-full bg-[#fff1dc] px-3 py-1 text-[11px] text-[#d98200]">
                      {activeTab === "scheduled"
                        ? formatDate(
                            email.scheduled_at
                          )
                        : email.sent_at
                          ? formatDate(
                              email.sent_at
                            )
                          : "Sent"}
                    </div>

                    {/* Subject + Body */}
                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm">
                        {email.subject ||
                          "(No subject)"}
                      </p>

                      <p className="truncate text-xs text-gray-400">
                        {email.body}
                      </p>

                    </div>

                    {/* Star */}
                    <Star
                      size={16}
                      className="shrink-0 text-gray-300 group-hover:text-gray-400"
                    />

                  </button>
                ))}

              </div>
            )}

          </div>

        </section>
      </div>
    </main>
  );
}