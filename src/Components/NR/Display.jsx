import React, { useEffect, useRef, useState } from "react";
import $ from "jquery";
import JSZip from "jszip";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import Footer from "../Footer/Footer";
import { supabase } from "../../supabase";
import { getAccessibleHeadings, getAccessibleMenus } from "../Utility/dataAccess";
import WorkTracker from "../Admin/WorkTracker";
window.JSZip = JSZip;
if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

const PAGE_CONFIG = {
  nangia: { title: "Nangia", hasFolders: false },
  mydata: { title: "My Data", hasFolders: false },
  dashboarddesign: { title: "Dashboard Design", hasFolders: false },
  letter: { title: "Letter", hasFolders: true },
  meeting: { title: "Meeting", hasFolders: true },
  studydata: { title: "Study Data", hasFolders: true },
  visitdata: { title: "Visit Data", hasFolders: true },
  policy: { title: "Policy", hasFolders: true },
  // ppt: { title: "PPT", hasFolders: false },
  reports: { title: "Reports", hasFolders: false },
  questions: { title: "Questions", hasFolders: false },
  researchpaper: { title: "Research Paper", hasFolders: false },
  summarization: { title: "Summarization", hasFolders: false },
  format: { title: "Format", hasFolders: false },
};

const FILE_BADGE = {
  pdf: "badge-light-danger",
  doc: "badge-light-primary",
  docx: "badge-light-primary",
  xls: "badge-light-success",
  xlsx: "badge-light-success",
  jpg: "badge-light-warning",
  jpeg: "badge-light-warning",
  png: "badge-light-warning",
  gif: "badge-light-warning",
  bmp: "badge-light-warning",
  svg: "badge-light-warning",
  ppt: "badge-light-info",
  pptx: "badge-light-info",
  zip: "badge-light-dark",
  rar: "badge-light-dark",
};

const fileBadge = (t) =>
  FILE_BADGE[t?.toLowerCase()] || "badge-light-secondary";
const ucFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");
const tableId = (page) => `dt_table_${page}`;

export default function Display({ page }) {
  const [showWorkTodo, setShowWorkTodo] = useState(false);
  // ── Derive config directly from PAGE_CONFIG — single source of truth ──────
  const getHF = () => !!PAGE_CONFIG[page]?.hasFolders;
  const getTitle = () => PAGE_CONFIG[page]?.title || "";

  // DOM refs
  const wrapperRef = useRef(null);
  const tableRef = useRef(null);
  const exportContainerRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const folderTabsRef = useRef(null);
  const searchInputRef = useRef(null);
  const statusSelectRef = useRef(null);

  // Plain refs — never trigger React renders
  const dtRef = useRef(null);
  const rowsRef = useRef([]);
  const activeFolderRef = useRef("all");
  const foldersRef = useRef([]);

  // ── Request token — guards against stale async responses ──────────────────
  // Every effect run (i.e. every time `page` changes) gets a new token.
  // Any in-flight fetch from a *previous* page/effect that resolves late
  // checks this token before touching refs or the DOM, and bails out if
  // it's no longer current. This is what was missing before: nothing
  // stopped a slow Study Data / Visit Data "All" fetch from finishing
  // *after* you'd already navigated away, and overwriting the new page's
  // table with stale thead/tbody writes + a duplicate DataTable init —
  // which is exactly what produced the "unknown parameter" errors.
  const requestTokenRef = useRef(0);

  // ── Destroy DataTable safely ──────────────────────────────────────────────
  const destroyDT = () => {
    try {
      if (
        tableRef.current &&
        $.fn.DataTable &&
        $.fn.DataTable.isDataTable(tableRef.current)
      ) {
        $(tableRef.current).DataTable().clear().destroy();
      }

      dtRef.current = null;

      if (tableRef.current) {
        tableRef.current.innerHTML = `
        <thead></thead>
        <tbody></tbody>
      `;
      }

    } catch (error) {
      console.error("DataTable destroy error:", error);
    }
  };
  // ── Write thead imperatively so it always matches tbody column count ───────
  const writeThead = (hf) => {
    if (!tableRef.current) return;

    const thead = tableRef.current.querySelector("thead");

    if (!thead) return;

    thead.innerHTML = `
    <tr class="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
      <th>#</th>
      <th style="width:650px">File Name</th>
      <th>File Type</th>
      ${hf ? "<th>Folder</th>" : ""}
      <th>Action</th>
    </tr>
  `;
  };

  // ── Write tbody rows imperatively ─────────────────────────────────────────
  const writeRows = (rows, hf) => {
    const table = tableRef.current;
    if (!table) return;
    let tbody = tableRef.current.querySelector("tbody");

    if (!tbody) {
      tbody = document.createElement("tbody");
      tableRef.current.appendChild(tbody);
    }

    tbody.innerHTML = "";

    if (rows.length === 0) {
      tbody.innerHTML = `
         <tr class="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
          <td colspan="${hf ? 5 : 4}" class="text-center text-gray-500 py-10">
            <i class="ki-duotone ki-folder fs-2x text-gray-400 mb-3 d-block">
              <span class="path1"></span><span class="path2"></span>
            </i>
            No files found.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (row, i) => `
      <tr class="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
        <td class="text-gray-900">${i + 1}</td>
        <td class="text-gray-900 text-hover-primary">${escapeHtml(row.name)}</td>
        <td>
          <div class="badge ${fileBadge(row.type)}">
            ${(row.type || "").toUpperCase()}
          </div>
        </td>
        ${hf
            ? `
        <td>
          <span class="badge badge-light-primary">
            <i class="ki-duotone ki-folder fs-7 me-1">
              <span class="path1"></span><span class="path2"></span>
            </i>
            ${escapeHtml(ucFirst(row.foldername || row.folder || ""))}
          </span>
        </td>`
            : ""
          }
        <td>
          <a href="/Railways/nr/viewer" class="viewer-link" data-file="${encodeURIComponent(row.links || "")}">
            <i class="ki-duotone ki-eye fs-3 mt-2 text-primary">
              <span class="path1"></span>
              <span class="path2"></span>
              <span class="path3"></span>
            </i>
          </a>
        </td>
      </tr>`,
      )
      .join("");
    tbody.querySelectorAll(".viewer-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        const file = decodeURIComponent(
          e.currentTarget.getAttribute("data-file") || "",
        );
        sessionStorage.setItem("viewer_file", file);
      });
    });
  };

  // ── Escape user/DB-supplied text before injecting into innerHTML ──────────
  // Not the cause of the DataTables error (verified that separately), but
  // injecting raw `&`, `<`, `>` from file names straight into innerHTML is
  // still bad practice and worth closing off.
  const escapeHtml = (str) =>
    (str || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // ── Write loading spinner ─────────────────────────────────────────────────
  const writeLoading = () => {
    const hf = getHF();

    if (!tableRef.current) return;

    tableRef.current.innerHTML = `
    <thead></thead>
    <tbody>
      <tr class="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
        <td colspan="${hf ? 5 : 4}" class="text-center py-10">
          <span class="spinner-border spinner-border-sm text-primary me-2"></span>
          Loading...
        </td>
      </tr>
    </tbody>
  `;
  };
  // ── Init DataTable ────────────────────────────────────────────────────────
  const initDT = (rows) => {

    // Component/table may already be unmounted
    if (!tableRef.current) return;

    const hf = getHF();
    const pageTitle = getTitle();

    destroyDT();

    // Check again because destroyDT may have changed the DOM
    if (!tableRef.current) return;

    // Keep an empty menu as a blank card. DataTables is not initialised
    // because the empty placeholder row uses colspan and is not a real
    // DataTables row.
    if (!rows || rows.length === 0) {
      tableRef.current.style.display = "none";
      tableRef.current.innerHTML = "<thead></thead><tbody></tbody>";
      return;
    }

    tableRef.current.style.display = "";
    writeThead(hf);
    writeRows(rows, hf);

    const actionCol = hf ? 4 : 3;
    const exportCols = hf ? [0, 1, 2, 3] : [0, 1, 2];

    dtRef.current = $(tableRef.current).DataTable({
      pageLength: 10,
      ordering: true,
      searching: true,
      autoWidth: false,
      deferRender: true,
      order: [],
      retrieve: false,
      destroy: true,
      paging: true,
      info: true,
      lengthChange: true,

      columnDefs: [
        { orderable: false, targets: 0 },
        { orderable: false, targets: actionCol },
        { className: "text-center", targets: 0 },
      ],

      dom:
        "<'row'<'col-sm-12'tr>>" +
        "<'row align-items-center mt-3'" +
        "<'col-sm-6 d-flex align-items-center gap-3'l i>" +
        "<'col-sm-6 d-flex justify-content-end'p>>",

      lengthMenu: [10, 20, 50, 100],
      pagingType: "simple_numbers",

      language: {
        info: "Showing _START_ to _END_ of _TOTAL_ records",
        lengthMenu: "_MENU_",
        paginate: { previous: "‹", next: "›" },
      },

      buttons: [
        {
          extend: "copyHtml5",
          title: `${pageTitle} Data`,
          exportOptions: { columns: exportCols },
        },
        {
          extend: "excelHtml5",
          title: `${pageTitle} Data`,
          exportOptions: { columns: exportCols },
        },
        {
          extend: "csvHtml5",
          title: `${pageTitle} Data`,
          exportOptions: { columns: exportCols },
        },
        {
          extend: "pdfHtml5",
          title: `${pageTitle} Data`,
          orientation: "landscape",
          pageSize: "A4",
          exportOptions: { columns: exportCols },
        },
      ],
    });

    if (exportContainerRef.current) {
      dtRef.current.buttons().container().appendTo(exportContainerRef.current);
    }

    const searchEl = searchInputRef.current;
    if (searchEl) {
      let timer;
      searchEl.oninput = () => {
        clearTimeout(timer);
        const val = searchEl.value;
        timer = setTimeout(() => {
          dtRef.current?.search(val).draw();
        }, 300);
      };
    }

    const statusEl = statusSelectRef.current;
    if (statusEl) {
      statusEl.onchange = () => {
        const val = statusEl.value;
        dtRef.current
          ?.column(2)
          .search(val === "all" ? "" : val)
          .draw();
      };
    }

    exportDropdownRef.current
      ?.querySelectorAll("[data-export]")
      .forEach((el) => {
        el.onclick = (e) => {
          e.preventDefault();
          const type = el.getAttribute("data-export");
          if (type === "copy") dtRef.current?.button(".buttons-copy").trigger();
          if (type === "excel")
            dtRef.current?.button(".buttons-excel").trigger();
          if (type === "csv") dtRef.current?.button(".buttons-csv").trigger();
          if (type === "pdf") dtRef.current?.button(".buttons-pdf").trigger();
          hideDropdown();
        };
      });
  };

  // ── Export dropdown ─────────────────────────────────────────────────────
  const hideDropdown = () => {
    if (exportDropdownRef.current)
      exportDropdownRef.current.style.display = "none";
  };
  const toggleDropdown = () => {
    const d = exportDropdownRef.current;
    if (!d) return;
    d.style.display === "block"
      ? (d.style.display = "none")
      : (d.style.display = "block");
  };

  // ── Folder tabs ───────────────────────────────────────────────────────────
  // `token` is threaded through so a tab click always fetches against the
  // *currently active* page/effect, never a stale one.
  const renderFolderTabs = (folders, active, token) => {
    const ul = folderTabsRef.current;
    if (!ul) return;
    ul.innerHTML = "";

    const makeTab = (label, folderId, iconClass) => {
      const li = document.createElement("li");
      li.className = "nav-item";
      const a = document.createElement("a");
      a.href = "#";
      a.className = `nav-link${String(folderId) === String(active) ? " active" : ""}`;
      a.innerHTML = `
        <i class="ki-duotone ${iconClass} fs-4 me-1">
          <span class="path1"></span><span class="path2"></span>
        </i>${ucFirst(label)}`;
      a.onclick = (e) => {
        e.preventDefault();
        ul.querySelectorAll(".nav-link").forEach((x) =>
          x.classList.remove("active"),
        );
        a.classList.add("active");
        activeFolderRef.current = String(folderId);
        sessionStorage.setItem("activeTab_" + page, String(folderId));
        fetchData(String(folderId), token);
      };
      li.appendChild(a);
      return li;
    };

    ul.appendChild(makeTab("All", "all", "ki-folder-open"));
    folders.forEach((f) =>
      ul.appendChild(makeTab(f.foldername, f.id, "ki-folder"))
    );
  };

  // ── Data fetching — every call is stamped with `token` and checks it
  //    against requestTokenRef.current before mutating anything. If the
  //    effect has moved on (page changed) by the time the network call
  //    resolves, the result is silently discarded instead of corrupting
  //    the table that now belongs to a different page. ───────────────────
  const sortFolders = (folders) => {
    return [...folders].sort((a, b) => {
      const nameA = (a || "").trim();
      const nameB = (b || "").trim();

      // Assignment 1 and Assignment 2 first
      const assignmentA = nameA.match(/^Assignment\s+(\d+)/i);
      const assignmentB = nameB.match(/^Assignment\s+(\d+)/i);

      if (assignmentA && assignmentB) {
        return Number(assignmentA[1]) - Number(assignmentB[1]);
      }

      if (assignmentA) return -1;
      if (assignmentB) return 1;

      // Extract DD-MM-YYYY from folder name
      const dateA = nameA.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
      const dateB = nameB.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);

      // Date folders come before non-date folders
      if (dateA && dateB) {
        const dA = new Date(
          Number(dateA[3]),
          Number(dateA[2]) - 1,
          Number(dateA[1])
        );

        const dB = new Date(
          Number(dateB[3]),
          Number(dateB[2]) - 1,
          Number(dateB[1])
        );

        return dA - dB;
      }

      if (dateA) return -1;
      if (dateB) return 1;

      // Other folders alphabetically
      return nameA.localeCompare(nameB);
    });
  };
  const fetchFolders = async (token) => {

    try {

      const headingId = Number(sessionStorage.getItem("current_heading_id"));
      const menuId = Number(sessionStorage.getItem("current_menu_id"));

      const { data, error } = await supabase
        .from("folder_master")
        .select("id, foldername")
        .eq("main_heading_id", headingId)
        .eq("menu_id", menuId)
        .eq("status", "1")
        .order("id", { ascending: true });


      if (error) {
        console.log(error);
        foldersRef.current = [];
        return;
      }


      if (requestTokenRef.current !== token) return;


      const folders = (data || []).map((item) => ({
        id: Number(item.id),
        foldername: item.foldername || "",
      }));

      const sortedFolders = [...folders].sort((a, b) =>
        a.foldername.localeCompare(b.foldername)
      );

      foldersRef.current = sortedFolders;

      renderFolderTabs(
        sortedFolders,
        activeFolderRef.current,
        token
      );


    } catch (err) {

      console.log(err);
      foldersRef.current = [];

    }

  };
  const sortReports = (rows) => {
    return [...rows].sort((a, b) => {
      const aNum = a.name?.match(/^STUDY\s+(\d+)/i)?.[1];
      const bNum = b.name?.match(/^STUDY\s+(\d+)/i)?.[1];

      if (aNum && bNum) return Number(aNum) - Number(bNum);
      if (aNum) return -1;
      if (bNum) return 1;

      return 0;
    });
  };

  const fetchData = async (
    folder = "all",
    token
  ) => {


    if (requestTokenRef.current !== token)
      return;


    writeLoading();


    try {


      const headingId = Number(sessionStorage.getItem("current_heading_id"));
      const menuId = Number(sessionStorage.getItem("current_menu_id"));

      let query = supabase
        .from("datacollection")
        .select("*")
        .eq("status", 1)
        .eq("main_heading_id", headingId)
        .eq("menu_id", menuId);

      if (folder !== "all") {
        query = query.eq("folder_id", Number(folder));
      }



      const { data, error } = await query;


      if (error) {
        console.log(error);
        rowsRef.current = [];
      }
      else {

        const folderNames = new Map(
          (foldersRef.current || []).map((f) => [Number(f.id), f.foldername])
        );

        const mappedRows = (data || []).map((row) => ({
          ...row,
          foldername:
            folderNames.get(Number(row.folder_id)) || row.folder || "",
        }));

        rowsRef.current =
          sessionStorage.getItem("current_menu_name") === "Reports"
            ? sortReports(mappedRows)
            : mappedRows;

      }



      if (requestTokenRef.current !== token)
        return;


      requestAnimationFrame(() => {

        if (
          requestTokenRef.current === token &&
          tableRef.current
        ) {
          initDT(rowsRef.current);
        }

      });



    } catch (err) {

      console.log(err);
      rowsRef.current = [];

    }

  };

  // ── Mount / page prop change ──────────────────────────────────────────────
  useEffect(() => {
    if (!page) return;

    requestTokenRef.current += 1;
    const token = requestTokenRef.current;
    let cancelled = false;

    const initializePage = async () => {
      try {
        const headingId = Number(sessionStorage.getItem("current_heading_id"));
        const menuId = Number(sessionStorage.getItem("current_menu_id"));

        const accessibleHeadings = await getAccessibleHeadings();
        const headingAllowed = accessibleHeadings.some(
          (heading) => Number(heading.id) === headingId
        );

        if (!headingAllowed) {
          window.location.href = "/Railways/nr";
          return;
        }

        const accessibleMenus = await getAccessibleMenus(headingId);
        const menuAllowed = accessibleMenus.some(
          (menu) => Number(menu.id) === menuId
        );

        if (!menuAllowed) {
          window.location.href = "/Railways/nr";
          return;
        }

        if (cancelled || requestTokenRef.current !== token) return;

        const hf = getHF();
        const savedTab = sessionStorage.getItem("activeTab_" + page) || "all";
        activeFolderRef.current = savedTab;

        const tabWrapper = folderTabsRef.current?.parentElement;
        if (tabWrapper) tabWrapper.style.display = hf ? "" : "none";

        if (hf) {
          renderFolderTabs([], savedTab, token);
          fetchFolders(token);
        }

        fetchData(savedTab, token);
      } catch (error) {
        console.error("Access verification error:", error);
        if (!cancelled) window.location.href = "/Railways/nr";
      }
    };

    initializePage();

    const onOutside = (e) => {
      const toolbar = wrapperRef.current?.querySelector(".card-toolbar");
      if (toolbar && !toolbar.contains(e.target)) hideDropdown();
    };
    document.addEventListener("click", onOutside);

    return () => {
      cancelled = true;
      requestTokenRef.current += 1;
      document.removeEventListener("click", onOutside);
      destroyDT();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div
      key={page}
      id="kt_body"
      className="header-fixed header-tablet-and-mobile-fixed aside-fixed"
    >
      <div
        ref={wrapperRef}
        className="content d-flex flex-column flex-column-fluid fs-6"
        id="kt_content"
      >
        <div className="container-xxl" id="kt_content_container">
          <div style={{ display: "none" }}>
            <ul
              ref={folderTabsRef}
              className="nav nav-tabs nav-line-tabs nav-line-tabs-2x mb-5 fs-6 fw-bold"
            />
          </div>

          <div className="card card-flush">
            <div className="card-header d-flex flex-wrap align-items-center py-5 gap-3">
              <div className="card-title">
                <div className="d-flex align-items-center position-relative my-1">
                  <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-4">
                    <span className="path1" />
                    <span className="path2" />
                  </i>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="form-control form-control-solid w-455px ps-12"
                    placeholder="Search Report"
                  />
                </div>
                <div ref={exportContainerRef} className="d-none" />
              </div>

              <div className="card-toolbar d-flex flex-wrap justify-content-end gap-3 position-relative">
                <div className="w-200px">
                  <select
                    ref={statusSelectRef}
                    className="form-select form-select-solid"
                    defaultValue="all"
                  >
                    <option value="all">All</option>
                    <option value="img">IMG</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">DOC</option>
                    <option value="xls">XLS</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-light-success"
                  onClick={() => setShowWorkTodo(true)}
                  title="Record Work / Todo for this Main Heading / Menu"
                >
                  <i className="ki-duotone ki-check-square fs-2">
                    <span className="path1"></span>
                    <span className="path2"></span>
                  </i>
                  Work / Todo
                </button>

                <button
                  className="btn btn-light-primary"
                  onClick={toggleDropdown}
                >
                  <i className="ki-duotone ki-exit-up fs-2">
                    <span className="path1" />
                    <span className="path2" />
                  </i>
                  Export Report
                </button>

                <div
                  ref={exportDropdownRef}
                  className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-200px py-4"
                  style={{
                    display: "none",
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 10,
                    zIndex: 1000,
                  }}
                >
                  {[
                    ["copy", "Copy to clipboard"],
                    ["excel", "Export as Excel"],
                    ["csv", "Export as CSV"],
                    ["pdf", "Export as PDF"],
                  ].map(([type, label]) => (
                    <div className="menu-item px-3" key={type}>
                      <a href="#" className="menu-link px-3" data-export={type}>
                        {label}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-body pt-0">
              <table
                ref={tableRef}
                id={tableId(page)}
                className="table align-middle table-row-dashed fs-6 gy-5"
              >
                <thead />
                <tbody />
              </table>
            </div>
          </div>
        </div>
          {showWorkTodo && (
            <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-start justify-content-center"
              style={{ background: "rgba(0,0,0,.45)", zIndex: 1050, overflowY: "auto", padding: "40px 20px" }}
              onMouseDown={(e) => { if (e.target === e.currentTarget) setShowWorkTodo(false); }}>
              <div className="w-100" style={{ maxWidth: 1200 }}>
                <div style={{ width: "100%", maxWidth: 900, margin: "0 auto", boxSizing: "border-box", overflowX: "hidden" }}><WorkTracker embedded onClose={() => setShowWorkTodo(false)} /></div>
              </div>
            </div>
          )}
      </div>
      <Footer />
    </div>
  );
}
