import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://samrat.cu.ma";

const fileColorsMap = {
  pdf: "danger", doc: "primary", docx: "primary",
  xls: "success", xlsx: "success", ppt: "warning", pptx: "warning",
  png: "info", jpg: "info", jpeg: "info", gif: "info",
};

const PendingApprovals = () => {
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectRemark, setRejectRemark] = useState("");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/nr/dashboard");
      return;
    }
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPending = () => {
    setLoading(true);
    fetch(`${API_BASE}/pending_files.php`)
      .then((res) => res.json())
      .then((data) => setRows(data.status === 1 ? data.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const updateStatus = async (id, status, remark = "") => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/update_status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, remark }),
      });
      const data = await res.json();
      if (data.status === 1) {
        showAlert("primary", "Success", data.msg);
        setRows((prev) => prev.filter((r) => r.id !== id));
      } else {
        showAlert("danger", "Error", data.msg || "Action failed");
      }
    } catch (err) {
      showAlert("danger", "Error", err.message);
    } finally {
      setBusyId(null);
      setRejectId(null);
      setRejectRemark("");
    }
  };

  if (!isAdmin) return null;

  return (
    <div id="kt_body" className="header-fixed header-tablet-and-mobile-fixed aside-fixed">
      <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content">
        <div className="container-xxl mt-5">
          {alert && (
            <div className={`alert alert-${alert.type} mb-5`}>
              <h4 className="mb-1">{alert.title}</h4>
              <span>{alert.message}</span>
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title fw-bold mb-0">
                <i className="ki-duotone ki-check-square fs-2 me-2 text-primary">
                  <span className="path1"></span>
                  <span className="path2"></span>
                </i>
                Pending File Approvals
              </h3>
              <span className="badge badge-light-warning fs-7">{rows.length} Pending</span>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                  <thead>
                    <tr className="text-muted fw-bold fs-8 text-uppercase gs-0 bg-light">
                      <th className="ps-5">#</th>
                      <th>File</th>
                      <th>Uploaded By</th>
                      <th>Dept</th>
                      <th>Menu</th>
                      <th>Folder</th>
                      <th>Type</th>
                      <th>Uploaded At</th>
                      <th className="pe-5 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="9" className="text-center py-10 text-muted">Loading...</td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td colSpan="9" className="text-center py-10 text-muted">No pending files 🎉</td></tr>
                    ) : (
                      rows.map((r, i) => {
                        const ext = (r.type || "").toLowerCase();
                        const color = fileColorsMap[ext] || "secondary";
                        return (
                          <React.Fragment key={r.id}>
                            <tr>
                              <td className="ps-5 text-muted">{i + 1}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <span className={`badge badge-light-${color}`}>{ext.toUpperCase()}</span>
                                  <span className="fw-semibold text-gray-800">{r.name}</span>
                                </div>
                              </td>
                              <td>{r.uploaded_by || "-"}</td>
                              <td>{r.dept || "-"}</td>
                              <td><span className="badge bg-light-primary">{r.menuname}</span></td>
                              <td>{r.folder || "-"}</td>
                              <td>{(r.type || "").toUpperCase()}</td>
                              <td>{r.upload_time || "-"}</td>
                              <td className="pe-5 text-end">
                                <a
                                  href={`${API_BASE}/${r.links}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn btn-sm btn-icon btn-light-primary me-1"
                                  title="View"
                                >
                                  <i className="ki-duotone ki-eye fs-4">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                    <span className="path3"></span>
                                  </i>
                                </a>
                                <button
                                  className="btn btn-sm btn-light-success me-1"
                                  disabled={busyId === r.id}
                                  onClick={() => updateStatus(r.id, 1)}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-sm btn-light-danger"
                                  disabled={busyId === r.id}
                                  onClick={() => setRejectId(rejectId === r.id ? null : r.id)}
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>

                            {rejectId === r.id && (
                              <tr>
                                <td colSpan="9" className="bg-light-danger">
                                  <div className="d-flex align-items-center gap-2 p-3">
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="Reason for rejection (optional)"
                                      value={rejectRemark}
                                      onChange={(e) => setRejectRemark(e.target.value)}
                                    />
                                    <button
                                      className="btn btn-sm btn-danger"
                                      disabled={busyId === r.id}
                                      onClick={() => updateStatus(r.id, 2, rejectRemark)}
                                    >
                                      Confirm Reject
                                    </button>
                                    <button
                                      className="btn btn-sm btn-light"
                                      onClick={() => { setRejectId(null); setRejectRemark(""); }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovals;
