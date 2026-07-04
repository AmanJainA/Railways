import React, { useEffect, useState } from "react";
import $ from "jquery";

// Export dependencies
import JSZip from "jszip";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import Footer from "../Footer/Footer";

// FIX for React (important)

// ✅ FIX GLOBAL
window.JSZip = JSZip;
if (pdfFonts && pdfFonts.pdfMake) {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

const MyData = () => {
  const [data, setData] = useState([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ===== FILE TYPE BADGE =====
  const fileTypeBadgeColor = (type) => {
    switch ((type || "").toLowerCase()) {
      case "pdf":
        return "badge-light-danger";
      case "doc":
      case "docx":
        return "badge-light-primary";
      case "xls":
      case "xlsx":
        return "badge-light-success";
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "bmp":
      case "svg":
        return "badge-light-warning";
      case "ppt":
      case "pptx":
        return "badge-light-info";
      case "zip":
      case "rar":
        return "badge-light-dark";
      default:
        return "badge-light-secondary";
    }
  };

  // ===== FETCH =====
  useEffect(() => {
    fetch("https://samrat.cu.ma/mydata.php")
      .then((res) => res.json())
      .then((res) => setData(res));
  }, []);

  // ===== DATATABLE INIT =====
  useEffect(() => {
    if (data.length === 0) return;

    const tableId = "#kt_ecommerce_report_customer_orders_table";

    if ($.fn.DataTable.isDataTable(tableId)) {
      $(tableId).DataTable().destroy();
    }

    const table = $(tableId).DataTable({
      pageLength: 10,
      ordering: true,
      searching: true,

      autoWidth: false,
      deferRender: true,

      order: [], // ✅ remove default sorting

      columnDefs: [
        { orderable: false, targets: 0 }, // ❌ disable sorting on ID
        { className: "text-center", targets: 0 }, // ✅ center ID
      ],

      paging: true, // ✅ ALWAYS ON
      info: true, // ✅ ALWAYS ON
      lengthChange: true, // ✅ 10,20,50 dropdown

      dom:
        "<'row'<'col-sm-12'tr>>" +
        "<'row align-items-center mt-3'" +
        "<'col-sm-6 d-flex align-items-center gap-3'l i>" +
        "<'col-sm-6 d-flex justify-content-end'p>" +
        ">",

      lengthMenu: [10, 20, 50, 100],
      pagingType: "simple_numbers",

      language: {
        info: "Showing _START_ to _END_ of _TOTAL_ records",
        lengthMenu: "_MENU_",
        paginate: {
          previous: "‹",
          next: "›",
        },
      },

      buttons: [
        { extend: "copyHtml5", title: "My Data" },
        { extend: "excelHtml5", title: "My Data" },
        { extend: "csvHtml5", title: "My Data" },
        {
          extend: "pdfHtml5",
          title: "My Data",
          orientation: "landscape",
          pageSize: "A4",
        },
      ],
    });

    // attach buttons
    table
      .buttons()
      .container()
      .appendTo("#kt_ecommerce_report_customer_orders_export");

    // ===== SEARCH =====
    let timer;
    $('[data-kt-ecommerce-order-filter="search"]')
      .off()
      .on("keyup", function () {
        clearTimeout(timer);
        let value = this.value;

        timer = setTimeout(() => {
          table.search(value).draw();
        }, 300);
      });

    // ===== FILTER =====
    $('[data-kt-ecommerce-order-filter="status"]')
      .off()
      .on("change", function () {
        let value = $(this).val();

        if (value === "all" || value === "") {
          table.column(2).search("").draw();
        } else {
          table.column(2).search(value).draw();
        }
      });

    // ===== EXPORT BUTTON ACTION =====
    document.querySelectorAll("[data-kt-ecommerce-export]").forEach((el) => {
      el.onclick = (e) => {
        e.preventDefault();

        const type = el.getAttribute("data-kt-ecommerce-export");

        if (type === "Copy to clipboard")
          table.button(".buttons-copy").trigger();
        if (type === "Export as Excel")
          table.button(".buttons-excel").trigger();
        if (type === "Export as CSV") table.button(".buttons-csv").trigger();
        if (type === "Export as PDF") table.button(".buttons-pdf").trigger();
      };
    });
  }, [data]);

  // ===== CLOSE DROPDOWN ON OUTSIDE CLICK =====
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".card-toolbar")) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div
      id="kt_body"
      className="header-fixed header-tablet-and-mobile-fixed aside-fixed"
    >
      <div
        className="content d-flex flex-column flex-column-fluid fs-6"
        id="kt_content"
      >
        <div className="container-xxl">
          <div className="card card-flush">
            {/* HEADER */}
            <div className="card-header align-items-center py-5 gap-2 gap-md-5">
              {/* SEARCH */}
              <div className="card-title">
                <div className="d-flex align-items-center position-relative my-1">
                  <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-4">
                    <span className="path1"></span>
                    <span className="path2"></span>
                  </i>
                  <input
                    type="text"
                    data-kt-ecommerce-order-filter="search"
                    className="form-control form-control-solid w-455px ps-12"
                    placeholder="Search Report"
                  />
                </div>
                <div
                  id="kt_ecommerce_report_customer_orders_export"
                  className="d-none"
                ></div>
              </div>

              {/* RIGHT SIDE */}
              <div className="card-toolbar flex-row-fluid justify-content-end gap-5 position-relative">
                {/* FILTER */}
                <div className="w-200px">
                  <select
                    className="form-select form-select-solid"
                    data-kt-ecommerce-order-filter="status"
                  >
                    <option value="all">All</option>
                    <option value="img">IMG</option>
                    <option value="pdf">PDF</option>
                    <option value="doc">DOC</option>
                    <option value="xls">XLS</option>
                  </select>
                </div>

                {/* EXPORT BUTTON */}
                <button
                  className="btn btn-light-primary"
                  data-kt-menu-trigger="click"
                  data-kt-menu-placement="bottom-end"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <i className="ki-duotone ki-exit-up fs-2">
                    <span className="path1"></span>
                    <span className="path2"></span>
                  </i>
                  Export Report
                </button>

                {/* DROPDOWN */}
                <div
                  className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-150px py-4"
                  style={{
                    display: showExportMenu ? "block" : "none",
                    position: "absolute",
                    top: "100%", // 🔥 button ke niche
                    marginTop: "10px", // 🔥 thoda gap
                    zIndex: 1000,
                  }}
                >
                  <div className="menu-item px-3">
                    <a
                      href="#"
                      className="menu-link px-3"
                      data-kt-ecommerce-export="Copy to clipboard"
                    >
                      Copy to clipboard
                    </a>
                  </div>
                  <div className="menu-item px-3">
                    <a
                      href="#"
                      className="menu-link px-3"
                      data-kt-ecommerce-export="Export as Excel"
                    >
                      Export as Excel
                    </a>
                  </div>
                  <div className="menu-item px-3">
                    <a
                      href="#"
                      className="menu-link px-3"
                      data-kt-ecommerce-export="Export as CSV"
                    >
                      Export as CSV
                    </a>
                  </div>
                  <div className="menu-item px-3">
                    <a
                      href="#"
                      className="menu-link px-3"
                      data-kt-ecommerce-export="Export as PDF"
                    >
                      Export as PDF
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="card-body pt-0">
              <table
                id="kt_ecommerce_report_customer_orders_table"
                className="table align-middle table-row-dashed fs-6 gy-5"
              >
                <thead>
                  <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                    <th className="min-w-10px">Id</th>
                    <th className="min-w-100px">File Name</th>
                    <th className="min-w-100px">File Type</th>
                    <th className="min-w-10px">Action</th>
                  </tr>
                </thead>
                <tbody className="fw-semibold text-gray-600">
                  {data.map((row, i) => (
                    <tr key={i}>
                      <td className="text-gray-900 text-hover-primary">
                        {i + 1}
                      </td>
                      <td className="text-gray-900 text-hover-primary">
                        {row.name}
                      </td>
                      <td>
                        <div
                          className={`badge ${fileTypeBadgeColor(row.type)}`}
                        >
                          {row.type?.toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <a
                          href={`/nr/viewer?file=${encodeURIComponent(row.links)}`}
                        >
                          <i className="ki-duotone ki-eye fs-3 mt-2 text-primary">
                            <span className="path1"></span>
                            <span className="path2"></span>
                            <span className="path3"></span>
                          </i>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyData;
