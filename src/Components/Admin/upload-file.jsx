import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import { getAccessibleHeadings, getAccessibleMenus, getAccessibleFolders } from "../Utility/dataAccess";

const ALLOWED_EXT=["jpg","jpeg","png","gif","pdf","doc","docx","xls","xlsx","ppt","pptx"];

export default function UploadFile(){
  const uploaded_by=sessionStorage.getItem("user")||"";
  const dept=sessionStorage.getItem("dept")||"";
  const [mode,setMode]=useState("file");
  const [headings,setHeadings]=useState([]);
  const [menus,setMenus]=useState([]);
  const [folders,setFolders]=useState([]);
  const [form,setForm]=useState({main_heading_id:"",menu_id:"",folder_id:"",name:"",onedrive_path:""});
  const [file,setFile]=useState(null);
  const [loading,setLoading]=useState(false);
  const [alert,setAlert]=useState(null);

  const showAlert=(type,title,message)=>{setAlert({type,title,message});setTimeout(()=>setAlert(null),5000);};

  useEffect(()=>{(async()=>{try{const hs=await getAccessibleHeadings();setHeadings(hs);if(hs.length)setForm(x=>({...x,main_heading_id:String(hs[0].id)}));}catch(e){showAlert("danger","Error",e.message);}})();},[]);
  useEffect(()=>{if(!form.main_heading_id){setMenus([]);setFolders([]);return;}(async()=>{try{setMenus(await getAccessibleMenus(form.main_heading_id));setFolders([]);setForm(x=>({...x,menu_id:"",folder_id:""}));}catch(e){showAlert("danger","Error",e.message);}})();},[form.main_heading_id]);
  useEffect(()=>{if(!form.main_heading_id||!form.menu_id){setFolders([]);return;}(async()=>{try{setFolders(await getAccessibleFolders(form.main_heading_id,form.menu_id));}catch(e){showAlert("danger","Error",e.message);}})();},[form.main_heading_id,form.menu_id]);

  const menu=menus.find(m=>Number(m.id)===Number(form.menu_id));
  const folder=folders.find(f=>Number(f.id)===Number(form.folder_id));

  const onFile=e=>{const f=e.target.files?.[0];if(!f)return;const ext=f.name.split(".").pop().toLowerCase();if(!ALLOWED_EXT.includes(ext)){showAlert("danger","Invalid File","Allowed types: Images, PDF, DOC, XLS, PPT.");e.target.value="";return;}setFile(f);};

  const reset=()=>{setForm(x=>({...x,name:"",folder_id:"",onedrive_path:""}));setFile(null);const el=document.getElementById("uploadFileInput");if(el)el.value="";};

  const submit=async e=>{
    e.preventDefault();
    if(!form.main_heading_id||!form.menu_id||!form.name.trim()){showAlert("danger","Error","Please select Main Heading, Menu and enter a File Title.");return;}
    if(mode==="file"&&!file){showAlert("danger","Error","Please select a file.");return;}
    if(mode==="onedrive"&&!form.onedrive_path.trim()){showAlert("danger","Error","Please enter the OneDrive path/address.");return;}
    setLoading(true);
    try{
      let links="",type="",source_type=mode==="file"?"file_upload":"onedrive_path";
      if(mode==="file"){
        const ext=file.name.split(".").pop().toLowerCase();
        const filename=Date.now()+"_"+Math.random().toString(36).substring(2)+"."+ext;
        const {error}=await supabase.storage.from("documents").upload(filename,file);
        if(error)throw error;
        links=filename;type=ext;
      }else{
        links=form.onedrive_path.trim();
        type="ONEDRIVE";
      }
      const {data:collection,error}=await supabase.from("datacollection").insert({
        name:form.name.trim(),main_heading_id:Number(form.main_heading_id),menu_id:Number(form.menu_id),
        folder_id:form.folder_id?Number(form.folder_id):null,menuname:menu?.menuname||"",folder:folder?.foldername||null,
        type,status:0,remark:null,uploaded_by,uploaded_at:new Date().toISOString(),links,source_type
      }).select().single();
      if(error)throw error;
      await supabase.from("file_uploads").insert({datacollection_id:collection.id,uploaded_by});
      try{await fetch("https://samrat.cu.ma/send_upload_notification.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        title:form.name.trim(),menu:menu?.menuname||"",folder:folder?.foldername||"",uploaded_by,department:dept,filename:links,source_type
      })});}catch(e){console.log("Mail Error",e);}
      showAlert("success","Submitted","Your "+(mode==="file"?"file":"OneDrive link")+" has been submitted for admin approval.");
      reset();
    }catch(err){showAlert("danger","Error",err.message);}
    setLoading(false);
  };

  return <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content"><div className="container-xxl mt-5">
    <div className="card shadow-sm"><div className="card-header"><h3 className="card-title fw-bold"><i className="ki-duotone ki-cloud-add fs-2 me-2 text-primary"><span className="path1"></span><span className="path2"></span></i>Upload Files</h3></div>
    <div className="card-body">
      {alert&&<div className={`alert alert-${alert.type} mb-6`}><h4 className="mb-1">{alert.title}</h4><span>{alert.message}</span></div>}
      <div className="d-flex gap-2 mb-7">
        <button type="button" className={`btn ${mode==="file"?"btn-primary":"btn-light-primary"}`} onClick={()=>setMode("file")}>Upload File</button>
        <button type="button" className={`btn ${mode==="onedrive"?"btn-primary":"btn-light-primary"}`} onClick={()=>setMode("onedrive")}>Add OneDrive Path</button>
      </div>
      <form onSubmit={submit}><div className="row g-6">
        <div className="col-md-4"><label className="form-label fw-bold required">Main Heading</label><select className="form-select form-select-solid" value={form.main_heading_id} onChange={e=>setForm({...form,main_heading_id:e.target.value})} required><option value="">Select Main Heading</option>{headings.map(h=><option key={h.id} value={h.id}>{h.headingname}</option>)}</select></div>
        <div className="col-md-4"><label className="form-label fw-bold required">Menu</label><select className="form-select form-select-solid" value={form.menu_id} onChange={e=>setForm({...form,menu_id:e.target.value,folder_id:""})} required><option value="">Select Menu</option>{menus.map(m=><option key={m.id} value={m.id}>{m.menuname}</option>)}</select></div>
        <div className="col-md-4"><label className="form-label fw-bold">Folder</label><select className="form-select form-select-solid" value={form.folder_id} onChange={e=>setForm({...form,folder_id:e.target.value})} disabled={!form.menu_id}><option value="">No Folder</option>{folders.map(f=><option key={f.id} value={f.id}>{f.foldername}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label fw-bold required">File Title</label><input className="form-control form-control-solid" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Enter document title" required/></div>
        {mode==="file"?<div className="col-md-6"><label className="form-label fw-bold required">File</label><input id="uploadFileInput" type="file" className="form-control form-control-solid" accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={onFile} required/><div className="form-text">The file is stored in Supabase Storage and remains pending until admin approval.</div></div>:<div className="col-md-6"><label className="form-label fw-bold required">OneDrive Path / Address</label><input type="url" className="form-control form-control-solid" value={form.onedrive_path} onChange={e=>setForm({...form,onedrive_path:e.target.value})} placeholder="https://...sharepoint.com/..." required/><div className="form-text">Only the path/address is stored. The link is not published until admin approval.</div></div>}
        <div className="col-md-6"><label className="form-label fw-bold">Uploaded By</label><input className="form-control form-control-solid" value={uploaded_by} disabled/></div>
        <div className="col-md-6"><label className="form-label fw-bold">Department</label><input className="form-control form-control-solid" value={dept} disabled/></div>
      </div><div className="text-end mt-8"><button className="btn btn-primary px-6" disabled={loading}>{loading?"Submitting...":"Submit for Approval"}</button></div></form>
    </div></div>
  </div></div>;
}
