import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";
import { getAccessibleHeadings } from "../Utility/dataAccess";
import { AdminTableToolbar, AdminTableFooter, useAdminTable } from "../Utility/AdminTableTools";

const ManageMainHeading = () => {
  const username = sessionStorage.getItem("user") || "Admin";
  const isAdmin = (sessionStorage.getItem("role") || "").toLowerCase() === "admin";
  const [rows, setRows] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [alert, setAlert] = useState(null);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const load = async () => {
    try {
      const data = await getAccessibleHeadings();
      setRows(data || []);
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const table = useAdminTable(rows, ["headingname", "created_by", "status"]);
  const exportRows = useMemo(() => (items) =>
    items.map((r, i) => [i + 1, r.headingname || "", r.created_by || "", r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : ""]),
    []);

  const add = async (e) => {
    e.preventDefault();
    if (!isAdmin || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("main_heading_master").insert({
        headingname: name.trim(),
        status: "1",
        created_by: username,
      });
      if (error) throw error;
      setName("");
      showAlert("success", "Success", "Main Heading added successfully.");
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const save = async (id) => {
    if (!isAdmin || !editValue.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("main_heading_master").update({ headingname: editValue.trim() }).eq("id", id);
      if (error) throw error;
      setEditId(null);
      setEditValue("");
      showAlert("success", "Success", "Main Heading updated.");
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const { data: deletedRows, error } = await supabase.from("main_heading_master").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!deletedRows?.length) throw new Error("The Main Heading was not deleted. Please refresh and try again.");
      if (Number(sessionStorage.getItem("current_heading_id")) === Number(id)) {
        ["current_heading_id", "current_heading_name", "current_menu_id", "current_menu_name", "current_page"].forEach((k) => sessionStorage.removeItem(k));
      }
      showAlert("success", "Success", "Main Heading deleted.");
      await load();
    } catch (e) { showAlert("danger", "Error", e.message); }
    setDeleteId(null);
    setSaving(false);
  };

  return (
    <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content">
      <div className="container-xxl mt-5">
        {alert && <div className={`alert alert-${alert.type} mb-5`}><h4>{alert.title}</h4><span>{alert.message}</span></div>}

        {isAdmin ? (
          <div className="card shadow-sm mb-5">
            <div className="card-header"><h3 className="card-title fw-bold">Manage Main Heading</h3></div>
            <div className="card-body">
              <form className="row g-3 align-items-end" onSubmit={add}>
                <div className="col-lg-9">
                  <label className="form-label fw-bold">Main Heading</label>
                  <input className="form-control form-control-solid" placeholder="e.g. NR Data" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="col-lg-3"><button className="btn btn-primary w-100" disabled={saving}>{saving ? "Saving..." : "Add Main Heading"}</button></div>
              </form>
              <div className="form-text mt-3">Create top-level sections. Menus and folders are created inside the selected Main Heading.</div>
            </div>
          </div>
        ) : (
          <div className="card shadow-sm mb-5">
            <div className="card-body"><h3 className="fw-bold mb-2">Main Heading Access</h3><div className="text-muted">Only Main Headings assigned to your user are shown below.</div></div>
          </div>
        )}

        <div className="card shadow-sm">
          <div className="card-header"><h3 className="card-title fw-bold mb-0">Main Headings</h3></div>
          <AdminTableToolbar table={table} headers={["#", "Main Heading", "Created By", "Created"]} getRows={exportRows} filename="Main_Headings" />
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                <thead><tr className="text-muted fw-bold fs-8 text-uppercase bg-light">
                  <th className="ps-5">#</th><th>Main Heading</th><th>Created By</th><th>Created</th>{isAdmin && <th className="text-end pe-5">Action</th>}
                </tr></thead>
                <tbody>
                  {table.visibleRows.map((r, i) => <tr key={r.id}>
                    <td className="ps-5">{(table.page - 1) * table.pageSize + i + 1}</td>
                    <td>{editId === r.id ? <input className="form-control form-control-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus /> : <span className="badge badge-light-primary fw-semibold">{r.headingname}</span>}</td>
                    <td>{r.created_by || "-"}</td>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "-"}</td>
                    {isAdmin && <td className="text-end pe-5">
                      {editId === r.id ? <>
                        <button className="btn btn-sm btn-success me-1" onClick={() => save(r.id)} disabled={saving}>Save</button>
                        <button className="btn btn-sm btn-light" onClick={() => setEditId(null)}>Cancel</button>
                      </> : deleteId === r.id ? <>
                        <span className="text-danger me-2">Delete?</span>
                        <button className="btn btn-sm btn-danger me-1" onClick={() => remove(r.id)} disabled={saving}>Yes</button>
                        <button className="btn btn-sm btn-light" onClick={() => setDeleteId(null)}>No</button>
                      </> : <>
                        <button className="btn btn-sm btn-icon btn-light-primary me-1" onClick={() => { setEditId(r.id); setEditValue(r.headingname || ""); }} title="Edit">✎</button>
                        <button className="btn btn-sm btn-icon btn-light-danger" onClick={() => setDeleteId(r.id)} title="Delete">×</button>
                      </>}
                    </td>}
                  </tr>)}
                  {!table.visibleRows.length && <tr><td colSpan={isAdmin ? 5 : 4} className="text-center py-10 text-muted">No Main Headings assigned to this user.</td></tr>}
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

export default ManageMainHeading;
