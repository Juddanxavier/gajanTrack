"use client";

export function getSessionId() {
  if (typeof window === "undefined") return "server-side";
  
  let sessionId = sessionStorage.getItem("convex_session_id");
  if (!sessionId) {
    sessionId = typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem("convex_session_id", sessionId);
  }
  return sessionId;
}
