import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { getAccessibleHeadings, getAccessibleMenus } from "../Utility/dataAccess";

const ManageFolder=()=>{
  const username=sessionStorage.getItem("user")||"Unknown";
  const [headings,setHeadings]=useState([]);
  const [menus,setMenus]=useState([]);
  const [rows,setRows]=useState([]);
  const [form,setForm]=useState({main_heading_id:"",menu_id:"",foldername:""});
  const [editId,setEditId]=useState(null);
  const [edit,setEdit]=useState({main_heading_id:"",menu_id:"",foldername:""});
  const [deleteId,setDeleteId]=useState(null);
  const [saving,setSaving]=useState(false);
  const [alert,setAlert]=useState(null);

  const showAlert=(type,title,message)=>{setAlert({type,title,message});setTimeout(()=>setAlert(null),4000);};
  const loadHeadings=async()=>{try{const d=await getAccessibleHeadings();setHeadings(d);if(!form.main_heading_id&&d.length)setForm(x=>({...x,main_heading_id:String(d[0].id)}));}catch(e){showAlert("danger","Error",e.message);}};
  const loadMenus=async(id)=>{if(!id){setMenus([]);return;}try{setMenus(await getAccessibleMenus(id));}catch(e){showAlert("danger","Error",e.message);}};
  const loadRows=async(id= form.main_heading_id)=>{if(!id){setRows([]);return;}const {data,error}=await supabase.from("folder_master").select("*").eq("main_heading_id",Number(id)).order("id",{ascending:true});if(error)showAlert("danger","Error",error.message);else setRows(data||[]);};

  useEffect(()=>{loadHeadings();},[]);
  useEffect(()=>{if(form.main_heading_id){loadMenus(form.main_heading_id);loadRows(form.main_heading_id);setForm(x=>({...x,menu_id:""}));}},[form.main_heading_id]);

  const add=async(e)=>{e.preventDefault();if(!form.main_heading_id||!form.menu_id||!form.foldername.trim())return;setSaving(true);const menu=menus.find(m=>Number(m.id)===Number(form.menu_id));const {error}=await supabase.from("folder_master").insert({main_heading_id:Number(form.main_heading_id),menu_id:Number(form.menu_id),menuname:menu?.menuname||"",foldername:form.foldername.trim(),status:"1",created_by:username,created_at:new Date().toISOString()});if(error)showAlert("danger","Error",error.message);else{showAlert("success","Success","Folder added successfully.");setForm(x=>({...x,menu_id:"",foldername:""}));loadRows();}setSaving(false);};

  const startEdit=async(r)=>{setEditId(r.id);setEdit({main_heading_id:String(r.main_heading_id),menu_id:String(r.menu_id),foldername:r.foldername});const ms=await getAccessibleMenus(r.main_heading_id);setMenus(ms);};
  const save=async(id)=>{if(!edit.main_heading_id||!edit.menu_id||!edit.foldername.trim())return;setSaving(true);const menu=menus.find(m=>Number(m.id)===Number(edit.menu_id));const {error}=await supabase.from("folder_master").update({main_heading_id:Number(edit.main_heading_id),menu_id:Number(edit.menu_id),menuname:menu?.menuname||"",foldername:edit.foldername.trim(),created_by:username}).eq("id",id);if(error)showAlert("danger","Error",error.message);else{setEditId(null);showAlert("success","Success","Folder updated.");loadRows(form.main_heading_id);}setSaving(false);};
  const remove=async(id)=>{setSaving(true);const {error}=await supabase.from("folder_master").delete().eq("id",id);if(error)showAlert("danger","Error",error.message);else{showAlert("success","Success","Folder deleted.");loadRows();}setDeleteId(null);setSaving(false);};

  return <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content"><div className="container-xxl mt-5">
    {alert&&<div className={`alert alert-${alert.type} mb-5`}><h4>{alert.title}</h4><span>{alert.message}</span></div>}
    <div className="card shadow-sm mb-5"><div className="card-header"><h3 className="card-title fw-bold">Manage Folder</h3></div><div className="card-body"><form className="row g-3 align-items-end" onSubmit={add}>
      <div className="col-md-4"><label className="form-label fw-bold">Main Heading</label><select className="form-select form-select-solid" value={form.main_heading_id} onChange={e=>setForm({...form,main_heading_id:e.target.value})} required><option value="">Select Main Heading</option>{headings.map(h=><option key={h.id} value={h.id}>{h.headingname}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label fw-bold">Menu</label><select className="form-select form-select-solid" value={form.menu_id} onChange={e=>setForm({...form,menu_id:e.target.value})} disabled={!form.main_heading_id} required><option value="">Select Menu</option>{menus.map(m=><option key={m.id} value={m.id}>{m.menuname}</option>)}</select></div>
      <div className="col-md-4"><label className="form-label fw-bold">Folder Name</label><input className="form-control form-control-solid" value={form.foldername} onChange={e=>setForm({...form,foldername:e.target.value})} required/><button className="btn btn-primary w-100 mt-3" disabled={saving}>{saving?"Saving...":"Add Folder"}</button></div>
    </form></div></div>
    <div className="card shadow-sm"><div className="card-header d-flex justify-content-between"><h3 className="card-title fw-bold mb-0">Folders</h3><span className="badge badge-light-primary">{rows.length} Total</span></div><div className="card-body p-0"><div className="table-responsive"><table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
      <thead><tr className="text-muted fw-bold fs-8 text-uppercase bg-light"><th className="ps-5">#</th><th>Main Heading</th><th>Menu</th><th>Folder</th><th>Created By</th><th className="text-end pe-5">Action</th></tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.id}><td className="ps-5">{i+1}</td><td>{headings.find(h=>Number(h.id)===Number(r.main_heading_id))?.headingname||"-"}</td>
        <td>{editId===r.id?<select className="form-select form-select-sm" value={edit.menu_id} onChange={async e=>setEdit({...edit,menu_id:e.target.value})}>{menus.map(m=><option key={m.id} value={m.id}>{m.menuname}</option>)}</select>:r.menuname}</td>
        <td>{editId===r.id?<input className="form-control form-control-sm" value={edit.foldername} onChange={e=>setEdit({...edit,foldername:e.target.value})}/>:<span className="fw-semibold">{r.foldername}</span>}</td><td>{r.created_by||"-"}</td>
        <td className="text-end pe-5">{editId===r.id?<><button className="btn btn-sm btn-success me-1" onClick={()=>save(r.id)} disabled={saving}>Save</button><button className="btn btn-sm btn-light" onClick={()=>setEditId(null)}>Cancel</button></>:deleteId===r.id?<><span className="text-danger me-2">Delete?</span><button className="btn btn-sm btn-danger me-1" onClick={()=>remove(r.id)}>Yes</button><button className="btn btn-sm btn-light" onClick={()=>setDeleteId(null)}>No</button></>:<><button className="btn btn-sm btn-icon btn-light-primary me-1" onClick={()=>startEdit(r)}>✎</button><button className="btn btn-sm btn-icon btn-light-danger" onClick={()=>setDeleteId(r.id)}>×</button></>}</td>
      </tr>)}{!rows.length&&<tr><td colSpan="6" className="text-center py-10 text-muted">No folders for this Main Heading.</td></tr>}</tbody>
    </table></div></div></div>
  </div></div>;
};
export default ManageFolder;
