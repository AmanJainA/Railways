import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";

const ManageMainHeading = () => {
  const username = sessionStorage.getItem("user") || "Admin";
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
    const { data, error } = await supabase
      .from("main_heading_master")
      .select("*")
      .order("id", { ascending: true });
    if (error) showAlert("danger", "Error", error.message);
    else setRows(data || []);
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("main_heading_master").insert({
      headingname: name.trim(),
      status: "1",
      created_by: username,
    });
    if (error) showAlert("danger", "Error", error.message);
    else {
      setName("");
      showAlert("success", "Success", "Main Heading added successfully.");
      load();
    }
    setSaving(false);
  };

  const save = async (id) => {
    if (!editValue.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("main_heading_master")
      .update({ headingname: editValue.trim() }).eq("id", id);
    if (error) showAlert("danger", "Error", error.message);
    else {
      setEditId(null);
      setEditValue("");
      showAlert("success", "Success", "Main Heading updated.");
      load();
    }
    setSaving(false);
  };

  const remove = async (id) => {
    setSaving(true);
    const { error } = await supabase.from("main_heading_master").delete().eq("id", id);
    if (error) showAlert("danger", "Error", error.message);
    else {
      showAlert("success", "Success", "Main Heading deleted.");
      load();
    }
    setDeleteId(null);
    setSaving(false);
  };

  return (
    <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content">
      <div className="container-xxl mt-5">
        {alert && <div className={`alert alert-${alert.type} mb-5`}><h4>{alert.title}</h4><span>{alert.message}</span></div>}

        <div className="card shadow-sm mb-5">
          <div className="card-header"><h3 className="card-title fw-bold">Manage Main Heading</h3></div>
          <div className="card-body">
            <form className="d-flex gap-3" onSubmit={add}>
              <input className="form-control form-control-solid" placeholder="e.g. NR Data" value={name} onChange={e => setName(e.target.value)} required />
              <button className="btn btn-primary px-6" disabled={saving}>{saving ? "Saving..." : "Add Main Heading"}</button>
            </form>
            <div className="form-text mt-3">Each Main Heading becomes a top-level data section. Menus and folders are created inside the selected heading.</div>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h3 className="card-title fw-bold mb-0">Main Headings</h3>
            <span className="badge badge-light-primary">{rows.length} Total</span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                <thead><tr className="text-muted fw-bold fs-8 text-uppercase bg-light">
                  <th className="ps-5">#</th><th>Main Heading</th><th>Created By</th><th>Created</th><th className="text-end pe-5">Action</th>
                </tr></thead>
                <tbody>
                  {rows.map((r,i)=><tr key={r.id}>
                    <td className="ps-5">{i+1}</td>
                    <td>{editId===r.id ? <input className="form-control form-control-sm" value={editValue} onChange={e=>setEditValue(e.target.value)} autoFocus/> : <span className="fw-semibold">{r.headingname}</span>}</td>
                    <td>{r.created_by || "-"}</td>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : "-"}</td>
                    <td className="text-end pe-5">
                      {editId===r.id ? <>
                        <button className="btn btn-sm btn-light-success me-1" onClick={()=>save(r.id)} disabled={saving}>Save</button>
                        <button className="btn btn-sm btn-light" onClick={()=>setEditId(null)}>Cancel</button>
                      </> : deleteId===r.id ? <>
                        <span className="text-danger me-2">Delete?</span>
                        <button className="btn btn-sm btn-danger me-1" onClick={()=>remove(r.id)} disabled={saving}>Yes</button>
                        <button className="btn btn-sm btn-light" onClick={()=>setDeleteId(null)}>No</button>
                      </> : <>
                        <button className="btn btn-sm btn-icon btn-light-primary me-1" onClick={()=>{setEditId(r.id);setEditValue(r.headingname);}}>✎</button>
                        <button className="btn btn-sm btn-icon btn-light-danger" onClick={()=>setDeleteId(r.id)}>×</button>
                      </>}
                    </td>
                  </tr>)}
                  {!rows.length && <tr><td colSpan="5" className="text-center py-10 text-muted">No Main Headings yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ManageMainHeading;
