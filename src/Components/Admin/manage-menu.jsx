import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";
import { getAccessibleHeadings } from "../Utility/dataAccess";
import { AdminTableToolbar, AdminTableFooter, useAdminTable } from "../Utility/AdminTableTools";

const ManageMenu = () => {
  const username = sessionStorage.getItem("user") || "Unknown";
  const isAdmin = (sessionStorage.getItem("role") || "").toLowerCase() === "admin";
  const canManage = Boolean(sessionStorage.getItem("user_id"));
  const [headings, setHeadings] = useState([]);
  const [rows, setRows] = useState([]);
  const [formHeadingId, setFormHeadingId] = useState("");
  const [formMenuName, setFormMenuName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editHeadingId, setEditHeadingId] = useState("");
  const [editMenuName, setEditMenuName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const headingName = (id) => headings.find((h) => Number(h.id) === Number(id))?.headingname || "-";

  const load = async () => {
    try {
      const hs = await getAccessibleHeadings();
      setHeadings(hs);
      if (!formHeadingId && hs.length) setFormHeadingId(String(hs[0].id));

      if (!hs.length) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("menu_master")
        .select("*")
        .in("main_heading_id", hs.map((h) => Number(h.id)))
        .order("main_heading_id", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (row) => {
    if (!isAdmin) return;
    const nextStatus = String(row.status) === "1" ? "0" : "1";
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_master").update({ status: nextStatus }).eq("id", row.id);
      if (error) throw error;
      showAlert("success", "Success", `${row.menuname} is now ${nextStatus === "1" ? "ON" : "OFF"}.`);
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const table = useAdminTable(rows, ["menuname", "created_by"]);

  const exportRows = useMemo(() => (items) =>
    items.map((r, i) => [i + 1, headingName(r.main_heading_id), r.menuname || "", r.created_by || ""]), [headings, rows]);

  const add = async (e) => {
    e.preventDefault();
    if (!formHeadingId || !formMenuName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_master").insert({
        main_heading_id: Number(formHeadingId),
        menuname: formMenuName.trim(),
        status: "1",
        created_by: username,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setFormMenuName("");
      showAlert("success", "Success", "Menu added successfully.");
      await load();
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
    setSaving(false);
  };

  const startEdit = async (row) => {
    setEditId(row.id);
    setEditHeadingId(String(row.main_heading_id));
    setEditMenuName(row.menuname || "");
  };

  const changeEditHeading = async (value) => {
    setEditHeadingId(value);
    setEditMenuName("");
  };

  const save = async (id) => {
    if (!editHeadingId || !editMenuName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_master")
        .update({ main_heading_id: Number(editHeadingId), menuname: editMenuName.trim() })
        .eq("id", id);
      if (error) throw error;
      setEditId(null);
      showAlert("success", "Success", "Menu updated.");
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const remove = async (id) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("menu_master").delete().eq("id", id);
      if (error) throw error;
      showAlert("success", "Success", "Menu deleted.");
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setDeleteId(null);
    setSaving(false);
  };

  return (
    <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content">
      <div className="container-xxl mt-5">
        {alert && <div className={`alert alert-${alert.type} mb-5`}><h4>{alert.title}</h4><span>{alert.message}</span></div>}

        {canManage && (
        <div className="card shadow-sm mb-5">
          <div className="card-header"><h3 className="card-title fw-bold">
                <i className="ki-duotone ki-plus-square fs-2 me-2 text-primary">
                  <span className="path1"></span>
                  <span className="path2"></span>
                </i>
                Add New Menu
              </h3>
            </div>
          <div className="card-body">
            <form className="row g-4 align-items-end" onSubmit={add}>
              <div className="col-lg-4">
                <label className="form-label fw-bold">Main Heading</label>
                <select className="form-select form-select-solid" value={formHeadingId} onChange={(e) => setFormHeadingId(e.target.value)} required>
                  <option value="">Select Main Heading</option>
                  {headings.map((h) => <option key={h.id} value={h.id}>{h.headingname}</option>)}
                </select>
              </div>
              <div className="col-lg-5">
                <label className="form-label fw-bold">Menu Name</label>
                <input className="form-control form-control-solid" value={formMenuName} onChange={(e) => setFormMenuName(e.target.value)} placeholder="Enter menu name" required />
              </div>
              <div className="col-lg-3"><button className="btn btn-primary w-100" disabled={saving}>{saving ? "Saving..." : "Add Menu"}</button></div>
            </form>
            {!isAdmin && <div className="form-text mt-3">You can add and update menus under your assigned Main Headings. Delete is available only to administrators.</div>}
          </div>
        </div>

        )}

        <div className="card shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between">
              <h3 className="card-title fw-bold mb-0">All Menus</h3>
              <span className="badge badge-light-primary fs-7">
                {rows.length} Total
              </span>
            </div>
          <AdminTableToolbar table={table} headers={["#", "Main Heading", "Menu Name", "Active", "Created By", "Created Date"]} getRows={exportRows} filename="Menus" />
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                <thead><tr className="text-muted fw-bold fs-8 text-uppercase bg-light">
                  <th className="ps-5">#</th><th>Main Heading</th><th>Menu Name</th><th>Active</th><th>Created By</th><th>Created Date</th>{canManage && <th className="text-end pe-5">Action</th>}
                </tr></thead>
                <tbody>
                  {table.visibleRows.map((r, i) => <tr key={r.id}>
                    <td className="ps-5">{(table.page - 1) * table.pageSize + i + 1}</td>
                    <td>
                      {editId === r.id ? (
                        <select className="form-select form-select-sm" value={editHeadingId} onChange={(e) => changeEditHeading(e.target.value)}>
                          {headings.map((h) => <option key={h.id} value={h.id}>{h.headingname}</option>)}
                        </select>
                      ) : <span className="badge badge-light-primary">{headingName(r.main_heading_id)}</span>}
                    </td>
                    <td>{editId === r.id ? <input className="form-control form-control-sm" value={editMenuName} onChange={(e) => setEditMenuName(e.target.value)} /> : <span className="fw-semibold">{r.menuname}</span>}</td>
                    <td>{isAdmin ? <button type="button" className="btn btn-sm btn-icon btn-light" onClick={() => toggleStatus(r)} disabled={saving} title={String(r.status) === "1" ? "Turn Off" : "Turn On"}><i className={`bi ${String(r.status) === "1" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"} fs-2`}></i></button> : <i className={`bi ${String(r.status) === "1" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"} fs-2`}></i>}</td>
                    <td>{r.created_by || "-"}</td>
                    <td>{r.created_at
                              ? new Date(r.created_at).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}</td>
                    <td className="text-end pe-5">
                      {canManage && (editId === r.id ? <>
                        <button className="btn btn-sm btn-success me-1" onClick={() => save(r.id)} disabled={saving}>Save</button>
                        <button className="btn btn-sm btn-light" onClick={() => setEditId(null)}>Cancel</button>
                      </> : deleteId === r.id ? <>
                        <span className="text-danger me-2">Delete?</span>
                        <button className="btn btn-sm btn-danger me-1" onClick={() => remove(r.id)} disabled={saving}>Yes</button>
                        <button className="btn btn-sm btn-light" onClick={() => setDeleteId(null)}>No</button>
                      </> : <>
                        <button className="btn btn-sm btn-icon btn-light-primary me-1" onClick={() => startEdit(r)} title="Edit"><i className="ki-duotone ki-pencil fs-4">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                  </i></button>
                        {isAdmin && <button className="btn btn-sm btn-icon btn-light-danger" onClick={() => setDeleteId(r.id)} title="Delete"><i className="ki-duotone ki-trash fs-4">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                    <span className="path3"></span>
                                    <span className="path4"></span>
                                    <span className="path5"></span>
                                  </i></button>}
                      </>)}
                    </td>
                  </tr>)}
                  {!table.visibleRows.length && <tr><td colSpan={canManage ? 7 : 6} className="text-center py-10 text-muted">No menus found for your accessible Main Headings.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <AdminTableFooter table={table} />
        </div>
      </div>
    </div>
  );
};

export default ManageMenu;
