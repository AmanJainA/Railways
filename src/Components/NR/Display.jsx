import React, { useEffect, useRef } from "react";
import $ from "jquery";
import JSZip from "jszip";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import Footer from "../Footer/Footer";

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
  ppt: { title: "Reports", hasFolders: false },
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
    if (!dtRef.current) return;
    try {
      dtRef.current.destroy(false);
    } catch (_) {}
    dtRef.current = null;
  };

  // ── Write thead imperatively so it always matches tbody column count ───────
  const writeThead = (hf) => {
    const table = tableRef.current;
    if (!table) return;
    let thead = table.querySelector("thead");
    if (!thead) {
      thead = document.createElement("thead");
      table.prepend(thead);
    }
    thead.innerHTML = `
      <tr class="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
        <th class="min-w-10px">#</th>
        <th class="min-w-100px">File Name</th>
        <th class="min-w-100px">File Type</th>
        ${hf ? `<th class="min-w-100px">Folder</th>` : ""}
        <th class="min-w-10px">Action</th>
      </tr>`;
  };

  // ── Write tbody rows imperatively ─────────────────────────────────────────
  const writeRows = (rows, hf) => {
    const table = tableRef.current;
    if (!table) return;
    let tbody = table.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      table.appendChild(tbody);
    }

    if (rows.length === 0) {
      tbody.innerHTML = `
        <tr>
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
      <tr>
        <td class="text-gray-900">${i + 1}</td>
        <td class="text-gray-900 text-hover-primary">${escapeHtml(row.name)}</td>
        <td>
          <div class="badge ${fileBadge(row.type)}">
            ${(row.type || "").toUpperCase()}
          </div>
        </td>
        ${
          hf
            ? `
        <td>
          <span class="badge badge-light-primary">
            <i class="ki-duotone ki-folder fs-7 me-1">
              <span class="path1"></span><span class="path2"></span>
            </i>
            ${escapeHtml(ucFirst(row.folder || ""))}
          </span>
        </td>`
            : ""
        }
        <td>
          <a href="/nr/viewer" class="viewer-link" data-file="${encodeURIComponent(row.links || "")}">
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
    const table = tableRef.current;
    if (!table) return;
    const tbody = table.querySelector("tbody");
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td colspan="${hf ? 5 : 4}" class="text-center py-10">
          <span class="spinner-border spinner-border-sm text-primary me-2"></span>
          Loading...
        </td>
      </tr>`;
  };

  // ── Init DataTable ────────────────────────────────────────────────────────
  const initDT = (rows) => {
    const hf = getHF();
    const pageTitle = getTitle();

    destroyDT();

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
      destroy: false,
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

    const makeTab = (label, folder, iconClass) => {
      const li = document.createElement("li");
      li.className = "nav-item";
      const a = document.createElement("a");
      a.href = "#";
      a.className = `nav-link${folder === active ? " active" : ""}`;
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
        activeFolderRef.current = folder;
        sessionStorage.setItem("activeTab_" + page, folder);
        fetchData(folder, token);
      };
      li.appendChild(a);
      return li;
    };

    ul.appendChild(makeTab("All", "all", "ki-folder-open"));
    folders.forEach((f) => ul.appendChild(makeTab(f, f, "ki-folder")));
  };

  // ── Data fetching — every call is stamped with `token` and checks it
  //    against requestTokenRef.current before mutating anything. If the
  //    effect has moved on (page changed) by the time the network call
  //    resolves, the result is silently discarded instead of corrupting
  //    the table that now belongs to a different page. ───────────────────
  const fetchFolders = async (token) => {
    try {
      const res = await fetch("https://samrat.cu.ma/api_data.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ page, type: "folders" }),
        credentials: "include",
      });
      const data = await res.json();
      if (requestTokenRef.current !== token) return; // stale — ignore
      foldersRef.current = Array.isArray(data) ? data : [];
    } catch {
      if (requestTokenRef.current !== token) return;
      foldersRef.current = [];
    }
    if (requestTokenRef.current !== token) return;
    renderFolderTabs(foldersRef.current, activeFolderRef.current, token);
  };

  const fetchData = async (folder = "all", token) => {
    if (requestTokenRef.current !== token) return; // already superseded
    writeLoading();
    destroyDT();
    try {
      const res = await fetch("https://samrat.cu.ma/api_data.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ page, type: "data", folder }),
        credentials: "include",
      });
      const data = await res.json();
      if (requestTokenRef.current !== token) return; // stale — ignore
      rowsRef.current = Array.isArray(data) ? data : [];
    } catch {
      if (requestTokenRef.current !== token) return;
      rowsRef.current = [];
    }
    requestAnimationFrame(() => {
      if (requestTokenRef.current !== token) return; // stale — ignore
      initDT(rowsRef.current);
    });
  };

  // ── Mount / page prop change ──────────────────────────────────────────────
  useEffect(() => {
    if (!page) return;

    // New token for this effect run. Any pending fetch from a previous
    // page that resolves after this point will see a mismatched token
    // and bail out before touching refs or the DOM.
    requestTokenRef.current += 1;
    const token = requestTokenRef.current;

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

    const onOutside = (e) => {
      const toolbar = wrapperRef.current?.querySelector(".card-toolbar");
      if (toolbar && !toolbar.contains(e.target)) hideDropdown();
    };
    document.addEventListener("click", onOutside);

    return () => {
      document.removeEventListener("click", onOutside);
      destroyDT(); // must happen BEFORE React removes <table> from DOM
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
      </div>
      <Footer />
    </div>
  );
}
