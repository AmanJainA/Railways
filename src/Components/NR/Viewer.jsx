import React, { useEffect, useState, useRef } from "react";
import "./Viewer.css";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

// PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function Viewer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canvasRef = useRef();
  const pdfRef = useRef();
  const excelRef = useRef();
  const docxRef = useRef();
  const pptRef = useRef();

  // Excel specific refs
  const xlBodyRef = useRef();
  const xlColHeaderRef = useRef();
  const xlTabBarRef = useRef();
  const xlNameBoxRef = useRef();
  const xlFxValRef = useRef();

  const rawFileParam = sessionStorage.getItem("viewer_file");

  const normalizeSharePointUrl = (url) => {
    if (!url) return "";

    try {
      let decoded = decodeURIComponent(url).trim();

      // remove old params
      decoded = decoded.split("?")[0];

      // detect office file
      const isPpt =
        decoded.includes(":p:/") || decoded.toLowerCase().includes(".ppt");
      const isExcel =
        decoded.includes(":x:/") || decoded.toLowerCase().includes(".xlsx");
      const isWord =
        decoded.includes(":w:/") || decoded.toLowerCase().includes(".docx");

      // add embed params
      if (decoded.includes("sharepoint.com")) {
        if (isPpt || isExcel || isWord) {
          return decoded + "?web=1";
        }
      }

      return decoded;
    } catch (err) {
      console.error(err);
      return url;
    }
  };

  const fileParam = normalizeSharePointUrl(rawFileParam);
  const isSharePointFile =
    /^https?:\/\//i.test(fileParam) &&
    (fileParam.includes("sharepoint.com") ||
      fileParam.includes("onedrive.live.com"));
  const cleanBase64 = (data = "") =>
    data.includes(",") ? data.split(",")[1] : data.replace(/\s/g, "");

  const ext = (file?.ext || "").toLowerCase();
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
  const docExts = ["doc", "docx"];
  const excelExts = ["xls", "xlsx"];
  const pptExts = ["ppt", "pptx"];

  /* ================= FETCH FILE ================= */
  useEffect(() => {
    if (!fileParam) return;

    // =========================
    // SHAREPOINT DIRECT VIEWER
    // =========================
    if (isSharePointFile) {
  let spUrl = fileParam;

  spUrl = spUrl.replace(/[?&]download=1/g, "");
  spUrl = spUrl.replace(/[?&]web=0/g, "");

  if (spUrl.includes("?")) {
    spUrl += "&web=1&download=0";
  } else {
    spUrl += "?web=1&download=0";
  }

  // 🚀 DIRECT OPEN (no viewer, no popup)
  window.location.replace(spUrl);
  return;
}

    // =========================
    // LOCAL FILE FETCH
    // =========================
    fetch(
      `http://localhost/ext/API/getFile.php?file=${encodeURIComponent(fileParam)}`,
    )
      .then((res) => res.json())
      .then((data) => {
        data.ext = (data.ext || getExtensionFromUrl(fileParam))
          .toString()
          .trim()
          .toLowerCase();

        setFile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to fetch file data");
        setLoading(false);
      });
  }, [fileParam, isSharePointFile]);

  const getExtensionFromUrl = (url) => {
    try {
      const cleanUrl = url.split("?")[0];

      const ext = cleanUrl.split(".").pop()?.toLowerCase();

      return ext || "";
    } catch {
      return "";
    }
  };
  /* ================= 🔒 PROTECTION ================= */
  useEffect(() => {
    const disableRightClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const disableKeys = (e) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.key === "F12" ||
        e.key === "PrintScreen" ||
        (e.key.startsWith("F") && !isNaN(e.key[1]))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const disableEvents = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    document.addEventListener("contextmenu", disableRightClick, true);
    document.addEventListener("keydown", disableKeys, true);
    ["copy", "cut", "paste", "dragstart", "print"].forEach((ev) => {
      document.addEventListener(ev, disableEvents, true);
    });

    // DevTools detection
    const interval = setInterval(() => {
      if (
        window.outerWidth - window.innerWidth > 160 ||
        window.outerHeight - window.innerHeight > 160
      ) {
        // In a real app, you might want to redirect or show a block screen
        // For now, we just log it or could set a state
      }
    }, 1000);

    return () => {
      document.removeEventListener("contextmenu", disableRightClick, true);
      document.removeEventListener("keydown", disableKeys, true);
      ["copy", "cut", "paste", "dragstart", "print"].forEach((ev) => {
        document.removeEventListener(ev, disableEvents, true);
      });
      clearInterval(interval);
    };
  }, []);

  /* ================= IMAGE ================= */
  useEffect(() => {
    if (!file || file?.isSharePoint || !imageExts.includes(ext)) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;

    const img = new Image();
    img.onload = () => {
      const maxWidth = window.innerWidth * 0.9;
      const scale = Math.min(1, maxWidth / img.width);

      const cssW = Math.round(img.width * scale);
      const cssH = Math.round(img.height * scale);

      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";

      ctx.scale(dpr, dpr);
      ctx.drawImage(img, 0, 0, cssW, cssH);
    };
    img.src = `data:image/${ext === "svg" ? "svg+xml" : ext};base64,${cleanBase64(file.data)}`;
  }, [file, ext]);

  /* ================= PDF ================= */
  useEffect(() => {
    if (!file || file?.isSharePoint || ext !== "pdf") return;

    let isMounted = true;
    const container = pdfRef.current;

    const loadPdf = async () => {
      try {
        const raw = atob(cleanBase64(file.data));
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (!isMounted) return;

        container.innerHTML = "";
        const dpr = window.devicePixelRatio || 1;

        for (let i = 1; i <= pdf.numPages; i++) {
          if (!isMounted) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          canvas.style.width = viewport.width + "px";
          canvas.style.height = viewport.height + "px";
          canvas.style.display = "block";
          canvas.style.marginBottom = "20px";
          canvas.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";

          container.appendChild(canvas);
          ctx.scale(dpr, dpr);

          await page.render({
            canvasContext: ctx,
            viewport,
          }).promise;
        }
      } catch (err) {
        console.error("PDF error:", err);
      }
    };

    loadPdf();
    return () => {
      isMounted = false;
    };
  }, [file, ext]);

  /* ================= EXCEL ================= */
  useEffect(() => {
    if (!file || file?.isSharePoint || !excelExts.includes(ext)) return;

    const loadExcel = async () => {
      try {
        const binary = atob(cleanBase64(file.data));
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
          buffer[i] = binary.charCodeAt(i);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const bodyWrap = xlBodyRef.current;
        const colHeaderEl = xlColHeaderRef.current;
        const tabBar = xlTabBarRef.current;
        const nameBox = xlNameBoxRef.current;
        const fxVal = xlFxValRef.current;
        let selCell = null;

        const colLabel = (n) => {
          let s = "";
          while (n > 0) {
            s = String.fromCharCode(64 + (n % 26 || 26)) + s;
            n = Math.floor((n - 1) / 26);
          }
          return s;
        };

        const argbToCSS = (argb) => {
          if (!argb || argb === "FF000000" || argb === "00000000") return null;
          if (argb.length === 8) {
            const a = parseInt(argb.slice(0, 2), 16) / 255;
            const r = parseInt(argb.slice(2, 4), 16);
            const g = parseInt(argb.slice(4, 6), 16);
            const b = parseInt(argb.slice(6, 8), 16);
            return `rgba(${r},${g},${b},${a.toFixed(2)})`;
          }
          return argb.length === 6 ? "#" + argb : null;
        };

        const borderStyle = (b) => {
          if (!b || !b.style) return "";
          const col = b.color?.argb ? argbToCSS(b.color.argb) : "#000";
          const styleMap = {
            thin: "1px solid",
            medium: "2px solid",
            thick: "3px solid",
          };
          return (styleMap[b.style] || "1px solid") + " " + (col || "#000");
        };

        const formatValue = (cell) => {
          if (cell.value === null || cell.value === undefined) return "";
          if (cell.text !== undefined && cell.text !== "") return cell.text;
          const v = cell.value;
          if (typeof v === "object" && v !== null) {
            if (v instanceof Date) return v.toLocaleDateString();
            if (v.richText) return v.richText.map((rt) => rt.text).join("");
            if (v.formula !== undefined)
              return v.result !== undefined ? String(v.result) : "";
            return String(v);
          }
          return String(v);
        };

        const renderSheet = (sheet) => {
          bodyWrap.innerHTML = "";
          colHeaderEl.innerHTML = '<div class="xl-corner"></div>';

          let maxCol = 0;
          sheet.eachRow({ includeEmpty: false }, (row, rn) => {
            row.eachCell({ includeEmpty: false }, (cell, cn) => {
              if (cn > maxCol) maxCol = cn;
            });
          });

          const colWidths = [];
          for (let c = 1; c <= maxCol; c++) {
            const cw = Math.round((sheet.getColumn(c).width || 9) * 8);
            colWidths.push(cw);
            const th = document.createElement("div");
            th.className = "xl-col-th";
            th.style.width = cw + "px";
            th.textContent = colLabel(c);
            colHeaderEl.appendChild(th);
          }

          const frag = document.createDocumentFragment();
          sheet.eachRow({ includeEmpty: true }, (row, rn) => {
            const rowDiv = document.createElement("div");
            rowDiv.className = "xl-row";
            const rh = Math.round((row.height || 20) * 1.3);

            const rowNum = document.createElement("div");
            rowNum.className = "xl-row-num";
            rowNum.style.height = rh + "px";
            rowNum.textContent = rn;
            rowDiv.appendChild(rowNum);

            for (let c = 1; c <= maxCol; c++) {
              const cell = row.getCell(c);
              const td = document.createElement("div");
              td.className = "xl-cell";
              const cw = colWidths[c - 1];
              td.style.width = cw + "px";
              td.style.height = rh + "px";

              // Styles
              const style = cell.style || {};
              if (style.fill?.fgColor?.argb) {
                const bg = argbToCSS(style.fill.fgColor.argb);
                if (bg) td.style.background = bg;
              }
              if (style.font) {
                if (style.font.bold) td.style.fontWeight = "bold";
                if (style.font.color?.argb)
                  td.style.color = argbToCSS(style.font.color.argb);
              }

              const val = formatValue(cell);
              td.textContent = val;
              const addr = colLabel(c) + rn;

              td.onclick = () => {
                if (selCell) selCell.style.outline = "";
                td.style.outline = "2px solid #1a73e8";
                selCell = td;
                nameBox.textContent = addr;
                fxVal.textContent = cell.formula ? "=" + cell.formula : val;
              };
              rowDiv.appendChild(td);
            }
            frag.appendChild(rowDiv);
          });
          bodyWrap.appendChild(frag);
        };

        tabBar.innerHTML = "";
        workbook.eachSheet((sheet, id) => {
          const tab = document.createElement("div");
          tab.className = "xl-tab" + (id === 1 ? " active" : "");
          tab.textContent = sheet.name;
          tab.onclick = () => {
            document
              .querySelectorAll(".xl-tab")
              .forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            renderSheet(sheet);
          };
          tabBar.appendChild(tab);
        });

        if (workbook.worksheets.length > 0) renderSheet(workbook.worksheets[0]);
      } catch (err) {
        console.error("Excel error:", err);
      }
    };

    loadExcel();
  }, [file, ext]);

  /* ================= DOCX ================= */
  useEffect(() => {
    if (!file || !docExts.includes(ext)) return;

    const loadDocx = async () => {
      try {
        const binary = atob(cleanBase64(file.data));
        const buffer = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++)
          buffer[i] = binary.charCodeAt(i);

        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        const page = docxRef.current;
        page.innerHTML = result.value;

        // Clean up
        page.querySelectorAll("a").forEach((a) => {
          a.removeAttribute("href");
          a.style.pointerEvents = "none";
        });
      } catch (err) {
        console.error("DOCX error:", err);
      }
    };

    loadDocx();
  }, [file, ext]);

  /* ================= PPTX ================= */
  useEffect(() => {
    if (!file || !pptExts.includes(ext)) return;

    const loadPptx = async () => {
      try {
        const binary = atob(cleanBase64(file.data));
        const u8 = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);

        const zip = await JSZip.loadAsync(u8);
        const parser = new DOMParser();
        const container = pptRef.current;
        container.innerHTML = "";

        // Very basic PPTX to HTML logic (simplified for React)
        // In a real scenario, we'd port the full XML parser from the PHP version
        const presXml = await zip.file("ppt/presentation.xml").async("string");
        const presDoc = parser.parseFromString(presXml, "text/xml");
        const slideIds = presDoc.querySelectorAll("sldId");

        for (let i = 0; i < slideIds.length; i++) {
          const slidePath = `ppt/slides/slide${i + 1}.xml`;
          const slideXml = await zip.file(slidePath).async("string");
          const slideDoc = parser.parseFromString(slideXml, "text/xml");

          const slideDiv = document.createElement("div");
          slideDiv.className = "ppt-slide";
          slideDiv.style.width = "800px";
          slideDiv.style.height = "450px";
          slideDiv.style.background = "#fff";
          slideDiv.style.position = "relative";
          slideDiv.style.marginBottom = "30px";
          slideDiv.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";

          // Basic text extraction for the slide
          const texts = slideDoc.querySelectorAll("t");
          texts.forEach((t) => {
            const span = document.createElement("span");
            span.textContent = t.textContent;
            span.style.position = "absolute";
            // Random positioning for demo if no layout logic
            slideDiv.appendChild(span);
          });

          container.appendChild(slideDiv);
        }
      } catch (err) {
        console.error("PPTX error:", err);
      }
    };

    loadPptx();
  }, [file, ext]);

  if (loading) return <div className="loader">Loading...</div>;
  if (error) return <div className="error-screen">{error}</div>;
  if (!file) return <div>Error loading file</div>;

  const isPdf = ext === "pdf";
  const isImage = imageExts.includes(ext);
  const isExcel = excelExts.includes(ext);
  const isDocx = docExts.includes(ext);
  const isPpt = pptExts.includes(ext);

  return (
    <div className="viewer-container">
      <header className="viewer-header-bar">
        <span className={`ext-badge ${ext}`}>{ext.toUpperCase()}</span>
        <span className="file-name">{file.name}</span>
        <span className="lock-label">🔒 VIEW ONLY</span>
      </header>

      <main>
        {isImage && <canvas ref={canvasRef} id="img-canvas"></canvas>}

        
        {isPdf && <div ref={pdfRef} id="pdf-scroller"></div>}

        {isExcel && (
          <div id="excel-wrap">
            <div id="xl-formulabar">
              <div id="xl-namebox" ref={xlNameBoxRef}>
                A1
              </div>
              <div id="xl-fxlabel">
                <i>f</i>x
              </div>
              <div id="xl-formulaval" ref={xlFxValRef}></div>
            </div>
            <div id="xl-grid-area">
              <div id="xl-col-header-wrap">
                <div id="xl-col-header" ref={xlColHeaderRef}></div>
              </div>
              <div id="xl-body-wrap" ref={xlBodyRef}></div>
            </div>
            <div id="xl-tab-bar" ref={xlTabBarRef}></div>
          </div>
        )}

        {isDocx && (
          <div id="docx-scroller">
            <div id="docx-page" ref={docxRef}></div>
          </div>
        )}

        {isPpt && <div id="ppt-scroller" ref={pptRef}></div>}
      </main>

      <footer>🔒 This document is protected — view only.</footer>
    </div>
  );
}
