import React, { useState, useEffect, useCallback } from "react";

const STATUS_LABEL = { 0: "Pending", 1: "Approved", 2: "Rejected" };
const STATUS_BADGE = { 0: "warning", 1: "success", 2: "danger" };

const FILTERS = [
  { label: "Pending", value: "0" },
  { label: "Approved", value: "1" },
  { label: "Rejected", value: "2" },
  { label: "All", value: "all" },
];

const ManageUploads = () => {
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState("0");
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [alert, setAlert] = useState(null);

  // Theme setup (same as login)
  useEffect(() => {
    let defaultThemeMode = "light";
    let themeMode;

    if (document.documentElement.hasAttribute("data-bs-theme-mode")) {
      themeMode = document.documentElement.getAttribute("data-bs-theme-mode");
    } else if (localStorage.getItem("data-bs-theme")) {
      themeMode = localStorage.getItem("data-bs-theme");
    } else {
      themeMode = defaultThemeMode;
    }

    if (themeMode === "system") {
      themeMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    document.documentElement.setAttribute("data-bs-theme", themeMode);
  }, []);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://samrat.cu.ma/get_files.php?status=${filter}`
      );
      const res = await response.json();

      if (res.status === 1) {
        setFiles(res.data || []);
      } else {
        setFiles([]);
        showAlert("danger", "Error", res.msg || "Failed to load files");
      }
    } catch (error) {
      console.error(error);
      showAlert("danger", "Error", "Something went wrong while loading files");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleAction = async (id, action) => {
    let remark = "";

    if (action === "reject") {
      remark = window.prompt("Reason for rejection (optional):") || "";
    }

    if (
      !window.confirm(
        `Are you sure you want to ${action} this file? User will be notified by email.`
      )
    ) {
      return;
    }

    setActingId(id);
    try {
      const response = await fetch("https://samrat.cu.ma/approve_reject.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, remark }),
      });

      const res = await response.json();

      if (res.status === 1) {
        showAlert("primary", "Done", res.msg);
        loadFiles();
      } else {
        showAlert("danger", "Error", res.msg);
      }
    } catch (error) {
      console.error(error);
      showAlert("danger", "Error", "Something went wrong. Try again.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="d-flex flex-column flex-root min-vh-100 p-8">
      <div className="mb-8 d-flex flex-wrap justify-content-between align-items-center">
        <h1 className="text-gray-900 mb-0">Manage Uploaded Files</h1>

        <div className="d-flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`btn btn-sm ${
                filter === f.value ? "btn-primary" : "btn-light-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type} mb-5`}>
          <h4 className="mb-1">{alert.title}</h4>
          <span>{alert.message}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-10 text-center text-muted">Loading...</div>
          ) : files.length === 0 ? (
            <div className="p-10 text-center text-muted">
              No files found for this filter
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4 mb-0">
                <thead>
                  <tr className="fw-bold text-muted bg-light">
                    <th className="ps-4">Name</th>
                    <th>Uploaded By</th>
                    <th>Menu</th>
                    <th>Folder</th>
                    <th>Type</th>
                    <th>File</th>
                    <th>Status</th>
                    <th>Remark</th>
                    <th className="text-end pe-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id}>
                      <td className="ps-4">{f.name}</td>
                      <td>{f.uploaded_by || "-"}</td>
                      <td>{f.menuname}</td>
                      <td>{f.folder || "-"}</td>
                      <td>{f.type}</td>
                      <td>
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link-primary"
                        >
                          View
                        </a>
                      </td>
                      <td>
                        <span
                          className={`badge badge-light-${
                            STATUS_BADGE[f.status]
                          }`}
                        >
                          {STATUS_LABEL[f.status]}
                        </span>
                      </td>
                      <td>{f.remark || "-"}</td>
                      <td className="text-end pe-4">
                        {Number(f.status) === 0 ? (
                          <>
                            <button
                              className="btn btn-sm btn-success me-2"
                              disabled={actingId === f.id}
                              onClick={() => handleAction(f.id, "approve")}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              disabled={actingId === f.id}
                              onClick={() => handleAction(f.id, "reject")}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-muted fs-7">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageUploads;