import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import {
  getAccessibleHeadings,
  getAccessibleMenus,
  getAccessibleFolders,
  isAdminUser,
  getCurrentUserId,
} from "../Utility/dataAccess";

const STATUS = {
  todo: { label: "To Do", badge: "secondary" },
  in_progress: { label: "In Progress", badge: "primary" },
  done: { label: "Done", badge: "success" },
  blocked: { label: "Blocked", badge: "danger" },
};

const PRIORITY = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const WORK_TYPES = [
  ["study", "Study / Report"],
  ["letter", "Letter"],
  ["meeting", "Meeting"],
  ["ppt", "PPT / Presentation"],
  ["data_requirement", "Data Requirement"],
  ["acceptance", "Acceptance / Response"],
  ["format", "Format / Template"],
  ["analysis", "Analysis"],
  ["todo", "General Todo"],
  ["other", "Other"],
];

const emptyForm = {
  main_heading_id: "",
  menu_id: "",
  folder_id: "",
  parent_id: "",
  title: "",
  description: "",
  work_type: "todo",
  status: "todo",
  priority: "medium",
  due_date: "",
  linked_ids: [],
};

export default function WorkTracker({ embedded = false, onClose }) {
  const navigate = useNavigate();
  const [headings, setHeadings] = useState([]);
  const [menus, setMenus] = useState([]);
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filterHeading, setFilterHeading] = useState(() => sessionStorage.getItem("current_heading_id") || "all");
  const [filterMenu, setFilterMenu] = useState(() => sessionStorage.getItem("current_menu_id") || "all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [fileSearch, setFileSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");

  const currentUserId = getCurrentUserId();
  const admin = isAdminUser();

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
    window.clearTimeout(showAlert.timer);
    showAlert.timer = window.setTimeout(() => setAlert(null), 4500);
  };

  const loadBase = async () => {
    try {
      const hs = await getAccessibleHeadings();
      setHeadings(hs);

      const menuGroups = await Promise.all(
        hs.map(async (h) => await getAccessibleMenus(h.id))
      );
      const ms = menuGroups.flat();
      setMenus(ms);

      const folderGroups = await Promise.all(
        hs.flatMap((h) =>
          ms
            .filter((m) => Number(m.main_heading_id) === Number(h.id))
            .map((m) => getAccessibleFolders(h.id, m.id))
        )
      );
      setFolders(folderGroups.flat());

      const headingIds = hs.map((h) => Number(h.id));
      if (!headingIds.length) {
        setDocuments([]);
        return;
      }

      const { data: docs, error } = await supabase
        .from("datacollection")
        .select("id,name,links,type,status,main_heading_id,menu_id,folder_id,menuname,folder,source_type")
        .in("main_heading_id", headingIds)
        .eq("status", 1)
        .order("id", { ascending: false });

      if (error) throw error;

      // Files can be linked across multiple menus, but only within the
      // Main Headings + Menus accessible to the current user.
      const allowedMenuIds = new Set(ms.map((m) => Number(m.id)));
      setDocuments(
        (docs || []).filter((doc) => allowedMenuIds.has(Number(doc.menu_id)))
      );
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from("work_items")
        .select("*")
        .order("main_heading_id", { ascending: true })
        .order("menu_id", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;

      const rows = data || [];
      const ids = rows.map((x) => x.id);

      let links = [];
      if (ids.length) {
        const { data: linkRows, error: linkError } = await supabase
          .from("work_item_links")
          .select("id,work_item_id,datacollection_id,relation_type")
          .in("work_item_id", ids);
        if (linkError) throw linkError;
        links = linkRows || [];
      }

      const enriched = rows.map((row) => ({
        ...row,
        links: links.filter((l) => Number(l.work_item_id) === Number(row.id)),
      }));

      setItems(enriched);
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  useEffect(() => {
    const user = sessionStorage.getItem("user");
    if (!user) {
      navigate("/");
      return;
    }
    (async () => {
      setLoading(true);
      await loadBase();
      await loadItems();
      if (embedded) await startNew();
      setLoading(false);
    })();
    // eslint-disable-next-line
  }, []);

  const visibleItems = useMemo(() => {
    const allowedHeadingIds = new Set(headings.map((h) => Number(h.id)));
    const allowedMenuIds = new Set(menus.map((m) => Number(m.id)));

    return items.filter((x) => {
      if (!allowedHeadingIds.has(Number(x.main_heading_id))) return false;

      // Non-admin users are automatically restricted to their assigned
      // Main Headings + Menu Access. Admins can use the filters below.
      if (!admin && !allowedMenuIds.has(Number(x.menu_id))) return false;

      if (admin && filterHeading !== "all" && Number(x.main_heading_id) !== Number(filterHeading)) return false;
      if (admin && filterMenu !== "all" && Number(x.menu_id) !== Number(filterMenu)) return false;
      if (admin && filterStatus !== "all" && x.status !== filterStatus) return false;
      return true;
    });
  }, [items, headings, menus, filterHeading, filterMenu, filterStatus, admin]);

  const headingName = (id) =>
    headings.find((x) => Number(x.id) === Number(id))?.headingname || `Heading #${id}`;
  const menuName = (id) =>
    menus.find((x) => Number(x.id) === Number(id))?.menuname || `Menu #${id}`;
  const folderName = (id) =>
    folders.find((x) => Number(x.id) === Number(id))?.foldername || "";

  const docById = useMemo(
    () => Object.fromEntries(documents.map((d) => [Number(d.id), d])),
    [documents]
  );

  const childMap = useMemo(() => {
    const map = {};
    visibleItems.forEach((x) => {
      const key = x.parent_id ? Number(x.parent_id) : 0;
      if (!map[key]) map[key] = [];
      map[key].push(x);
    });
    return map;
  }, [visibleItems]);

  const flattenTree = (parentId = 0, depth = 0, output = []) => {
    (childMap[parentId] || []).forEach((x) => {
      output.push({ ...x, depth });
      flattenTree(Number(x.id), depth + 1, output);
    });
    return output;
  };

  const treeItems = useMemo(() => flattenTree(), [childMap]);

  const resetForm = () => {
    setForm(emptyForm);
    setFileSearch("");
    setParentSearch("");
    setEditingId(null);
    setMenus([]);
    setFolders([]);
  };

  const startNew = async () => {
    const preferredHeading = Number(sessionStorage.getItem("current_heading_id"));
    const firstHeading =
      headings.find((h) => Number(h.id) === preferredHeading) || headings[0];
    if (!firstHeading) return;

    try {
      const ms = await getAccessibleMenus(firstHeading.id);
      setMenus(ms);
      const preferredMenu = sessionStorage.getItem("current_menu_id");
      const menuId = preferredMenu && ms.some((m) => Number(m.id) === Number(preferredMenu)) ? String(preferredMenu) : "";
      const fs = menuId ? await getAccessibleFolders(firstHeading.id, menuId) : [];
      setFolders(fs);
      setEditingId(null);
      setFileSearch("");
      setParentSearch("");
      setForm({
        ...emptyForm,
        main_heading_id: String(firstHeading.id),
        menu_id: menuId,
        folder_id: "",
      });
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  const onHeadingChange = async (value) => {
    setForm((x) => ({
      ...x,
      main_heading_id: value,
      menu_id: "",
      folder_id: "",
      parent_id: "",
      linked_ids: [],
    }));
    if (!value) {
      setMenus([]);
      setFolders([]);
      return;
    }
    try {
      setMenus(await getAccessibleMenus(value));
      setFolders([]);
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  const onMenuChange = async (value) => {
    setForm((x) => ({ ...x, menu_id: value, folder_id: "", parent_id: "", linked_ids: [] }));
    if (!value || !form.main_heading_id) {
      setFolders([]);
      return;
    }
    try {
      setFolders(await getAccessibleFolders(form.main_heading_id, value));
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  const editItem = async (item) => {
    const ms = await getAccessibleMenus(item.main_heading_id);
    const fs = await getAccessibleFolders(item.main_heading_id, item.menu_id);
    setMenus(ms);
    setFolders(fs);
    setEditingId(item.id);
    setFileSearch("");
    const parentItem = item.parent_id ? items.find((x) => Number(x.id) === Number(item.parent_id)) : null;
    setParentSearch(parentItem?.title || "");
    setForm({
      main_heading_id: String(item.main_heading_id),
      menu_id: String(item.menu_id),
      folder_id: item.folder_id ? String(item.folder_id) : "",
      parent_id: item.parent_id ? String(item.parent_id) : "",
      title: item.title || "",
      description: item.description || "",
      work_type: item.work_type || "todo",
      status: item.status || "todo",
      priority: item.priority || "medium",
      due_date: item.due_date || "",
      linked_ids: (item.links || []).map((x) => Number(x.datacollection_id)),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.title}" and all of its linked references?`)) return;
    try {
      const { error } = await supabase.from("work_items").delete().eq("id", item.id);
      if (error) throw error;
      showAlert("success", "Deleted", "Work item deleted successfully.");
      await loadItems();
      if (editingId === item.id) resetForm();
    } catch (e) {
      showAlert("danger", "Error", e.message);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.main_heading_id || !form.menu_id || !form.title.trim()) {
      showAlert("danger", "Required", "Main Heading, Menu and Work / Todo title are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        main_heading_id: Number(form.main_heading_id),
        menu_id: Number(form.menu_id),
        folder_id: form.folder_id ? Number(form.folder_id) : null,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        work_type: form.work_type,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        created_by: currentUserId || null,
      };

      let workId = editingId;

      if (editingId) {
        const { error } = await supabase.from("work_items").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("work_items")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        workId = data.id;
      }

      await supabase.from("work_item_links").delete().eq("work_item_id", workId);

      if (form.linked_ids.length) {
        const linkRows = form.linked_ids.map((docId) => ({
          work_item_id: workId,
          datacollection_id: Number(docId),
          relation_type: "deliverable",
          created_by: currentUserId || null,
        }));
        const { error: linkError } = await supabase.from("work_item_links").insert(linkRows);
        if (linkError) throw linkError;
      }

      showAlert("success", editingId ? "Updated" : "Created", `"${form.title.trim()}" saved successfully.`);
      await loadItems();
      resetForm();
    } catch (e) {
      showAlert("danger", "Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredMenus = filterHeading === "all"
    ? menus
    : menus.filter((m) => Number(m.main_heading_id) === Number(filterHeading));

  // A single Work / Todo can connect files from multiple menus under the
  // same Main Heading (e.g. Letter + Meeting + Reports).
  const formDocuments = documents
    .filter((d) => Number(d.main_heading_id) === Number(form.main_heading_id))
    .filter((d) => {
      const q = fileSearch.trim().toLowerCase();
      if (!q) return true;
      return [d.name, d.menuname, d.folder, d.type, d.source_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const menuA = (a.menuname || "").localeCompare(b.menuname || "");
      if (menuA !== 0) return menuA;
      return (a.name || "").localeCompare(b.name || "");
    });

  const formParentOptions = items.filter((x) =>
    Number(x.main_heading_id) === Number(form.main_heading_id) &&
    Number(x.menu_id) === Number(form.menu_id) &&
    Number(x.id) !== Number(editingId)
  );

  const selectedParent = formParentOptions.find((x) => Number(x.id) === Number(form.parent_id));

  const openDocument = (doc) => {
    if (!doc?.links) return;
    sessionStorage.setItem("viewer_file", doc.links);
    navigate("/nr/viewer");
  };

  return (
    <div className="d-flex flex-column flex-column-fluid" id="kt_content" style={embedded ? { width: "100%", maxWidth: "100%", overflowX: "hidden" } : undefined}>
      <div className="container-xxl py-6" style={embedded ? { width: "100%", maxWidth: "100%", margin: "0 auto", padding: "0", boxSizing: "border-box" } : undefined}>
        {alert && (
          <div className={`alert alert-${alert.type} mb-6`}>
            <strong>{alert.title}</strong>
            <div>{alert.message}</div>
          </div>
        )}


        {embedded && (
          <div className="card shadow-sm mb-6" style={{ overflow: "hidden", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-3" style={{ overflow: "hidden" }}>
              <div className="min-w-0 flex-grow-1" style={{ minWidth: 0 }}>
                <h3 className="card-title fw-bold mb-1" style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>Work / Todo</h3>
                <div className="text-muted fs-7" style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}>Record work for the current Main Heading / Menu and connect related files.</div>
              </div>
              {onClose && <button type="button" className="btn btn-sm btn-light-danger flex-shrink-0" onClick={onClose}>Close</button>}
            </div>
            <div className="card-body">
              <form onSubmit={save}>
                <div className="row g-5">
                  <div className="col-md-6"><label className="form-label fw-semibold">Main Heading</label>
                    <select className="form-select" value={form.main_heading_id} onChange={(e) => onHeadingChange(e.target.value)} required>
                      <option value="">Select Main Heading</option>
                      {headings.map((h) => <option key={h.id} value={h.id}>{h.headingname}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6"><label className="form-label fw-semibold">Menu</label>
                    <select className="form-select" value={form.menu_id} onChange={(e) => onMenuChange(e.target.value)} required>
                      <option value="">Select Menu</option>
                      {menus.filter((m) => !form.main_heading_id || Number(m.main_heading_id) === Number(form.main_heading_id)).map((m) => <option key={m.id} value={m.id}>{m.menuname}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6"><label className="form-label fw-semibold">Folder</label>
                    <select className="form-select" value={form.folder_id} onChange={(e) => setForm((x) => ({ ...x, folder_id: e.target.value, parent_id: "" }))}>
                      <option value="">No specific folder</option>{folders.map((f) => <option key={f.id} value={f.id}>{f.foldername}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6"><label className="form-label fw-semibold">Work Type</label>
                    <select className="form-select" value={form.work_type} onChange={(e) => setForm((x) => ({ ...x, work_type: e.target.value }))}>
                      {WORK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-8"><label className="form-label fw-semibold">Work / Todo</label>
                    <input type="text" className="form-control" value={form.title} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} placeholder="e.g. Assignment of IVth" required />
                  </div>
                  <div className="col-md-4"><label className="form-label fw-semibold">Parent Work / Todo</label>
                    <select
                      className="form-select"
                      value={form.parent_id}
                      onChange={(e) => {
                        const value = e.target.value;
                        const match = formParentOptions.find((x) => Number(x.id) === Number(value));
                        setForm((x) => ({
                          ...x,
                          parent_id: value,
                        }));
                        setParentSearch(match?.title || "");
                      }}
                      disabled={!formParentOptions.length}
                    >
                      <option value="">
                        {formParentOptions.length ? "No Parent (Top-level Work / Todo)" : "No parent Work / Todo available"}
                      </option>
                      {formParentOptions.map((x) => (
                        <option key={x.id} value={x.id}>
                          {WORK_TYPES.find((w) => w[0] === x.work_type)?.[1] || x.work_type} — {x.title}
                        </option>
                      ))}
                    </select>
                    <div className="text-muted fs-7 mt-1">
                      Select an existing Work / Todo that this item belongs under.
                    </div>
                    {selectedParent && <div className="text-muted fs-7 mt-1">Selected: {selectedParent.title}</div>}
                  </div>
                  <div className="col-12"><label className="form-label fw-semibold">Explanation / Description</label>
                    <textarea className="form-control" rows="4" value={form.description} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} placeholder="Explain the work, action taken, requirement, output, or related note." />
                  </div>
                  <div className="col-md-4"><label className="form-label fw-semibold">Status</label>
                    <select className="form-select" value={form.status} onChange={(e) => setForm((x) => ({ ...x, status: e.target.value }))}>{Object.entries(STATUS).map(([value, x]) => <option key={value} value={value}>{x.label}</option>)}</select>
                  </div>
                  <div className="col-md-4"><label className="form-label fw-semibold">Priority</label>
                    <select className="form-select" value={form.priority} onChange={(e) => setForm((x) => ({ ...x, priority: e.target.value }))}>{Object.entries(PRIORITY).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                  </div>
                  <div className="col-md-4"><label className="form-label fw-semibold">Due Date</label>
                    <input type="date" className="form-control" value={form.due_date} onChange={(e) => setForm((x) => ({ ...x, due_date: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <label className="form-label fw-semibold mb-0">Related Files — Select Multiple</label>
                      <span className="badge badge-light-primary">{form.linked_ids.length} selected</span>
                    </div>
                    {form.main_heading_id && formDocuments.length > 0 && <div className="mb-3">
                      <input
                        type="search"
                        className="form-control"
                        value={fileSearch}
                        onChange={(e) => setFileSearch(e.target.value)}
                        placeholder="Search related files by file name, menu, folder or type..."
                        aria-label="Search related files"
                      />
                    </div>}
                    {!form.main_heading_id ? <div className="alert alert-light text-muted mb-0">Select a Main Heading to see its files.</div> :
                      formDocuments.length === 0 ? <div className="alert alert-light text-muted mb-0">No active files are available under this Main Heading.</div> :
                      <div className="border rounded p-3" style={{ maxHeight: 300, overflowY: "auto" }}><div className="row g-2">
                        {formDocuments.map((doc) => {
                          const checked = form.linked_ids.includes(Number(doc.id));
                          return <div className="col-md-6" key={doc.id}>
                            <label className="d-flex align-items-start gap-2 p-3 border rounded cursor-pointer h-100">
                              <input className="form-check-input mt-1" type="checkbox" checked={checked}
                                onChange={(e) => setForm((x) => ({ ...x, linked_ids: e.target.checked ? [...new Set([...x.linked_ids, Number(doc.id)])] : x.linked_ids.filter((id) => Number(id) !== Number(doc.id)) }))} />
                              <span><span className="fw-semibold d-block">{doc.name}</span><span className="text-muted fs-7">{doc.menuname || "Menu"}{doc.folder ? " • " + doc.folder : ""}</span></span>
                            </label>
                          </div>;
                        })}
                      </div></div>}
                    <div className="text-muted fs-7 mt-2">Files from different menus under the same Main Heading can be selected together.</div>
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2 mt-6">
                  <button type="button" className="btn btn-light" onClick={() => { resetForm(); startNew(); }}>Clear</button>
                  <button type="submit" className="btn btn-success" disabled={saving}>{saving ? "Saving..." : (editingId ? "Update Work / Todo" : "Submit Work / Todo")}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {!embedded && <div className="card shadow-sm">
          <div className="card-header">
            <div className="w-100">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h3 className="card-title fw-bold mb-1">Connected Work Register</h3>
                  <div className="text-muted fs-7">Use the hierarchy to understand exactly what was done and which deliverables belong to it.</div>
                </div>
                {admin && (
                  <div className="d-flex flex-wrap gap-2">
                    <select className="form-select form-select-sm" value={filterHeading} onChange={(e) => { setFilterHeading(e.target.value); setFilterMenu("all"); }}>
                      <option value="all">All Main Headings</option>
                      {headings.map((h) => <option key={h.id} value={h.id}>{h.headingname}</option>)}
                    </select>
                    <select className="form-select form-select-sm" value={filterMenu} onChange={(e) => setFilterMenu(e.target.value)}>
                      <option value="all">All Menus</option>
                      {filteredMenus.map((m) => <option key={m.id} value={m.id}>{m.menuname}</option>)}
                    </select>
                    <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                      <option value="all">All Status</option>
                      {Object.entries(STATUS).map(([v, x]) => <option key={v} value={v}>{x.label}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {loading ? (
              <div className="p-10 text-center"><div className="spinner-border text-primary"></div></div>
            ) : treeItems.length === 0 ? (
              <div className="p-10 text-center text-muted">
                No work items found for the selected Main Heading / Menu / Status.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4 mb-0">
                  <thead>
                    <tr className="fw-bold text-muted bg-light">
                      <th className="ps-5">Work / Todo</th>
                      <th>Main Heading</th>
                      <th>Menu</th>
                      <th>Folder</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Connected Files</th>
                      
                    </tr>
                  </thead>
                  <tbody>
                    {treeItems.map((x) => (
                      <tr key={x.id}>
                        <td className="ps-5">
                          <div style={{ paddingLeft: x.depth * 24 }}>
                            {x.depth > 0 && <span className="text-muted me-2">↳</span>}
                            <span className="fw-bold text-gray-900">{x.title}</span>
                            {x.description && <div className="text-muted fs-7 mt-1">{x.description}</div>}
                          </div>
                        </td>
                        <td>{headingName(x.main_heading_id)}</td>
                        <td>{menuName(x.menu_id)}</td>
                        <td>{x.folder_id ? folderName(x.folder_id) : "-"}</td>
                        <td><span className="badge badge-light-info">{WORK_TYPES.find((w) => w[0] === x.work_type)?.[1] || x.work_type}</span></td>
                        <td><span className={`badge badge-light-${STATUS[x.status]?.badge || "secondary"}`}>{STATUS[x.status]?.label || x.status}</span></td>
                        <td>{PRIORITY[x.priority] || x.priority}</td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {(x.links || []).map((link) => {
                              const doc = docById[Number(link.datacollection_id)];
                              return doc ? (
                                <button key={link.id} type="button" className="btn btn-sm btn-light-primary" onClick={() => openDocument(doc)} title={doc.name}>
                                  {doc.menuname ? <span className="text-muted me-1">{doc.menuname}:</span> : null}
                                  {doc.name}
                                </button>
                              ) : null;
                            })}
                            {!x.links?.length && <span className="text-muted">No files linked</span>}
                          </div>
                        </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>}


      </div>
    </div>
  );
}
