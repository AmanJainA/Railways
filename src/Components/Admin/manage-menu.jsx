import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { getAccessibleHeadings, getAccessibleMenus } from "../Utility/dataAccess";

const ManageMenu = () => {
  const username = sessionStorage.getItem("user") || "Unknown";
  const isAdmin = (sessionStorage.getItem("role") || "").toLowerCase() === "admin";
  const [headings, setHeadings] = useState([]);
  const [rows, setRows] = useState([]);
  const [headingId, setHeadingId] = useState("");
  const [menuName, setMenuName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editHeadingId, setEditHeadingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [alert, setAlert] = useState(null);

  const showAlert=(type,title,message)=>{setAlert({type,title,message});setTimeout(()=>setAlert(null),4000);};

  const loadHeadings=async()=>{
    try {
      const data=await getAccessibleHeadings();
      setHeadings(data);
      if(!headingId && data.length) setHeadingId(String(data[0].id));
    } catch(e){showAlert("danger","Error",e.message);}
  };

  const loadMenus=async(id=headingId)=>{
    if(!id){setRows([]);return;}
    try { setRows(await getAccessibleMenus(id)); }
    catch(e){showAlert("danger","Error",e.message);}
  };

  useEffect(()=>{loadHeadings();},[]);
  useEffect(()=>{if(headingId) loadMenus(headingId);},[headingId]);

  const add=async(e)=>{
    e.preventDefault();
    if(!headingId||!menuName.trim()) return;
    setSaving(true);
    const {error}=await supabase.from("menu_master").insert({
      main_heading_id:Number(headingId), menuname:menuName.trim(), status:"1",
      created_by:username, created_at:new Date().toISOString()
    });
    if(error) showAlert("danger","Error",error.message);
    else {setMenuName("");showAlert("success","Success","Menu added successfully.");loadMenus();}
    setSaving(false);
  };

  const save=async(id)=>{
    if(!editValue.trim()||!editHeadingId)return;
    setSaving(true);
    const {error}=await supabase.from("menu_master").update({
      main_heading_id:Number(editHeadingId),menuname:editValue.trim()
    }).eq("id",id);
    if(error) showAlert("danger","Error",error.message);
    else {setEditId(null);showAlert("success","Success","Menu updated.");loadMenus(editHeadingId);}
    setSaving(false);
  };

  const remove=async(id)=>{
    setSaving(true);
    const {error}=await supabase.from("menu_master").delete().eq("id",id);
    if(error) showAlert("danger","Error",error.message);
    else {showAlert("success","Success","Menu deleted.");loadMenus();}
    setDeleteId(null);setSaving(false);
  };

  return <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content">
    <div className="container-xxl mt-5">
      {alert&&<div className={`alert alert-${alert.type} mb-5`}><h4>{alert.title}</h4><span>{alert.message}</span></div>}
      <div className="card shadow-sm mb-5">
        <div className="card-header"><h3 className="card-title fw-bold">Manage Menu</h3></div>
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={add}>
            <div className="col-md-4"><label className="form-label fw-bold">Main Heading</label>
              <select className="form-select form-select-solid" value={headingId} onChange={e=>setHeadingId(e.target.value)} required>
                <option value="">Select Main Heading</option>{headings.map(h=><option key={h.id} value={h.id}>{h.headingname}</option>)}
              </select>
            </div>
            <div className="col-md-5"><label className="form-label fw-bold">Menu Name</label>
              <input className="form-control form-control-solid" value={menuName} onChange={e=>setMenuName(e.target.value)} placeholder="e.g. Study Data" required/>
            </div>
            <div className="col-md-3"><button className="btn btn-primary w-100" disabled={saving}>{saving?"Saving...":"Add Menu"}</button></div>
          </form>
          {!isAdmin&&<div className="form-text mt-3">Only Main Headings assigned to your user are available.</div>}
        </div>
      </div>
      <div className="card shadow-sm">
        <div className="card-header d-flex justify-content-between align-items-center"><h3 className="card-title fw-bold mb-0">Menus</h3><span className="badge badge-light-primary">{rows.length} Total</span></div>
        <div className="card-body p-0"><div className="table-responsive"><table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
          <thead><tr className="text-muted fw-bold fs-8 text-uppercase bg-light"><th className="ps-5">#</th><th>Main Heading</th><th>Menu Name</th><th>Created By</th><th className="text-end pe-5">Action</th></tr></thead>
          <tbody>{rows.map((r,i)=><tr key={r.id}>
            <td className="ps-5">{i+1}</td><td>{headings.find(h=>Number(h.id)===Number(r.main_heading_id))?.headingname||"-"}</td>
            <td>{editId===r.id?<input className="form-control form-control-sm" value={editValue} onChange={e=>setEditValue(e.target.value)}/>:<span className="fw-semibold">{r.menuname}</span>}</td>
            <td>{r.created_by||"-"}</td>
            <td className="text-end pe-5">
              {editId===r.id?<><select className="form-select form-select-sm d-inline-block w-200px me-2" value={editHeadingId} onChange={e=>setEditHeadingId(e.target.value)}>{headings.map(h=><option key={h.id} value={h.id}>{h.headingname}</option>)}</select><button className="btn btn-sm btn-success me-1" onClick={()=>save(r.id)} disabled={saving}>Save</button><button className="btn btn-sm btn-light" onClick={()=>setEditId(null)}>Cancel</button></>:deleteId===r.id?<><span className="text-danger me-2">Delete?</span><button className="btn btn-sm btn-danger me-1" onClick={()=>remove(r.id)}>Yes</button><button className="btn btn-sm btn-light" onClick={()=>setDeleteId(null)}>No</button></>:<><button className="btn btn-sm btn-icon btn-light-primary me-1" onClick={()=>{setEditId(r.id);setEditValue(r.menuname);setEditHeadingId(String(r.main_heading_id));}}>✎</button><button className="btn btn-sm btn-icon btn-light-danger" onClick={()=>setDeleteId(r.id)}>×</button></>}
            </td>
          </tr>)}{!rows.length&&<tr><td colSpan="5" className="text-center py-10 text-muted">No menus for this Main Heading.</td></tr>}</tbody>
        </table></div></div>
      </div>
    </div>
  </div>;
};
export default ManageMenu;
