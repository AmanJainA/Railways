import React, { useState, useEffect } from "react";

const API_BASE = "https://samrat.cu.ma";
const ALLOWED_EXT = ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];

const UploadFile = () => {
  const [form, setForm] = useState({ name: "", menuname: "", folder: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [menus, setMenus] = useState([]);
  const [folders, setFolders] = useState([]);

  // pulled from session set at login (Login.jsx) - only used for display + uploaded_by
  const uploaded_by = localStorage.getItem("user") || "";
  const dept = localStorage.getItem("dept") || "";

  useEffect(() => {
    fetch(`${API_BASE}/menu_master.php?action=list`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 1) {
          setMenus(data.data.filter((m) => Number(m.status) === 1));
        }
      })
      .catch(() => setMenus([]));
  }, []);

  // whenever the chosen menu changes, load its folders
  useEffect(() => {
    if (!form.menuname) {
      setFolders([]);
      return;
    }
    fetch(`${API_BASE}/folder_master.php?action=list&menuname=${encodeURIComponent(form.menuname)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 1) setFolders(data.data);
      })
      .catch(() => setFolders([]));
  }, [form.menuname]);

  const showAlert = (type, title, message) => setAlert({ type, title, message });

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      showAlert("danger", "Invalid File", "Allowed types: Images, PDF, DOC, XLS, PPT");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.menuname || !file) {
      showAlert("danger", "Error", "Please fill all required fields and select a file.");
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("menuname", form.menuname);
      fd.append("folder", form.folder);
      fd.append("uploaded_by", uploaded_by); // backend looks up dept/email via JOIN on this
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/upload_file.php`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (data.status === 1) {
        showAlert("primary", "Success", data.msg);
        setForm({ name: "", menuname: "", folder: "" });
        setFile(null);
        const fileInput = document.getElementById("uploadFileInput");
        if (fileInput) fileInput.value = "";
      } else {
        showAlert("danger", "Error", data.msg || "Upload failed");
      }
    } catch (err) {
      showAlert("danger", "Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="kt_body" className="header-fixed header-tablet-and-mobile-fixed aside-fixed">
      <div className="content d-flex flex-column flex-column-fluid fs-6" id="kt_content">
        <div className="container-xxl mt-5">
          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title fw-bold">
                <i className="ki-duotone ki-cloud-add fs-2 me-2 text-primary">
                  <span className="path1"></span>
                  <span className="path2"></span>
                </i>
                Upload File
              </h3>
            </div>

            <div className="card-body">
              {alert && (
                <div className={`alert alert-${alert.type} mb-6`}>
                  <h4 className="mb-1">{alert.title}</h4>
                  <span>{alert.message}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row g-6">
                  <div className="col-md-6">
                    <label className="form-label fw-bold required">File Title</label>
                    <input
                      type="text"
                      className="form-control form-control-solid"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Aadhar Card"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold required">Menu Name</label>
                    <select
                      className="form-select form-select-solid"
                      value={form.menuname}
                      onChange={(e) => setForm({ ...form, menuname: e.target.value, folder: "" })}
                      required
                    >
                      <option value="">Select Menu</option>
                      {menus.map((m) => (
                        <option key={m.id} value={m.menuname}>{m.menuname}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Folder (optional)</label>
                    <input
                      type="text"
                      list="folderOptions"
                      className="form-control form-control-solid"
                      value={form.folder}
                      onChange={(e) => setForm({ ...form, folder: e.target.value })}
                      placeholder="Pick existing or type a new folder"
                      disabled={!form.menuname}
                    />
                    <datalist id="folderOptions">
                      {folders.map((f) => (
                        <option key={f.id} value={f.foldername} />
                      ))}
                    </datalist>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold required">File</label>
                    <input
                      id="uploadFileInput"
                      type="file"
                      className="form-control form-control-solid"
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={handleFileChange}
                      required
                    />
                    <div className="form-text">Allowed: Image, PDF, DOC, XLS, PPT</div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Uploaded By</label>
                    <input type="text" className="form-control form-control-solid" value={uploaded_by} disabled />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Department</label>
                    <input type="text" className="form-control form-control-solid" value={dept} disabled />
                  </div>
                </div>

                <div className="text-end mt-8">
                  <button type="submit" className="btn btn-primary px-6" disabled={loading}>
                    {loading ? "Uploading..." : "Submit for Approval"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadFile;
