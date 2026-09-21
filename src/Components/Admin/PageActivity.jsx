import React, { useEffect, useState } from "react";
import $ from "jquery";
import { supabase } from "../../supabase";
import JSZip from "jszip";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import "./PageActivity.css";

// ===============================
// GLOBAL EXPORT FIX
// ===============================

window.JSZip = JSZip;

if (pdfFonts && pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// ===============================
// COMPONENT
// ===============================

const PageActivity = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // ===============================
    // FETCH PAGE ACTIVITY
    // ===============================

    useEffect(() => {
        fetchActivity();
    }, []);

    const fetchActivity = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("page_activity")
            .select("*")
            .order("activity_date", { ascending: false })
            .order("visit_time", { ascending: false });

        if (error) {
            console.error("Page Activity Error:", error);
            setRows([]);
        } else {
            setRows(data || []);
        }

        setLoading(false);
    };

    // ===============================
    // FORMAT DATE
    // ===============================

    const formatDate = (value) => {
        if (!value) return "-";

        return new Date(value).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // ===============================
    // USER INITIAL
    // ===============================

    const getInitial = (username) => {
        if (!username) return "?";

        return username.charAt(0).toUpperCase();
    };

    // ===============================
    // STATS
    // ===============================

    const uniqueUsers = new Set(
        rows.map((r) => r.user_id).filter(Boolean)
    ).size;

    const uniquePages = new Set(
        rows.map((r) => r.page_name).filter(Boolean)
    ).size;

    const totalVisits = rows.reduce(
        (sum, r) => sum + Number(r.visit_count || 0),
        0
    );

    // ===============================
    // DATATABLE
    // ===============================

    useEffect(() => {
        if (loading) return;

        const tableId = "#page_activity_table";

        // Destroy old DataTable
        if ($.fn.DataTable.isDataTable(tableId)) {
            $(tableId).DataTable().destroy();
        }

        const table = $(tableId).DataTable({
            pageLength: 10,

            ordering: true,

            searching: true,

            autoWidth: false,

            deferRender: true,

            // Don't apply default sorting
            // Default sorting: latest activity date first
            order: [[9, "desc"]],
            columnDefs: [
                {
                    orderable: false,
                    targets: 0,
                },
                {
                    className: "text-center",
                    targets: 0,
                },
            ],

            paging: true,

            info: true,

            lengthChange: true,

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
drawCallback: function () {
        const api = this.api();

        api.rows({ page: "current" }).every(function (
            rowIdx,
            tableLoop,
            rowLoop
        ) {
            $(this.node())
                .find("td:first")
                .html(rowLoop + 1);
        });
    },
            buttons: [
                {
                    extend: "copyHtml5",
                    title: "Page Activity",
                },
                {
                    extend: "excelHtml5",
                    title: "Page Activity",
                },
                {
                    extend: "csvHtml5",
                    title: "Page Activity",
                },
                {
                    extend: "pdfHtml5",
                    title: "Page Activity",
                    orientation: "landscape",
                    pageSize: "A4",
                },
            ],
        });

        // ===============================
        // SEARCH
        // ===============================

        let timer;

        $('[data-page-activity-filter="search"]')
            .off("keyup")
            .on("keyup", function () {
                clearTimeout(timer);

                const value = this.value;

                timer = setTimeout(() => {
                    table.search(value).draw();
                }, 300);
            });

        // ===============================
        // PAGE FILTER
        // ===============================

        $('[data-page-activity-filter="page"]')
            .off("change")
            .on("change", function () {
                const value = this.value;

                // Page column = 2
                if (value === "all" || value === "") {
                    table.column(2).search("").draw();
                } else {
                    table.column(2).search("^" + value + "$", true, false).draw();
                }
            });

        // ===============================
        // EXPORT BUTTONS
        // ===============================

        document
            .querySelectorAll("[data-page-activity-export]")
            .forEach((el) => {
                el.onclick = (e) => {
                    e.preventDefault();

                    const type = el.getAttribute("data-page-activity-export");

                    if (type === "Copy to clipboard") {
                        table.button(".buttons-copy").trigger();
                    }

                    if (type === "Export as Excel") {
                        table.button(".buttons-excel").trigger();
                    }

                    if (type === "Export as CSV") {
                        table.button(".buttons-csv").trigger();
                    }

                    if (type === "Export as PDF") {
                        table.button(".buttons-pdf").trigger();
                    }

                    setShowExportMenu(false);
                };
            });

        // Cleanup
        return () => {
            clearTimeout(timer);

            if ($.fn.DataTable.isDataTable(tableId)) {
                $(tableId).DataTable().destroy();
            }
        };
    }, [rows, loading]);

    // ===============================
    // CLOSE EXPORT MENU
    // ===============================

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest(".card-toolbar")) {
                setShowExportMenu(false);
            }
        };

        document.addEventListener("click", handleClickOutside);

        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    // ===============================
    // UNIQUE PAGE LIST
    // ===============================

    const pageList = [
        ...new Set(rows.map((row) => row.page_name).filter(Boolean)),
    ];

    // ===============================
    // UI
    // ===============================

    return (
        <div className="container-fluid">

            <div className="row g-4 mb-5">

                {/* ACTIVE USERS */}

                <div className="col-md-4">

                    <div className="card shadow-sm h-100">

                        <div className="card-body d-flex align-items-center">

                            <div className="symbol symbol-50px me-5">
                                <span className="symbol-label bg-light-primary">

                                    <i className="ki-duotone ki-profile-user fs-2x text-primary">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                        <span className="path3"></span>
                                        <span className="path4"></span>
                                    </i>

                                </span>
                            </div>

                            <div>

                                <div className="fs-2 fw-bold text-gray-900">
                                    {uniqueUsers}
                                </div>

                                <div className="text-muted fs-7">
                                    Active Users
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                {/* UNIQUE PAGES */}

                <div className="col-md-4">

                    <div className="card shadow-sm h-100">

                        <div className="card-body d-flex align-items-center">

                            <div className="symbol symbol-50px me-5">
                                <span className="symbol-label bg-light-success">

                                    <i className="ki-duotone ki-element-11 fs-2x text-success">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                        <span className="path3"></span>
                                        <span className="path4"></span>
                                    </i>

                                </span>
                            </div>

                            <div>

                                <div className="fs-2 fw-bold text-gray-900">
                                    {uniquePages}
                                </div>

                                <div className="text-muted fs-7">
                                    Unique Pages
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

                {/* TOTAL VISITS */}

                <div className="col-md-4">

                    <div className="card shadow-sm h-100">

                        <div className="card-body d-flex align-items-center">

                            <div className="symbol symbol-50px me-5">
                                <span className="symbol-label bg-light-warning">

                                    <i className="ki-duotone ki-click fs-2x text-warning">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                    </i>

                                </span>
                            </div>

                            <div>

                                <div className="fs-2 fw-bold text-gray-900">
                                    {totalVisits}
                                </div>

                                <div className="text-muted fs-7">
                                    Total Visits
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* =====================================================
          TABLE CARD
      ====================================================== */}

            <div className="card card-flush shadow-sm">

                {/* ===================================================
            TABLE HEADER
        ==================================================== */}

                <div className="card-header align-items-center py-5 gap-2 gap-md-5">

                    {/* TITLE */}

                    <div className="card-title">

                        <h3 className="fw-bold mb-0">
                            Activity Records
                        </h3>

                    </div>

                    {/* TOOLBAR */}

                    <div className="card-toolbar flex-row-fluid justify-content-end gap-5 position-relative">

                        {/* SEARCH */}

                        <div className="d-flex align-items-center position-relative">

                            <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-4">
                                <span className="path1"></span>
                                <span className="path2"></span>
                            </i>

                            <input
                                type="text"
                                className="form-control form-control-solid w-250px ps-12"
                                placeholder="Search activity..."
                                data-page-activity-filter="search"
                            />

                        </div>

                        {/* PAGE FILTER */}

                        <div className="w-200px">

                            <select
                                className="form-select form-select-solid"
                                data-page-activity-filter="page"
                            >

                                <option value="all">
                                    All Pages
                                </option>

                                {pageList.map((page) => (
                                    <option
                                        key={page}
                                        value={page}
                                    >
                                        {page}
                                    </option>
                                ))}

                            </select>

                        </div>

                        {/* EXPORT BUTTON */}

                        <button
                            type="button"
                            className="btn btn-light-primary"
                            onClick={() =>
                                setShowExportMenu(!showExportMenu)
                            }
                        >

                            <i className="ki-duotone ki-exit-up fs-2">
                                <span className="path1"></span>
                                <span className="path2"></span>
                            </i>

                            Export Report

                        </button>

                        {/* EXPORT DROPDOWN */}

                        <div
                            className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-150px py-4"
                            style={{
                                display: showExportMenu ? "block" : "none",
                                position: "absolute",
                                top: "100%",
                                right: "0",
                                marginTop: "10px",
                                zIndex: 1000,
                            }}
                        >

                            {/* COPY */}

                            <div className="menu-item px-3">

                                <a
                                    href="#"
                                    className="menu-link px-3"
                                    data-page-activity-export="Copy to clipboard"
                                >
                                    Copy to clipboard
                                </a>

                            </div>

                            {/* EXCEL */}

                            <div className="menu-item px-3">

                                <a
                                    href="#"
                                    className="menu-link px-3"
                                    data-page-activity-export="Export as Excel"
                                >
                                    Export as Excel
                                </a>

                            </div>

                            {/* CSV */}

                            <div className="menu-item px-3">

                                <a
                                    href="#"
                                    className="menu-link px-3"
                                    data-page-activity-export="Export as CSV"
                                >
                                    Export as CSV
                                </a>

                            </div>

                            {/* PDF */}

                            <div className="menu-item px-3">

                                <a
                                    href="#"
                                    className="menu-link px-3"
                                    data-page-activity-export="Export as PDF"
                                >
                                    Export as PDF
                                </a>

                            </div>

                        </div>

                    </div>

                </div>

                {/* ===================================================
            TABLE
        ==================================================== */}

                <div className="card-body pt-0">

                    <div className="table-responsive">

                        <table
                            id="page_activity_table"
                            className="table align-middle table-row-dashed fs-6 gy-5"
                        >

                            <thead>

                                <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">

                                    <th className="min-w-50px">
                                        #
                                    </th>

                                    <th className="min-w-180px">
                                        User
                                    </th>

                                    <th className="min-w-100px">
                                        Page
                                    </th>

                                    <th className="min-w-150px">
                                        URL
                                    </th>

                                    <th className="min-w-100px">
                                        IP Address
                                    </th>

                                    <th className="min-w-100px">
                                        Browser
                                    </th>

                                    <th className="min-w-100px">
                                        Device
                                    </th>

                                    <th className="min-w-180px">
                                        Visit Time
                                    </th>

                                    <th className="min-w-50px">
                                        Visits
                                    </th>

                                    <th className="min-w-120px">
                                        Activity Date
                                    </th>

                                    <th className="min-w-120px">
                                        OS
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="fw-semibold text-gray-600">

                                {loading ? (

                                    <tr>

                                        <td
                                            colSpan="11"
                                            className="text-center py-10 text-muted"
                                        >
                                            Loading page activity...
                                        </td>

                                    </tr>

                                ) : rows.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="11"
                                            className="text-center py-10 text-muted"
                                        >
                                            No activity found.
                                        </td>

                                    </tr>

                                ) : (

                                    rows.map((row, index) => (

                                        <tr key={row.id}>

                                            {/* NUMBER */}

                                            <td className="text-gray-500">
                                              
                                            </td>

                                            {/* USER */}

                                            <td>

                                                <div className="d-flex align-items-center">

                                                    {/* AVATAR */}

                                                    <div className="symbol symbol-35px me-3">

                                                        <span className="symbol-label bg-light-primary text-primary fw-bold">

                                                            {getInitial(row.username)}

                                                        </span>

                                                    </div>

                                                    {/* NAME */}

                                                    <div>

                                                        <span className="text-gray-900 fw-bold d-block">

                                                            {row.username || "-"}

                                                        </span>

                                                        <span className="text-muted fs-8">

                                                            ID: {row.user_id || "-"}

                                                        </span>

                                                    </div>

                                                </div>

                                            </td>

                                            {/* PAGE */}

                                            <td>

                                                <span className="badge badge-light-primary">

                                                    {row.page_name || "-"}

                                                </span>

                                            </td>

                                            {/* URL */}

                                            <td>

                                                <span
                                                    className="text-gray-700"
                                                    title={row.page_url || ""}
                                                    style={{
                                                        display: "inline-block",
                                                        maxWidth: "250px",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >

                                                    {row.page_url || "-"}

                                                </span>

                                            </td>

                                            {/* IP */}

                                            <td>

                                                <code className="text-gray-700">

                                                    {row.ip_address || "-"}

                                                </code>

                                            </td>

                                            {/* BROWSER */}

                                            <td>

                                                {row.browser || "-"}

                                            </td>

                                            {/* DEVICE */}

                                            <td>

                                                <span className="badge badge-light-info">

                                                    {row.device_type || "-"}

                                                </span>

                                            </td>

                                            {/* VISIT TIME */}

                                            <td>

                                                {formatDate(row.visit_time)}

                                            </td>

                                            {/* VISITS */}

                                            <td>

                                                <span className="badge badge-light-success">

                                                    {row.visit_count ?? 1}

                                                </span>

                                            </td>

                                            {/* ACTIVITY DATE */}

                                            <td>

                                                {row.activity_date || "-"}

                                            </td>

                                            {/* OS */}

                                            <td>

                                                {row.operating_system || "-"}

                                            </td>

                                        </tr>

                                    ))

                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default PageActivity;