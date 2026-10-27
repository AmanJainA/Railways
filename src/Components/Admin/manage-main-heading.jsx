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
      const { data, error } = isAdmin
        ? await supabase
            .from("main_heading_master")
            .select("id,headingname,status,created_at,created_by")
            .order("id", { ascending: true })
        : { data: await getAccessibleHeadings(), error: null };

      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const table = useAdminTable(rows, ["headingname", "created_by", "status"]);
  const exportRows = useMemo(() => (items) =>
    items.map((r, i) => [
      i + 1,
      r.headingname || "",
      String(r.status) === "1" ? "ON" : "OFF",
      r.created_by || "",
      r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "",
    ]),
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
      window.dispatchEvent(new CustomEvent("main-heading-changed"));
    } catch (e) { showAlert("danger", "Error", e.message); }
    setSaving(false);
  };

  const toggleStatus = async (row) => {
    if (!isAdmin) return;
    const nextStatus = String(row.status) === "1" ? "0" : "1";
    setSaving(true);
    try {
      const { error } = await supabase
        .from("main_heading_master")
        .update({ status: nextStatus })
        .eq("id", row.id);
      if (error) throw error;
      showAlert(
        "success",
        "Success",
        row.headingname + " is now " + (nextStatus === "1" ? "ON" : "OFF") + "."
      );
      await load();
      window.dispatchEvent(new CustomEvent("main-heading-changed"));
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
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
            <div className="card-header"><h3 className="card-title fw-bold">Add Main Heading</h3></div>
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
            <div className="card-body"><h3 className="fw-bold mb-2">Main Headings</h3><div className="text-muted">Only Main Headings assigned to your user are shown below.</div></div>
          </div>
        )}

        <div className="card shadow-sm">
          <div className="card-header d-flex align-items-center justify-content-between"><h3 className="card-title fw-bold mb-0">All Main Headings</h3>
            <span className="badge badge-light-primary fs-7">
              {rows.length} Total
            </span></div>
          <AdminTableToolbar table={table} headers={["#", "Main Heading", "Active", "Created By", "Created"]} getRows={exportRows} filename="Main_Headings" />
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                <thead><tr className="text-muted fw-bold fs-8 text-uppercase bg-light">
                  <th className="ps-5">#</th><th>Main Heading</th><th>Active</th><th>Created By</th><th>Created</th>{isAdmin && <th className="text-end pe-5">Action</th>}
                </tr></thead>
                <tbody>
                  {table.visibleRows.map((r, i) => <tr key={r.id}>
                    <td className="ps-5">{(table.page - 1) * table.pageSize + i + 1}</td>
                    <td>{editId === r.id ? <input className="form-control form-control-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus /> : <span className="badge badge-light-primary fw-semibold">{r.headingname}</span>}</td>
                    <td>
                      {isAdmin ? (
                        <button
                          type="button"
                          className={`btn btn-sm btn-icon ${String(r.status) === "1" ? "btn-light-success" : "btn-light-secondary"}`}
                          onClick={() => toggleStatus(r)}
                          disabled={saving}
                          title={String(r.status) === "1" ? "Turn Off" : "Turn On"}
                          aria-label={String(r.status) === "1" ? "Turn Off" : "Turn On"}
                        >
                          <i className={`bi ${String(r.status) === "1" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"} fs-2`}></i>
                        </button>
                      ) : (
                        <i className={`bi ${String(r.status) === "1" ? "bi-toggle-on text-success" : "bi-toggle-off text-muted"} fs-2`} title={String(r.status) === "1" ? "On" : "Off"}></i>
                      )}
                    </td>
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
                    {isAdmin && <td className="text-end pe-5">
                      {editId === r.id ? <>
                        <button className="btn btn-sm btn-success me-1" onClick={() => save(r.id)} disabled={saving}>Save</button>
                        <button className="btn btn-sm btn-light" onClick={() => setEditId(null)}>Cancel</button>
                      </> : deleteId === r.id ? <>
                        <span className="text-danger me-2">Delete?</span>
                        <button className="btn btn-sm btn-danger me-1" onClick={() => remove(r.id)} disabled={saving}>Yes</button>
                        <button className="btn btn-sm btn-light" onClick={() => setDeleteId(null)}>No</button>
                      </> : <>
                        <button className="btn btn-sm btn-icon btn-light-primary me-1" onClick={() => { setEditId(r.id); setEditValue(r.headingname || ""); }} title="Edit"><i className="ki-duotone ki-pencil fs-4">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                  </i></button>
                        <button className="btn btn-sm btn-icon btn-light-danger" onClick={() => setDeleteId(r.id)} title="Delete"><i className="ki-duotone ki-trash fs-4">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                    <span className="path3"></span>
                                    <span className="path4"></span>
                                    <span className="path5"></span>
                                  </i></button>
                      </>}
                    </td>}
                  </tr>)}
                  {!table.visibleRows.length && <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted">No Main Headings assigned to this user.</td></tr>}
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
