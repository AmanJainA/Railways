import React, { useState } from "react";
import OnlineUsers from "./OnlineUsers";
import LoginHistory from "./LoginHistory";
import PageActivity from "./PageActivity";
import "./ManageTracking.css";

const ManageTracking = () => {
  const [activeTab, setActiveTab] = useState("online");

  const tabs = [
    { id: "online", label: "Currently Online", icon: "bi-person-check" },
    { id: "login", label: "Login History", icon: "bi-clock-history" },
    { id: "activity", label: "Page Activity", icon: "bi-activity" },
  ];

  const renderDetails = () => {
    if (activeTab === "online") return <OnlineUsers />;
    if (activeTab === "login") return <LoginHistory />;
    return <PageActivity />;
  };

  return (
    <div className="content d-flex flex-column flex-column-fluid fs-6 manage-tracking-page" id="kt_content">
      <div className="container-xxl mt-5">
        <div className="card card-flush shadow-sm mb-5">
          <div className="card-header border-0 pt-6 pb-2">
            <div className="card-title">
              <div>
                <h3 className="fw-bold mb-1">Manage Tracking</h3>
                <div className="text-muted fs-7">
                  Monitor active users, login history and page activity.
                </div>
              </div>
            </div>
          </div>

          <div className="card-body pt-0 pb-0">
            <ul className="nav nav-tabs nav-line-tabs nav-line-tabs-2x manage-tracking-tabs">
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
          </div>
        </div>

        <div className="card card-flush shadow-sm">
          <div className="card-body p-0">
            {renderDetails()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTracking;
