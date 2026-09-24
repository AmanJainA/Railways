import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../supabase";

const ONLINE_WINDOW_SECONDS = 35;

const OnlineUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOnlineUsers = useCallback(async () => {
    const cutoff = new Date(Date.now() - ONLINE_WINDOW_SECONDS * 1000).toISOString();

    const { data, error } = await supabase
      .from("user_presence")
      .select("session_id,user_id,username,email,role,last_seen,login_time")
      .eq("online", true)
      .gte("last_seen", cutoff)
      .order("last_seen", { ascending: false });

    if (error) {
      console.error("Online users error:", error);
      setUsers([]);
      setLoading(false);
      return;
    }

    const uniqueUsers = [];
    const seen = new Set();

    for (const row of data || []) {
      if (seen.has(row.user_id)) continue;
      seen.add(row.user_id);
      uniqueUsers.push(row);
    }

    setUsers(uniqueUsers);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOnlineUsers();

    const timer = window.setInterval(loadOnlineUsers, 5000);

    const channel = supabase
      .channel("admin-online-users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        () => loadOnlineUsers()
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Online users realtime error:", error);
        }
      });

    return () => {
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [loadOnlineUsers]);

  const formatLastSeen = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="card card-flush shadow-sm mb-8">
      <div className="card-header pt-7">
        <div className="card-title align-items-start flex-column">
          <span className="card-label fw-bold text-gray-800">
            Currently Online
          </span>
          <span className="text-gray-500 mt-1 fw-semibold fs-7">
            {users.length} user{users.length === 1 ? "" : "s"} online • updates automatically
          </span>
        </div>
        <div className="card-toolbar">
          <span className="badge badge-light-success">
            <span className="bullet bullet-dot bg-success me-2"></span>
            Live
          </span>
        </div>
      </div>

      <div className="card-body pt-3">
        {loading ? (
          <div className="text-muted py-5">
            <span className="spinner-border spinner-border-sm text-primary me-2"></span>
            Checking online users...
          </div>
        ) : users.length === 0 ? (
          <div className="text-muted py-5">No users are currently online.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-row-dashed align-middle mb-0">
              <thead>
                <tr className="text-muted fw-bold fs-8 text-uppercase">
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Last Activity</th>
                  <th className="text-end">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <span className="symbol symbol-35px me-3">
                          <span className="symbol-label bg-light-primary text-primary fw-bold">
                            {(user.username || "?").charAt(0).toUpperCase()}
                          </span>
                        </span>
                        <span className="fw-bold text-gray-800">{user.username || "-"}</span>
                      </div>
                    </td>
                    <td>{user.email || "-"}</td>
                    <td>
                      <span className="badge badge-light-primary">{user.role || "User"}</span>
                    </td>
                    <td>{formatLastSeen(user.last_seen)}</td>
                    <td className="text-end">
                      <span className="badge badge-light-success">Online</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnlineUsers;
