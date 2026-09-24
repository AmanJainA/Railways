import React, { useState } from "react";
import OnlineUsers from "./OnlineUsers";
import LoginHistory from "./LoginHistory";
import PageActivity from "./PageActivity";

const ManageTracking = () => {
  const [activeTab, setActiveTab] = useState("online");

  const tabs = [
    { id: "online", label: "Currently Online", icon: "bi-person-check" },
    { id: "login", label: "Login History", icon: "bi-clock-history" },
    { id: "activity", label: "Page Activity", icon: "bi-activity" },
  ];

  return (
    <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content">
      <div className="container-xxl mt-5">
        <div className="card card-flush shadow-sm">
          <div className="card-header border-0 pt-6">
            <div className="card-title">
              <div>
                <h3 className="fw-bold mb-1">Manage Tracking</h3>
                <div className="text-muted fs-7">Monitor active users, login history and page activity.</div>
              </div>
            </div>
          </div>

          <div className="card-body pt-0">
            <ul className="nav nav-tabs nav-line-tabs nav-line-tabs-2x mb-7">
              {tabs.map((tab) => (
                <li className="nav-item" key={tab.id}>
                  <button
                    type="button"
                    className={`nav-link fw-semibold ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <i className={`bi ${tab.icon} me-2`}></i>
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>

            {activeTab === "online" && <OnlineUsers />}
            {activeTab === "login" && <LoginHistory />}
            {activeTab === "activity" && <PageActivity />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTracking;
