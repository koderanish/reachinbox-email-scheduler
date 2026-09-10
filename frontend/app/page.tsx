"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              width?: number;
              text?: string;
              shape?: string;
            }
          ) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async (credential: string) => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            credential,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Google login failed");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Google login error:", error);
      setError("Google login failed. Please try again.");
      setLoading(false);
    }
  };

  const initializeGoogle = () => {
    if (
      !window.google ||
      !googleButtonRef.current ||
      !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    ) {
      return;
    }

    googleButtonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: (response) => {
        handleGoogleLogin(response.credential);
      },
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: 230,
      text: "signin_with",
      shape: "rectangular",
    });
  };

  useEffect(() => {
    if (window.google) {
      initializeGoogle();
    }
  }, []);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={initializeGoogle}
      />

      <main className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-[420px]">
          <div className="border border-[#e5e7eb] rounded-lg px-9 py-10">
            {/* Heading */}
            <h1 className="text-center text-[28px] font-semibold text-[#202124]">
              Login
            </h1>

            {/* Google Login */}
            <div className="mt-7 flex justify-center">
              <div ref={googleButtonRef} />
            </div>

            {loading && (
              <p className="mt-4 text-center text-sm text-gray-500">
                Signing you in...
              </p>
            )}

            {error && (
              <p className="mt-4 text-center text-sm text-red-500">
                {error}
              </p>
            )}

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#eeeeee]" />

              <span className="whitespace-nowrap text-xs text-[#a0a0a0]">
                or sign up through email
              </span>

              <div className="h-px flex-1 bg-[#eeeeee]" />
            </div>

            {/* Email */}
            <input
              type="email"
              placeholder="Email ID"
              disabled
              className="h-12 w-full rounded-md bg-[#f4f7f5] px-4 text-sm outline-none placeholder:text-[#9ca3af]"
            />

            {/* Password */}
            <input
              type="password"
              placeholder="Password"
              disabled
              className="mt-2 h-12 w-full rounded-md bg-[#f4f7f5] px-4 text-sm outline-none placeholder:text-[#9ca3af]"
            />

            {/* Login */}
            <button
              disabled
              className="mt-4 h-11 w-full rounded-md bg-[#2eae45] text-sm font-medium text-white"
            >
              Login
            </button>
          </div>
        </div>
      </main>
    </>
  );
}