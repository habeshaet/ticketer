"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "tm_admin_password";

export function getStoredAdminPassword(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(STORAGE_KEY) || "";
}

export function setStoredAdminPassword(password: string) {
  if (typeof window === "undefined") return;
  if (password) {
    sessionStorage.setItem(STORAGE_KEY, password);
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getAdminHeaders(): HeadersInit {
  const pass = getStoredAdminPassword();
  return pass ? { "x-admin-password": pass } : {};
}

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const existing = getStoredAdminPassword();
    if (existing) {
      fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: existing }),
      })
        .then((res) => {
          if (res.ok) setIsAdmin(true);
          else {
            setStoredAdminPassword("");
            setIsAdmin(false);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function requestAdminAccess(): Promise<boolean> {
    const current = getStoredAdminPassword();
    if (current && isAdmin) return true;

    const entered = window.prompt(
      "Admin password required to make changes to Directory and Flights:",
    );
    if (!entered) return false;

    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: entered }),
      });
      if (res.ok) {
        setStoredAdminPassword(entered);
        setIsAdmin(true);
        return true;
      } else {
        alert("Incorrect admin password.");
        return false;
      }
    } catch {
      alert("Could not verify password.");
      return false;
    }
  }

  function lockAdmin() {
    setStoredAdminPassword("");
    setIsAdmin(false);
  }

  return { isAdmin, requestAdminAccess, lockAdmin };
}
