import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";
import { getAccessibleHeadings, getAccessibleMenus } from "../Utility/dataAccess";
import { AdminTableToolbar, AdminTableFooter, useAdminTable } from "../Utility/AdminTableTools";

const ManageFolder = () => {
  const username = sessionStorage.getItem("user") || "Unknown";
  const isAdmin = (sessionStorage.getItem("role") || "").toLowerCase() === "admin";
  const canManage = Boolean(sessionStorage.getItem("user_id"));
  const [headings, setHeadings] = useState([]);
  const [menus, setMenus] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ main_heading_id: "", menu_id: "", foldername: "" });
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ main_heading_id: "", menu_id: "", foldername: "" });
  const [editMenus, setEditMenus] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const headingName = (id) => headings.find((h) => Number(h.id) === Number(id))?.headingname || "-";
  const menuName = (id) => menus.find((m) => Number(m.id) === Number(id))?.menuname ||
    rows.find((r) => Number(r.menu_id) === Number(id))?.menuname || "-";

  const load = async () => {
    try {
      const hs = await getAccessibleHeadings();
      setHeadings(hs);
      if (!form.main_heading_id && hs.length) {
        setForm((x) => ({ ...x, main_heading_id: String(hs[0].id) }));
      }

      if (!hs.length) {
        setRows([]);
        return;
      }

      const { data, error } = await supabase
        .from("folder_master")
        .select("*")
        .in("main_heading_id", hs.map((h) => Number(h.id)))
        .order("main_heading_id", { ascending: true })
        .order("menu_id", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  const loadMenus = async (headingId, target = "form") => {
    if (!headingId) {
      if (target === "edit") setEditMenus([]);
      else setMenus([]);
      return;
    }
    try {
      const data = await getAccessibleMenus(headingId);
      if (target === "edit") setEditMenus(data);
      else setMenus(data);
    } catch (e) { showAlert("danger", "Error", e.message); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (form.main_heading_id) loadMenus(form.main_heading_id); }, [form.main_heading_id]);

  const toggleStatus = async (row) => {
    if (!isAdmin) return;
    const nextStatus = String(row.status) === "1" ? "0" : "1";
    setSaving(true);
    try {
      const { error } = await supabase.from("folder_master").update({ status: nextStatus }).eq("id", row.id);
      if (error) throw error;
      showAlert("success", "Success", `${row.foldername} is now ${nextStatus === "1" ? "ON" : "OFF"}.`);
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const table = useAdminTable(rows, ["foldername", "menuname", "created_by"]);

  const exportRows = useMemo(() => (items) =>
    items.map((r, i) => [i + 1, headingName(r.main_heading_id), r.menuname || menuName(r.menu_id), r.foldername || "", r.created_by || ""]),
    [headings, rows, menus]);

  const add = async (e) => {
    e.preventDefault();
    if (!form.main_heading_id || !form.menu_id || !form.foldername.trim()) return;
    setSaving(true);
    try {
      const selectedMenu = menus.find((m) => Number(m.id) === Number(form.menu_id));
      const { error } = await supabase.from("folder_master").insert({
        main_heading_id: Number(form.main_heading_id),
        menu_id: Number(form.menu_id),
        menuname: selectedMenu?.menuname || "",
        foldername: form.foldername.trim(),
        status: "1",
        created_by: username,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setForm((x) => ({ ...x, menu_id: "", foldername: "" }));
      showAlert("success", "Success", "Folder added successfully.");
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const startEdit = async (r) => {
    setEditId(r.id);
    setEdit({ main_heading_id: String(r.main_heading_id), menu_id: String(r.menu_id), foldername: r.foldername || "" });
    await loadMenus(r.main_heading_id, "edit");
  };

  const changeEditHeading = async (value) => {
    setEdit((x) => ({ ...x, main_heading_id: value, menu_id: "" }));
    await loadMenus(value, "edit");
  };

  const save = async (id) => {
    if (!edit.main_heading_id || !edit.menu_id || !edit.foldername.trim()) return;
    setSaving(true);
    try {
      const selectedMenu = editMenus.find((m) => Number(m.id) === Number(edit.menu_id));
      const { error } = await supabase.from("folder_master").update({
        main_heading_id: Number(edit.main_heading_id),
        menu_id: Number(edit.menu_id),
        menuname: selectedMenu?.menuname || "",
        foldername: edit.foldername.trim(),
        created_by: username,
      }).eq("id", id);
      if (error) throw error;
      setEditId(null);
      showAlert("success", "Success", "Folder updated.");
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const remove = async (id) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("folder_master").delete().eq("id", id);
      if (error) throw error;
      showAlert("success", "Success", "Folder deleted.");
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
            <i className="ki-duotone ki-folder-added fs-2 me-2 text-primary">
              <span className="path1"></span>
              <span className="path2"></span>
            </i>
            Add New Folder
          </h3></div>
          <div className="card-body">
            <form className="row g-4 align-items-end" onSubmit={add}>
              <div className="col-lg-3">
                <label className="form-label fw-bold">Main Heading</label>
                <select className="form-select form-select-solid" value={form.main_heading_id} onChange={(e) => setForm((x) => ({ ...x, main_heading_id: e.target.value, menu_id: "" }))} required>
                  <option value="">Select Main Heading</option>
                  {headings.map((h) => <option key={h.id} value={h.id}>{h.headingname}</option>)}
                </select>
              </div>
              <div className="col-lg-3">
                <label className="form-label fw-bold">Menu</label>
                <select className="form-select form-select-solid" value={form.menu_id} onChange={(e) => setForm((x) => ({ ...x, menu_id: e.target.value }))} disabled={!form.main_heading_id} required>
                  <option value="">Select Menu</option>
                  {menus.map((m) => <option key={m.id} value={m.id}>{m.menuname}</option>)}
                </select>
              </div>
              <div className="col-lg-3">
                <label className="form-label fw-bold">Folder Name</label>
                <input className="form-control form-control-solid" value={form.foldername} onChange={(e) => setForm((x) => ({ ...x, foldername: e.target.value }))} placeholder="Enter folder name" required />
              </div>
              <div className="col-lg-3">
                <button className="btn btn-primary w-100 mt-3" disabled={saving}>{saving ? "Saving..." : "Add Folder"}</button>
              </div>
            </form>
            {!isAdmin && <div className="form-text mt-3">You can add and update folders under your assigned Main Headings. Delete is available only to administrators.</div>}
          </div>
        </div>

        )}

        <div className="card shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between"><h3 className="card-title fw-bold mb-0">All Folders</h3>
            <span className="badge badge-light-primary fs-7">
              {rows.length} Total
            </span></div>
          <AdminTableToolbar table={table} headers={["#", "Main Heading", "Menu", "Folder", "Active", "Created By", "Created Date"]} getRows={exportRows} filename="Folders" />
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                <thead><tr className="text-muted fw-bold fs-8 text-uppercase bg-light">
                  <th className="ps-5">#</th><th>Main Heading</th><th>Menu</th><th>Folder</th><th>Active</th><th>Created By</th><th>Created Date</th>{canManage && <th className="text-end pe-5">Action</th>}
                </tr></thead>
                <tbody>
                  {table.visibleRows.map((r, i) => <tr key={r.id}>
                    <td className="ps-5">{(table.page - 1) * table.pageSize + i + 1}</td>
                    <td>
                      {editId === r.id ? (
                        <select className="form-select form-select-sm" value={edit.main_heading_id} onChange={(e) => changeEditHeading(e.target.value)}>
                          {headings.map((h) => <option key={h.id} value={h.id}>{h.headingname}</option>)}
                        </select>
                      ) : <span className="badge badge-light-primary">{headingName(r.main_heading_id)}</span>}
                    </td>
                    <td>
                      {editId === r.id ? (
                        <select className="form-select form-select-sm" value={edit.menu_id} onChange={(e) => setEdit((x) => ({ ...x, menu_id: e.target.value }))}>
                          <option value="">Select Menu</option>
                          {editMenus.map((m) => <option key={m.id} value={m.id}>{m.menuname}</option>)}
                        </select>
                      ) : r.menuname || menuName(r.menu_id)}
                    </td>
                    <td>{editId === r.id ? <input className="form-control form-control-sm" value={edit.foldername} onChange={(e) => setEdit((x) => ({ ...x, foldername: e.target.value }))} /> : <span className="fw-semibold">{r.foldername}</span>}</td>
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
                              : "-"}
                    </td>
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
                  {!table.visibleRows.length && <tr><td colSpan={canManage ? 8 : 7} className="text-center py-10 text-muted">No folders found for your accessible Main Headings.</td></tr>}
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

export default ManageFolder;
