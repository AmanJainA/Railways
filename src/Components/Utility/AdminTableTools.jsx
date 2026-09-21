import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

try {
  pdfMake.vfs = pdfFonts?.vfs || pdfFonts;
} catch (e) {
  // PDF export will show a browser alert if the font bundle is unavailable.
}

export const useAdminTable = (rows, searchableFields = []) => {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      searchableFields.some((field) =>
        String(row?.[field] ?? "").toLowerCase().includes(q)
      )
    );
  }, [rows, search, searchableFields]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  return {
    search,
    setSearch,
    pageSize,
    setPageSize,
    page,
    setPage,
    pageCount,
    filteredRows,
    visibleRows,
  };
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportCopy = async (headers, rows) => {
  const text = [headers, ...rows]
    .map((row) => row.map((v) => String(v ?? "")).join("\t"))
    .join("\n");
  await navigator.clipboard.writeText(text);
};

export const exportExcel = (headers, rows, filename) => {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : filename + ".xlsx");
};

export const exportPdf = (headers, rows, filename) => {
  const body = [headers, ...rows].map((row) =>
    row.map((value) => String(value ?? ""))
  );
  pdfMake
    .createPdf({
      pageOrientation: headers.length > 5 ? "landscape" : "portrait",
      pageMargins: [24, 28, 24, 28],
      content: [
        { text: filename.replace(/\.[^.]+$/, ""), style: "title" },
        {
          table: { headerRows: 1, widths: Array(headers.length).fill("*"), body },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        title: { fontSize: 15, bold: true, margin: [0, 0, 0, 12] },
      },
      defaultStyle: { fontSize: 8 },
    })
    .download(filename.endsWith(".pdf") ? filename : filename + ".pdf");
};

export const exportWord = (headers, rows, filename) => {
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const table = `
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;font-family:Arial;font-size:10pt">
      <thead><tr>${headers.map((h) => `<th style="background:#f2f2f2">${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
  const html = `<html><head><meta charset="utf-8"></head><body><h2>${esc(filename)}</h2>${table}</body></html>`;
  downloadBlob(new Blob(["\\ufeff", html], { type: "application/msword" }), filename.endsWith(".doc") ? filename : filename + ".doc");
};

export const AdminTableToolbar = ({
  table,
  headers,
  getRows,
  filename,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const rows = getRows(table.filteredRows);

  const doExport = async (type) => {
    try {
      if (type === "copy") {
        await exportCopy(headers, rows);
      } else if (type === "excel") {
        exportExcel(headers, rows, filename);
      } else if (type === "pdf") {
        exportPdf(headers, rows, filename);
      } else {
        exportWord(headers, rows, filename);
      }
    } catch (error) {
      window.alert(error?.message || "Export failed.");
    }
    setExportOpen(false);
  };

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-4 border-bottom">
      <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ maxWidth: 560 }}>
        <div className="position-relative flex-grow-1">
          <i className="ki-duotone ki-magnifier position-absolute top-50 translate-middle-y ms-4 fs-4">
            <span className="path1"></span><span className="path2"></span>
          </i>
          <input
            type="search"
            className="form-control form-control-solid ps-12"
            placeholder="Search..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        </div>
        <label className="d-flex align-items-center gap-2 text-muted text-nowrap mb-0">
          <span>Show</span>
          <select
            className="form-select form-select-sm w-auto"
            value={table.pageSize}
            onChange={(e) => setPageSizeValue(table, e.target.value)}
          >
            {[10, 20, 50, 100, 500].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>rows</span>
        </label>
      </div>

      <div className="position-relative">
        <button type="button" className="btn btn-light-primary" onClick={() => setExportOpen((v) => !v)}>
          <i className="ki-duotone ki-exit-up fs-4 me-2"><span className="path1"></span><span className="path2"></span></i>
          Export Report
        </button>
        {exportOpen && (
          <div className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-800 menu-state-bg-light-primary fw-semibold py-3 position-absolute end-0 mt-2 show" style={{ zIndex: 20, minWidth: 150 }}>
            {[
              ["copy", "Copy to clipboard"],
              ["excel", "Export as Excel"],
              ["pdf", "Export as PDF"],
              ["word", "Export as Word"],
            ].map(([key, label]) => (
              <button key={key} type="button" className="menu-item px-5 py-2 border-0 bg-transparent text-start w-100" onClick={() => doExport(key)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const setPageSizeValue = (table, value) => table.setPageSize(Number(value));

export const AdminTableFooter = ({ table }) => {
  const start = table.filteredRows.length ? (table.page - 1) * table.pageSize + 1 : 0;
  const end = Math.min(table.page * table.pageSize, table.filteredRows.length);

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 px-5 py-4 border-top">
      <span className="text-muted fs-7">
        Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{table.filteredRows.length}</strong> entries
      </span>
      <div className="d-flex align-items-center gap-1">
        <button type="button" className="btn btn-sm btn-light" disabled={table.page <= 1} onClick={() => table.setPage((p) => p - 1)}>Previous</button>
        <span className="px-3 text-muted fs-7">Page {table.page} of {table.pageCount}</span>
        <button type="button" className="btn btn-sm btn-light" disabled={table.page >= table.pageCount} onClick={() => table.setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
};
