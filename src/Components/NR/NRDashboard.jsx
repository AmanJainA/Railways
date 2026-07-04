import React, { useEffect, useState } from "react";
import ApexCharts from "react-apexcharts";
import "./NRDashboard.css";
import { useNavigate } from "react-router-dom";
import Footer from "../Footer/Footer";

export default function NRDashboard() {
  const navigateToMenu = (menuName) => {
  const slug = menuName.toLowerCase().replace(/\s+/g, "");

  // Save selected page
  localStorage.setItem("current_page", slug);

  navigate("/nr/display");
};
  const [data, setData] = useState({
    menuData: [],
    typeData: [],
    recentFiles: [],
    folderData: [],
  });
  const navigate = useNavigate();
  useEffect(() => {
    fetch("https://samrat.cu.ma/nrdashboard.php")
      .then((res) => res.json())
      .then((res) => setData(res));
  }, []);

  const grandTotal = data.menuData.reduce((a, b) => a + Number(b.total), 0);

  // 🎯 CATEGORY MAP (same as PHP)
  const categoryMap = {
    Letter: { color: "info", icon: "ki-sms" },
    Meeting: { color: "warning", icon: "ki-calendar" },
    "Study Data": { color: "success", icon: "ki-book" },
    Reports: { color: "warning", icon: "ki-slider-horizontal" },
    "Visit Data": { color: "primary", icon: "ki-geolocation" },
    "Dashboard Design": { color: "danger", icon: "ki-chart-pie-4" },
    Policy: { color: "dark", icon: "ki-shield-tick" },
    Questions: { color: "info", icon: "ki-question-2" },
    "Research Paper": { color: "success", icon: "ki-document" },
    Summarization: { color: "primary", icon: "ki-notepad" },
    Format: { color: "danger", icon: "ki-text-align-left" },
  };

  // 🎯 FILE TYPE COLORS
  const fileColors = {
    pdf: "danger",
    doc: "primary",
    docx: "primary",
    xls: "success",
    xlsx: "success",
    ppt: "info",
    pptx: "info",
    png: "warning",
    jpg: "warning",
    jpeg: "warning",
  };

  // =========================
  // 📊 DONUT CHART (FULL)
  // =========================
  const donutOptions = {
    labels: data.typeData.map((t) => t.type?.toUpperCase() || "OTHER"),
    chart: { type: "donut" },
    colors: ["#e74c3c", "#3498db", "#27ae60", "#f39c12", "#9b59b6", "#1abc9c"],
    plotOptions: {
      pie: {
        donut: {
          size: "60%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              formatter: function (w) {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              },
            },
          },
        },
      },
    },
    legend: { position: "bottom" },
    dataLabels: { enabled: false },
    tooltip: {
      y: {
        formatter: (v) => v + " files",
      },
    },
  };

  const donutSeries = data.typeData.map((t) => Number(t.total));

  // =========================
  // 📊 BAR CHART (FULL)
  // =========================
  const barOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "55%",
        distributed: true,
      },
    },
    colors: ["#1b84ff", "#17c653", "#f6c000", "#d9214e", "#7239ea"],
    dataLabels: {
      enabled: true,
      offsetY: -18,
    },
    xaxis: {
      categories: data.menuData.map((m) =>
        m.menuname.length > 10 ? m.menuname.substring(0, 10) + "…" : m.menuname,
      ),
    },
    tooltip: {
      y: {
        formatter: (v) => v + " files",
      },
    },
  };

  const barSeries = [
    {
      name: "Files",
      data: data.menuData.map((m) => Number(m.total)),
    },
  ];

  return (
    <div
      id="kt_body"
      className="header-fixed header-tablet-and-mobile-fixed aside-fixed"
    >
      <div
        className="content d-flex flex-column flex-column-fluid fs-6"
        id="kt_content"
      >
        <div className="nr-dashboard container-xxl mt-5">
          <div className="rail-strip mt-5"></div>
          {/* HERO */}
          <div className="nr-hero mb-5">
            <div className="row align-items-center g-4">
              <div className="col-lg-6">
                <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                  <span className="badge bg-success text-white px-3 py-2 fs-8 fw-bold">
                    <i className="bi bi-train-front me-1 text-dark"></i>Northern
                    Railway
                  </span>
                  <span className="badge bg-primary text-white px-3 py-2 fs-8">
                    Document Portal
                  </span>
                </div>

                <h1 className="nr-hero-title">Northern Railway Data Dashboard</h1>
                <p className="nr-hero-sub">
                  Central repository for all Northern Railway documents, reports
                  &amp; data files.
                </p>

                <div className="d-flex gap-3 mt-4 flex-wrap">
                  <button
                   onClick={() => navigateToMenu("Study Data")}
                    className="btn btn-sm btn-primary px-4"
                  >
                    <i className="ki-duotone ki-book me-1 fs-5">
                      <span className="path1"></span>
                      <span className="path2"></span>
                    </i>
                    Study Data
                  </button>

                  <button
                    onClick={() => navigateToMenu("Meeting")}
                    className="btn btn-sm btn-light-success px-4"
                  >
                    <i className="ki-duotone ki-calendar me-1 fs-5">
                      <span className="path1"></span>
                      <span className="path2"></span>
                    </i>
                    Meetings
                  </button>

                  <button
                    onClick={() => navigateToMenu("Policy")}
                    className="btn btn-sm btn-light-dark px-4"
                  >
                    <i className="ki-duotone ki-shield-tick me-1 fs-5">
                      <span className="path1"></span>
                      <span className="path2"></span>
                    </i>
                    Policies
                  </button>
                </div>
              </div>

              <div className="col-lg-6">
                <div className="row g-3 justify-content-lg-end">
                  <div className="col-auto">
                    <div className="nr-hero-stat">
                      <span className="val">{grandTotal}</span>
                      <span className="lbl">Total Files</span>
                    </div>
                  </div>

                  <div className="col-auto">
                    <div className="nr-hero-stat">
                      <span className="val">{data.menuData.length}</span>
                      <span className="lbl">Categories</span>
                    </div>
                  </div>

                  <div className="col-auto">
                    <div className="nr-hero-stat">
                      <span className="val">{data.typeData.length}</span>
                      <span className="lbl">File Types</span>
                    </div>
                  </div>

                  <div className="col-auto">
                    <div className="nr-hero-stat">
                      <span className="val">
                        {data.folderData?.length || 0}
                      </span>
                      <span className="lbl">Folders</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between mb-4">
            <h3 className="fw-bold fs-4 mb-0">
              <i className="ki-duotone ki-category fs-2 me-2 text-primary">
                <span className="path1"></span>
                <span className="path2"></span>
                <span className="path3"></span>
                <span className="path4"></span>
              </i>
              Browse by Category
            </h3>
            <span className="text-muted fs-7">
              {data.menuData.length} active categories
            </span>
          </div>
          <div className="row g-4 mb-5">
            {data.menuData?.map((menu, i) => {
              const pct = grandTotal
                ? Math.round((menu.total / grandTotal) * 100)
                : 0;

              const cat = categoryMap[menu.menuname] || {
                color: "primary",
                icon: "ki-folder",
              };

              return (
                <div className="col-6 col-md-4 col-lg-3" key={i}>
                  <div
    className="nr-cat-card"
    onClick={() => navigateToMenu(menu.menuname)}
    style={{ cursor: "pointer" }}
>
                    <div className="d-flex justify-content-between align-items-start">
                      {/* ICON */}
                      <div className={`cat-icon bg-light-${cat.color}`}>
                        <i
                          className={`ki-duotone ${cat.icon} fs-2 text-${cat.color}`}
                        >
                          <span className="path1"></span>
                          <span className="path2"></span>
                          <span className="path3"></span>
                          <span className="path4"></span>
                        </i>
                      </div>

                      {/* ARROW */}
                      <span className={`cat-arrow text-${cat.color}`}>
                        <i className="ki-duotone ki-arrow-right fs-5">
                          <span className="path1"></span>
                          <span className="path2"></span>
                        </i>
                      </span>
                    </div>

                    <span className="cat-count">{menu.total}</span>
                    <span className="cat-name">{menu.menuname}</span>

                    <div className="nr-prog mt-2">
                      <div
                        className={`nr-prog-bar bg-${cat.color}`}
                        style={{ width: pct + "%" }}
                      ></div>
                    </div>

                    <small>{pct}% of total</small>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CHARTS */}
          <div className="row g-5 mb-8">
            <div className="col-lg-5">
              <div className="chart-card h-100">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h4 className="fw-bold fs-5 mb-0">File Type Distribution</h4>
                  <span className="badge badge-light-primary">
                    {" "}
                    {grandTotal} files
                  </span>
                </div>
                <div className="card-body p-5">
                  <ApexCharts
                    options={donutOptions}
                    series={donutSeries}
                    type="donut"
                    height={280}
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="chart-card h-100">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h4 className="fw-bold fs-5 mb-0">Files per Category</h4>
                  <span className="badge badge-light-success">
                    {" "}
                    {grandTotal} total
                  </span>
                </div>
                <div className="card-body p-5">
                  <ApexCharts
                    options={barOptions}
                    series={barSeries}
                    type="bar"
                    height={280}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* TOP FOLDERS */}
          <div className="row g-5 mb-8">
            <div className="col-lg-4">
              <div className="chart-card h-100">
                <div className="card-header">
                  <h4 className="fw-bold fs-5 mb-0">
                    <i className="ki-duotone ki-folder fs-3 me-2 text-warning">
                      <span className="path1"></span>
                      <span className="path2"></span>
                    </i>
                    Top Folders
                  </h4>
                </div>
                <div className="card-body p-5">
                  {data.folderData?.map((f, i) => {
                    const max = Math.max(
                      ...data.folderData.map((x) => Number(x.total)),
                    );

                    const fpct = max
                      ? Math.round((Number(f.total) / max) * 100)
                      : 0;

                    // Dynamic color rotation
                    const colors = [
                      "primary",
                      "success",
                      "warning",
                      "danger",
                      "info",
                    ];

                    const c = colors[i % colors.length];

                    return (
                      <div key={i} className="d-flex align-items-center mb-4">
                        {/* ICON */}
                        <div className="symbol symbol-35px me-3">
                          <span className={`symbol-label bg-light-${c}`}>
                            <i
                              className={`ki-duotone ki-folder fs-3 text-${c}`}
                            >
                              <span className="path1"></span>
                              <span className="path2"></span>
                            </i>
                          </span>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between mb-1">
                            <span className="fw-semibold fs-7">
                              {f.menuname
                                ?.toLowerCase()
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </span>

                            <span className={`badge badge-light-${c} fs-8`}>
                              {f.total}
                            </span>
                          </div>

                          {/* PROGRESS */}
                          <div className="nr-prog">
                            <div
                              className={`nr-prog-bar bg-${c}`}
                              style={{ width: `${fpct}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RECENT FILES */}
            <div className="col-lg-8">
              <div className="chart-card h-100">
                {/* HEADER */}
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h4 className="fw-bold fs-5 mb-0">
                    <i className="ki-duotone ki-time fs-3 me-2 text-primary">
                      <span className="path1"></span>
                      <span className="path2"></span>
                    </i>
                    Recently Added Files
                  </h4>
                  <span className="text-muted fs-8">Latest 10</span>
                </div>

                {/* BODY */}
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-row-dashed table-hover align-middle fs-7 mb-0">
                      {/* TABLE HEAD */}
                      <thead>
                        <tr className="text-muted fw-bold fs-8 text-uppercase gs-0 bg-light">
                          <th className="ps-5 w-30px">#</th>
                          <th>File Name</th>
                          <th>Category</th>
                          <th>Type</th>
                          <th className="pe-5 text-end">View</th>
                        </tr>
                      </thead>

                      {/* TABLE BODY */}
                      <tbody>
                        {data.recentFiles?.length === 0 ? (
                          <tr>
                            <td
                              colSpan="5"
                              className="text-center text-muted py-10"
                            >
                              No files yet.
                            </td>
                          </tr>
                        ) : (
                          data.recentFiles?.map((file, i) => {
                            const ext = file.type?.toLowerCase() || "file";

                            const fileColorsMap = {
                              pdf: "danger",
                              doc: "primary",
                              docx: "primary",
                              xls: "success",
                              xlsx: "success",
                              ppt: "warning",
                              pptx: "warning",
                              png: "info",
                              jpg: "info",
                              jpeg: "info",
                            };

                            const color = fileColorsMap[ext] || "secondary";

                            return (
                              <tr key={i}>
                                {/* INDEX */}
                                <td className="ps-5 text-muted">{i + 1}</td>

                                {/* FILE NAME */}
                                <td>
                                  <div className="d-flex align-items-center gap-3">
                                    {/* ICON */}
                                    <div
                                      className={`rf-icon bg-light-${color}`}
                                    >
                                      <span className={`text-${color} fw-bold`}>
                                        {ext.toUpperCase().slice(0, 3)}
                                      </span>
                                    </div>

                                    {/* NAME */}
                                    <span
                                      className="fw-semibold text-gray-800"
                                      style={{
                                        maxWidth: "200px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                      title={file.name}
                                    >
                                      {file.name?.substring(0, 30) || "Unnamed"}
                                    </span>
                                  </div>
                                </td>

                                {/* CATEGORY */}
                                <td>
                                  <span className={`badge bg-light-${color}`}>
                                    {file.menuname}
                                  </span>
                                </td>

                                {/* TYPE */}
                                <td>
                                  <span className={`badge bg-light-${color}`}>
                                    {file.type?.toUpperCase()}
                                  </span>
                                </td>

                                {/* VIEW BUTTON */}
                                <td className="pe-5 text-end">
                                  <a
                                    href={`/nr/viewer?file=${encodeURIComponent(file.links || "")}`}
                                    className="btn btn-sm btn-icon btn-light-primary"
                                    title="View"
                                  >
                                    <i className="ki-duotone ki-eye fs-4">
                                      <span className="path1"></span>
                                      <span className="path2"></span>
                                      <span className="path3"></span>
                                    </i>
                                  </a>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            {/* QUICK ACCESS */}
            <div className="mb-8">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <h3 className="fw-bold fs-4 mb-0">
                  <i className="ki-duotone ki-rocket fs-2 me-2 text-success">
                    <span className="path1"></span>
                    <span className="path2"></span>
                  </i>
                  Quick Access
                </h3>

                <span className="text-muted fs-7">
                  Jump directly to any section
                </span>
              </div>

              <div className="d-flex flex-wrap gap-3">
                {Object.entries(categoryMap).map(([menuName, cat], i) => {
                  const menuItem = data.menuData.find(
                    (m) => m.menuname === menuName,
                  );

                  const cnt = menuItem ? menuItem.total : 0;

                  return (
                    <button
                      key={i}
                      onClick={() =>
                        navigate("/nr/display", {
                          state: { menu: menuName },
                        })
                      }
                      className="qa-pill"
                    >
                      <i
                        className={`ki-duotone ${cat.icon} fs-6 text-${cat.color}`}
                      >
                        <span className="path1"></span>
                        <span className="path2"></span>
                        <span className="path3"></span>
                        <span className="path4"></span>
                      </i>

                      {menuName}

                      <span
                        className={`badge badge-light-${cat.color} ms-1 fs-9`}
                      >
                        {cnt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
