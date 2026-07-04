import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://samrat.cu.ma";

const ManageFolder = () => {
  const navigate = useNavigate();
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";

  const [menus, setMenus] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [form, setForm] = useState({ menuname: "", foldername: "" });
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState({ menuname: "", foldername: "" });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    
    fetchMenus();
    fetchFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMenus = () => {
    fetch(`${API_BASE}/menu_master.php?action=list`)
      .then((res) => res.json())
      .then((data) => setMenus(data.status === 1 ? data.data : []))
      .catch(() => setMenus([]));
  };

  const fetchFolders = () => {
    setLoading(true);
    fetch(`${API_BASE}/folder_master.php?action=list`)
      .then((res) => res.json())
      .then((data) => setRows(data.status === 1 ? data.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.menuname || !form.foldername.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/folder_master.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", menuname: form.menuname, foldername: form.foldername.trim() }),
      });
      const data = await res.json();
      if (data.status === 1) {
        showAlert("primary", "Success", data.msg);
        setForm({ ...form, foldername: "" });
        fetchFolders();
      } else {
        showAlert("danger", "Error", data.msg);
      }
    } catch (err) {
      showAlert("danger", "Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setEditValue({ menuname: row.menuname, foldername: row.foldername });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditValue({ menuname: "", foldername: "" });
  };

  const saveEdit = async (id) => {
    if (!editValue.menuname || !editValue.foldername.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/folder_master.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          id,
          menuname: editValue.menuname,
          foldername: editValue.foldername.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === 1) {
        showAlert("primary", "Success", data.msg);
        cancelEdit();
        fetchFolders();
      } else {
        showAlert("danger", "Error", data.msg);
      }
    } catch (err) {
      showAlert("danger", "Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/folder_master.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.status === 1) {
        showAlert("primary", "Success", data.msg);
        fetchFolders();
      } else {
        showAlert("danger", "Error", data.msg);
      }
    } catch (err) {
      showAlert("danger", "Error", err.message);
    } finally {
      setSaving(false);
      setDeleteId(null);
    }
  };

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

          <div className="card shadow-sm mb-5">
            <div className="card-header">
              <h3 className="card-title fw-bold">
                <i className="ki-duotone ki-folder-added fs-2 me-2 text-primary">
                  <span className="path1"></span>
                  <span className="path2"></span>
                </i>
                Add New Folder
              </h3>
            </div>
            <div className="card-body">
              <form className="row g-3 align-items-end" onSubmit={handleAdd}>
                <div className="col-md-4">
                  <label className="form-label fw-bold">Menu</label>
                  <select
                    className="form-select form-select-solid"
                    value={form.menuname}
                    onChange={(e) => setForm({ ...form, menuname: e.target.value })}
                    required
                  >
                    <option value="">Select Menu</option>
                    {menus.map((m) => (
                      <option key={m.id} value={m.menuname}>{m.menuname}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-5">
                  <label className="form-label fw-bold">Folder Name</label>
                  <input
                    type="text"
                    className="form-control form-control-solid"
                    placeholder="e.g. Nangia on boarding info"
                    value={form.foldername}
                    onChange={(e) => setForm({ ...form, foldername: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <button type="submit" className="btn btn-primary w-100" disabled={saving}>
                    {saving ? "Saving..." : "Add Folder"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title fw-bold mb-0">All Folders</h3>
              <span className="badge badge-light-primary fs-7">{rows.length} Total</span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                  <thead>
                    <tr className="text-muted fw-bold fs-8 text-uppercase gs-0 bg-light">
                      <th className="ps-5">#</th>
                      <th>Menu</th>
                      <th>Folder Name</th>
                      <th>Created</th>
                      <th className="pe-5 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="text-center py-10 text-muted">Loading...</td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-10 text-muted">No folders yet</td></tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={r.id}>
                          <td className="ps-5 text-muted">{i + 1}</td>
                          <td>
                            {editId === r.id ? (
                              <select
                                className="form-select form-select-sm"
                                value={editValue.menuname}
                                onChange={(e) => setEditValue({ ...editValue, menuname: e.target.value })}
                              >
                                {menus.map((m) => (
                                  <option key={m.id} value={m.menuname}>{m.menuname}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="badge bg-light-primary">{r.menuname}</span>
                            )}
                          </td>
                          <td>
                            {editId === r.id ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={editValue.foldername}
                                onChange={(e) => setEditValue({ ...editValue, foldername: e.target.value })}
                                autoFocus
                              />
                            ) : (
                              <span className="fw-semibold text-gray-800">{r.foldername}</span>
                            )}
                          </td>
                          <td>{r.created_at || "-"}</td>
                          <td className="pe-5 text-end">
                            {editId === r.id ? (
                              <>
                                <button
                                  className="btn btn-sm btn-light-success me-1"
                                  disabled={saving}
                                  onClick={() => saveEdit(r.id)}
                                >
                                  Save
                                </button>
                                <button className="btn btn-sm btn-light" onClick={cancelEdit}>
                                  Cancel
                                </button>
                              </>
                            ) : deleteId === r.id ? (
                              <>
                                <span className="me-2 text-danger fs-8">Delete this folder?</span>
                                <button
                                  className="btn btn-sm btn-danger me-1"
                                  disabled={saving}
                                  onClick={() => confirmDelete(r.id)}
                                >
                                  Yes
                                </button>
                                <button className="btn btn-sm btn-light" onClick={() => setDeleteId(null)}>
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn btn-sm btn-icon btn-light-primary me-1"
                                  title="Edit"
                                  onClick={() => startEdit(r)}
                                >
                                  <i className="ki-duotone ki-pencil fs-4">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                  </i>
                                </button>
                                <button
                                  className="btn btn-sm btn-icon btn-light-danger"
                                  title="Delete"
                                  onClick={() => setDeleteId(r.id)}
                                >
                                  <i className="ki-duotone ki-trash fs-4">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                    <span className="path3"></span>
                                    <span className="path4"></span>
                                    <span className="path5"></span>
                                  </i>
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
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

export default ManageFolder;