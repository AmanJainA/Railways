import React, { useState, useEffect, useCallback } from "react";
import Footer from "../Footer/Footer";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";

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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  // Theme setup (same as login)
  useEffect(() => {
    let defaultThemeMode = "light";
    let themeMode;

    if (document.documentElement.hasAttribute("data-bs-theme-mode")) {
      themeMode = document.documentElement.getAttribute("data-bs-theme-mode");
    } else if (sessionStorage.getItem("data-bs-theme")) {
      themeMode = sessionStorage.getItem("data-bs-theme");
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

  const loadFiles = async () => {
    setLoading(true);

    try {
      const { data: uploads, error } = await supabase
        .from("file_uploads")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      const ids = uploads
        .map((u) => u.datacollection_id)
        .filter((id) => id !== null && id !== undefined);

      const { data: collections, error: err2 } = await supabase
        .from("datacollection")
        .select("*")
        .in("id", ids);

      if (err2) throw err2;

      const usernames = uploads
  .map(x => x.uploaded_by)
  .filter(Boolean);


const { data: users, error:userError } = await supabase
.from("users")
.select("username,email")
.in("username", usernames);


if(userError) throw userError;


const merged = uploads.map((upload)=>{

 const collection = collections.find(
    c=>c.id===upload.datacollection_id
 );


 const user = users.find(
    u=>u.username===upload.uploaded_by
 );


 return {
    ...upload,
    ...(collection || {}),
    email:user?.email || ""
 };

});

      let result = merged;

      if (filter !== "all") {
        result = merged.filter((x) => Number(x.status) === Number(filter));
      }

      setFiles(result);
    } catch (err) {
      showAlert("danger", "Error", err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    const role = (sessionStorage.getItem("role") || "").toLowerCase();

    if (!user) {
      navigate("/");
      return;
    }

    if (role !== "admin") {
      navigate("/dashboard");
      return;
    }

    loadFiles();

    // eslint-disable-next-line
  }, [filter]);

  const handleAction = async (file, action) => {
    let remark = "";

    if (action === "reject") {
      remark = prompt("Reason for rejection") || "";
    }

    if (!window.confirm(`Are you sure you want to ${action} this file?`)) {
      return;
    }

    setActingId(file.id);

    try {
      const status = action === "approve" ? 1 : 2;
      // Update Supabase
      const { error } = await supabase
        .from("datacollection")
        .update({
          status,
          remark,
        })
        .eq("id", file.datacollection_id);

      if (error) throw error;

      // Send mail only
      try {
        const response = await fetch("https://samrat.cu.ma/send_approval_mail.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          
          body: JSON.stringify({
            email: file.email,
            uploaded_by: file.uploaded_by,
            filename: file.name,
            menuname: file.menuname,
            status,
            remark,
          }),
        });

        const result = await response.json();
      } catch (e) {
        console.log("Mail Error", e);
      }

      showAlert("success", "Success", `File ${action}d successfully`);

      loadFiles();
    } catch (err) {
      showAlert("danger", "Error", err.message);
    }

    setActingId(null);
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
              className={`btn btn-sm ${filter === f.value ? "btn-primary" : "btn-light-primary"
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
            <div className="p-10 text-center text-muted">
              <div className="spinner-border text-primary"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="p-10 text-center text-muted">
              No files found for this filter
            </div>
          ) : (
            <div className="table-responsive">
              <div className="row mb-5">
                <div className="col-md-3">
                  <div className="card bg-light-primary">
                    <div className="card-body">
                      <div>Total Files</div>
                      <div className="fs-2 fw-bold">{files.length}</div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card bg-light-warning">
                    <div className="card-body">
                      <div>Pending</div>
                      <div className="fs-2 fw-bold">
                        {files.filter((f) => Number(f.status) === 0).length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card bg-light-success">
                    <div className="card-body">
                      <div>Approved</div>
                      <div className="fs-2 fw-bold">
                        {files.filter((f) => Number(f.status) === 1).length}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card bg-light-danger">
                    <div className="card-body">
                      <div>Rejected</div>
                      <div className="fs-2 fw-bold">
                        {files.filter((f) => Number(f.status) === 2).length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                  {files
                    .filter((f) =>
                      (
                        (f.name || "") +
                        (f.menuname || "") +
                        (f.folder || "") +
                        (f.uploaded_by || "")
                      )
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((f) => (
                      <tr key={f.id}>
                        <td className="ps-4">{f.name}</td>
                        <td>{f.uploaded_by || "-"}</td>
                        <td>{f.menuname}</td>
                        <td>{f.folder || "-"}</td>
                        <td>{f.type}</td>
                        <td>
                          <a
                            href={
                              supabase.storage
                                .from("documents")
                                .getPublicUrl(f.links).data.publicUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-primary"
                          >
                            View
                          </a>
                        </td>
                        <td>
                          <span
                            className={`badge badge-light-${STATUS_BADGE[f.status]
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
                                onClick={() =>
                                  handleAction(f, "approve")
                                }
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                disabled={actingId === f.id}
                                onClick={() =>
                                  handleAction(f, "reject")
                                }
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
