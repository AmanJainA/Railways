import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";

const ManageMenu = () => {
  const navigate = useNavigate();
  const role = (sessionStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";
  const createdBy = sessionStorage.getItem("user") || "Unknown";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const [menuName, setMenuName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    const user = sessionStorage.getItem("user");

    if (!user) {
      navigate("/");
      return;
    }

    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("menu_master")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.log(error);
      setRows([]);
    } else {
      setRows(data);
    }

    setLoading(false);
  };
  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!menuName.trim()) return;

    setSaving(true);

    const { error } = await supabase.from("menu_master").insert([
      {
        menuname: menuName.trim(),
        status: 1,
        created_by: createdBy,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      showAlert("danger", "Error", error.message);
    } else {
      showAlert("success", "Success", "Menu added successfully.");
      setMenuName("");
      fetchMenus();
    }

    setSaving(false);
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setEditValue(row.menuname);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditValue("");
  };

  const saveEdit = async (id) => {
    if (!editValue.trim()) return;

    setSaving(true);

    const { error } = await supabase
      .from("menu_master")
      .update({
        menuname: editValue.trim(),
      })
      .eq("id", id);

    if (error) {
      showAlert("danger", "Error", error.message);
    } else {
      showAlert("success", "Success", "Menu updated.");
      cancelEdit();
      fetchMenus();
    }

    setSaving(false);
  };

  const confirmDelete = async (id) => {
    setSaving(true);

    const { error } = await supabase.from("menu_master").delete().eq("id", id);

    if (error) {
      showAlert("danger", "Error", error.message);
    } else {
      showAlert("success", "Success", "Menu deleted.");
      fetchMenus();
    }

    setSaving(false);
    setDeleteId(null);
  };

  return (
    <div
      id="kt_body"
      className="header-fixed header-tablet-and-mobile-fixed aside-fixed"
    >
      <div
        className="content d-flex flex-column flex-column-fluid fs-6"
        id="kt_content"
      >
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
                <i className="ki-duotone ki-plus-square fs-2 me-2 text-primary">
                  <span className="path1"></span>
                  <span className="path2"></span>
                </i>
                Add New Menu
              </h3>
            </div>
            <div className="card-body">
              <form className="d-flex gap-3" onSubmit={handleAdd}>
                <input
                  type="text"
                  className="form-control form-control-solid"
                  placeholder="e.g. Nangia"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary px-6"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Menu"}
                </button>
              </form>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title fw-bold mb-0">All Menus</h3>
              <span className="badge badge-light-primary fs-7">
                {rows.length} Total
              </span>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                  <thead>
                    <tr className="text-muted fw-bold fs-8 text-uppercase gs-0 bg-light">
                      <th className="ps-5">#</th>
                      <th>Menu Name</th>
                      <th>Created By</th>
                      <th>Date Time</th>
                      <th className="pe-5 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-10 text-muted"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-10 text-muted"
                        >
                          No menus yet
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={r.id}>
                          <td className="ps-5 text-muted">{i + 1}</td>
                          <td>
                            {editId === r.id ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <span className="fw-semibold text-gray-800">
                                {r.menuname}
                              </span>
                            )}
                          </td>
                          <td>{r.created_by || "-"}</td>
                          <td>
                            {r.created_at
                              ? new Date(r.created_at).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
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
                                <button
                                  className="btn btn-sm btn-light"
                                  onClick={cancelEdit}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : deleteId === r.id ? (
                              <>
                                <span className="me-2 text-danger fs-8">
                                  Delete this menu?
                                </span>
                                <button
                                  className="btn btn-sm btn-danger me-1"
                                  disabled={saving}
                                  onClick={() => confirmDelete(r.id)}
                                >
                                  Yes
                                </button>
                                <button
                                  className="btn btn-sm btn-light"
                                  onClick={() => setDeleteId(null)}
                                >
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

export default ManageMenu;
