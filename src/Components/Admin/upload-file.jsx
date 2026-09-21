import React, { useState, useEffect } from "react";
import { supabase } from "../../supabase";

const ALLOWED_EXT = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
];

const UploadFile = () => {
  const [form, setForm] = useState({ name: "", menuname: "", folder: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [menus, setMenus] = useState([]);
  const [folders, setFolders] = useState([]);

  // pulled from session set at login (Login.jsx) - only used for display + uploaded_by
  const uploaded_by = sessionStorage.getItem("user") || "";
  const dept = sessionStorage.getItem("dept") || "";

  useEffect(() => {
    const loadMenus = async () => {
      const { data, error } = await supabase
        .from("menu_master")
        .select("*")
        .eq("status", 1)
        .order("menuname");

      if (!error) setMenus(data);
    };

    loadMenus();
  }, []);

  // whenever the chosen menu changes, load its folders
  useEffect(() => {
    if (!form.menuname) {
      setFolders([]);
      return;
    }

    const loadFolders = async () => {
      const { data, error } = await supabase
        .from("folder_master")
        .select("*")
        .eq("menuname", form.menuname)
        .order("foldername");

      if (!error) setFolders(data);
    };

    loadFolders();
  }, [form.menuname]);

  const showAlert = (type, title, message) =>
    setAlert({ type, title, message });

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      showAlert(
        "danger",
        "Invalid File",
        "Allowed types: Images, PDF, DOC, XLS, PPT",
      );
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.menuname || !file) {
      showAlert("danger", "Error", "Please fill all required fields.");
      return;
    }

    setLoading(true);

    try {
      const ext = file.name.split(".").pop();

      const filename =
        Date.now() + "_" + Math.random().toString(36).substring(2) + "." + ext;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filename, file);

      if (uploadError) throw uploadError;

      const { data: collection, error: collectionError } = await supabase
        .from("datacollection")
        .insert({
          name: form.name,
          menuname: form.menuname,
          folder: form.folder,
          type: file.name.split(".").pop().toLowerCase(),
          status: 0,
          uploaded_by,
          links: filename,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (collectionError) {
        alert(JSON.stringify(collectionError, null, 2));
        throw collectionError;
      }
      const { error: fileError } = await supabase
        .from("file_uploads")
        .insert({
          datacollection_id: collection.id,
          uploaded_by,
        });

      if (fileError) throw fileError;
      // Send notification mail to admin
      await fetch("https://samrat.cu.ma/send_upload_notification.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.name,
          menu: form.menuname,
          folder: form.folder,
          uploaded_by,
          department: dept,
          filename,
        }),
      });
      showAlert("success", "Success", "File uploaded successfully.");

      setForm({
        name: "",
        menuname: "",
        folder: "",
      });

      setFile(null);

      document.getElementById("uploadFileInput").value = "";
    } catch (err) {
      showAlert("danger", "Error", err.message);
    }

    setLoading(false);
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
                    <label className="form-label fw-bold required">
                      File Title
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-solid"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Aadhar Card"
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold required">
                      Menu Name
                    </label>
                    <select
                      className="form-select form-select-solid"
                      value={form.menuname}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          menuname: e.target.value,
                          folder: "",
                        })
                      }
                      required
                    >
                      <option value="">Select Menu</option>
                      {menus.map((m) => (
                        <option key={m.id} value={m.menuname}>
                          {m.menuname}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">
                      Folder (optional)
                    </label>
                    <input
                      type="text"
                      list="folderOptions"
                      className="form-control form-control-solid"
                      value={form.folder}
                      onChange={(e) =>
                        setForm({ ...form, folder: e.target.value })
                      }
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
                    <div className="form-text">
                      Allowed: Image, PDF, DOC, XLS, PPT
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Uploaded By</label>
                    <input
                      type="text"
                      className="form-control form-control-solid"
                      value={uploaded_by}
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-bold">Department</label>
                    <input
                      type="text"
                      className="form-control form-control-solid"
                      value={dept}
                      disabled
                    />
                  </div>
                </div>

                <div className="text-end mt-8">
                  <button
                    type="submit"
                    className="btn btn-primary px-6"
                    disabled={loading}
                  >
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
