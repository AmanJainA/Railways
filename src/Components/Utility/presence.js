import { supabase } from "../../supabase";

const HEARTBEAT_MS = 15000;

const getSessionId = () => sessionStorage.getItem("presence_session_id");

const getPresencePayload = () => ({
  session_id: getSessionId(),
  user_id: Number(sessionStorage.getItem("user_id")),
  username: sessionStorage.getItem("user") || "",
  email: sessionStorage.getItem("email") || "",
  role: sessionStorage.getItem("role") || "",
  online: true,
  last_seen: new Date().toISOString(),
});

export const startPresence = async () => {
  const userId = sessionStorage.getItem("user_id");
  const username = sessionStorage.getItem("user");
  if (!userId || !username) return () => {};

  let sessionId = getSessionId();
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("presence_session_id", sessionId);
  }

  let stopped = false;

  const touch = async () => {
    if (stopped) return;
    const payload = {
      ...getPresencePayload(),
      session_id: sessionId,
    };

    const { error } = await supabase
      .from("user_presence")
      .upsert(payload, { onConflict: "session_id" });

    if (error) console.error("Presence heartbeat error:", error);
  };

  const markOffline = async () => {
    if (stopped) return;
    stopped = true;
    try {
      await supabase
        .from("user_presence")
        .update({ online: false, last_seen: new Date().toISOString() })
        .eq("session_id", sessionId);
    } catch (error) {
      console.error("Presence offline error:", error);
    }
  };

  await touch();

  const timer = window.setInterval(touch, HEARTBEAT_MS);

  const handleVisibility = () => {
    if (document.visibilityState === "visible") touch();
  };

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", markOffline);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pagehide", markOffline);
    markOffline();
  };
};

export const markCurrentUserOffline = async () => {
  const sessionId = getSessionId();
  if (!sessionId) return;

  const { error } = await supabase
    .from("user_presence")
    .update({ online: false, last_seen: new Date().toISOString() })
    .eq("session_id", sessionId);

  if (error) console.error("Presence logout error:", error);
};
