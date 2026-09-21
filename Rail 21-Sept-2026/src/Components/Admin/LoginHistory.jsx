import React, { useEffect, useState } from "react";
import $ from "jquery";

import { supabase } from "../../supabase";
import "./LoginHistory.css";
import JSZip from "jszip";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

import Footer from "../Footer/Footer";

// =====================================================
// FIX GLOBAL EXPORT DEPENDENCIES
// =====================================================

window.JSZip = JSZip;

if (pdfFonts && pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// =====================================================
// LOGIN HISTORY
// =====================================================

const LoginHistory = () => {
    const [data, setData] = useState([]);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // ===================================================
    // FETCH LOGIN HISTORY
    // ===================================================

    useEffect(() => {
        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from("login_history")
                .select("*")
                .order("login_time", { ascending: false });

            if (error) {
                console.error("Login history error:", error);
                setData([]);
                return;
            }

            setData(data || []);
        };

        fetchHistory();
    }, []);

    // ===================================================
    // FORMAT DATE
    // ===================================================

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

    // ===================================================
    // DATATABLE INITIALIZATION
    // ===================================================

    useEffect(() => {
        if (data.length === 0) return;

        const tableId = "#login_history_table";

        // Destroy previous DataTable
        if ($.fn.DataTable.isDataTable(tableId)) {
            $(tableId).DataTable().destroy();
        }

        // Initialize DataTable
        const table = $(tableId).DataTable({
            pageLength: 10,

            ordering: true,

            searching: true,

            autoWidth: false,

            deferRender: true,

            // No default sorting
            order: [],

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

            buttons: [
                {
                    extend: "copyHtml5",
                    title: "Login History",
                },

                {
                    extend: "excelHtml5",
                    title: "Login History",
                },

                {
                    extend: "csvHtml5",
                    title: "Login History",
                },

                {
                    extend: "pdfHtml5",
                    title: "Login History",
                    orientation: "landscape",
                    pageSize: "A4",
                },
            ],
        });

        // =================================================
        // ATTACH EXPORT BUTTONS
        // =================================================

        table
            .buttons()
            .container()
            .appendTo("#login_history_export");

        // =================================================
        // SEARCH
        // =================================================

        let timer;

        $('[data-login-history-filter="search"]')
            .off("keyup")
            .on("keyup", function () {
                clearTimeout(timer);

                const value = this.value;

                timer = setTimeout(() => {
                    table.search(value).draw();
                }, 300);
            });

        // =================================================
        // ROLE FILTER
        // =================================================

        $('[data-login-history-filter="role"]')
            .off("change")
            .on("change", function () {
                const value = $(this).val();

                if (value === "all" || value === "") {
                    table.column(3).search("").draw();
                } else {
                    table.column(3).search("^" + value + "$", true, false).draw();
                }
            });

        // =================================================
        // EXPORT ACTIONS
        // =================================================

        document
            .querySelectorAll("[data-login-history-export]")
            .forEach((el) => {
                el.onclick = (e) => {
                    e.preventDefault();

                    const type = el.getAttribute("data-login-history-export");

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

        // =================================================
        // CLEANUP
        // =================================================

        return () => {
            if ($.fn.DataTable.isDataTable(tableId)) {
                $(tableId).DataTable().destroy();
            }
        };
    }, [data]);

    // ===================================================
    // CLOSE EXPORT DROPDOWN
    // ===================================================

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

    // ===================================================
    // STATISTICS
    // ===================================================

    const totalRecords = data.length;

    const uniqueUsers = new Set(
        data.map((row) => row.user_id).filter(Boolean)
    ).size;

    const adminLogins = data.filter(
        (row) => row.role?.toLowerCase() === "admin"
    ).length;

    const latestLogin = data.length
        ? formatDate(data[0]?.login_time)
        : "-";

    // ===================================================
    // RETURN
    // ===================================================

    return (
        <div className="d-flex flex-column flex-column-fluid">

            {/* =================================================
          MAIN CONTENT
      ================================================= */}

            <div className="app-main flex-column flex-row-fluid">

                <div className="d-flex flex-column flex-column-fluid">

                    <div className="app-content flex-column-fluid">

                        <div className="container-fluid">

                            
                            <div className="row g-4 mb-5">

                                {/* TOTAL LOGIN RECORDS */}

                                <div className="col-md-4">

                                    <div className="history-stat">

                                        <div className="history-icon bg-light-primary">

                                            <i className="ki-duotone ki-login fs-2 text-primary">
                                                <span className="path1"></span>
                                                <span className="path2"></span>
                                            </i>

                                        </div>

                                        <div>

                                            <div className="fs-2 fw-bold">
                                                {totalRecords}
                                            </div>

                                            <div className="text-muted fs-7">
                                                Login Records
                                            </div>

                                        </div>

                                    </div>

                                </div>

                                {/* UNIQUE USERS */}

                                <div className="col-md-4">

                                    <div className="history-stat">

                                        <div className="history-icon bg-light-success">

                                            <i className="ki-duotone ki-user-tick fs-2 text-success">
                                                <span className="path1"></span>
                                                <span className="path2"></span>
                                            </i>

                                        </div>

                                        <div>

                                            <div className="fs-2 fw-bold">
                                                {uniqueUsers}
                                            </div>

                                            <div className="text-muted fs-7">
                                                Unique Users
                                            </div>

                                        </div>

                                    </div>

                                </div>

                                {/* LATEST LOGIN */}

                                <div className="col-md-4">

                                    <div className="history-stat">

                                        <div className="history-icon bg-light-warning">

                                            <i className="ki-duotone ki-time fs-2 text-warning">
                                                <span className="path1"></span>
                                                <span className="path2"></span>
                                            </i>

                                        </div>

                                        <div>

                                            <div
                                                className="fs-6 fw-bold"
                                                style={{ lineHeight: "1.5" }}
                                            >
                                                {latestLogin}
                                            </div>

                                            <div className="text-muted fs-7">
                                                Latest Login
                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>

                            {/* =================================================
                  TABLE CARD
              ================================================= */}

                            <div className="card">

                                {/* =================================================
                    CARD HEADER
                ================================================= */}

                                <div className="card-header border-0 pt-6">

                                    {/* TITLE */}

                                    <div className="card-title">

                                        <div className="d-flex align-items-center position-relative my-1">

                                            <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                                <span className="path1"></span>
                                                <span className="path2"></span>
                                            </i>

                                            <input
                                                type="text"
                                                className="form-control form-control-solid w-250px ps-13"
                                                placeholder="Search login history..."
                                                data-login-history-filter="search"
                                            />

                                        </div>

                                    </div>

                                    {/* =================================================
                      RIGHT SIDE
                  ================================================= */}

                                    <div className="card-toolbar flex-row-fluid justify-content-end gap-5 position-relative">

                                        {/* ROLE FILTER */}

                                        <div className="w-150px">

                                            <select
                                                className="form-select form-select-solid"
                                                data-login-history-filter="role"
                                            >

                                                <option value="all">
                                                    All Roles
                                                </option>

                                                <option value="Admin">
                                                    Admin
                                                </option>

                                                <option value="User">
                                                    User
                                                </option>

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

                                        {/* =================================================
                        EXPORT DROPDOWN
                    ================================================= */}

                                        <div
                                            className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-150px py-4"
                                            style={{
                                                display: showExportMenu
                                                    ? "block"
                                                    : "none",

                                                position: "absolute",

                                                top: "100%",

                                                marginTop: "10px",

                                                right: "0",

                                                zIndex: 1000,
                                            }}
                                        >

                                            {/* COPY */}

                                            <div className="menu-item px-3">

                                                <a
                                                    href="#"
                                                    className="menu-link px-3"
                                                    data-login-history-export="Copy to clipboard"
                                                >
                                                    Copy to clipboard
                                                </a>

                                            </div>

                                            {/* EXCEL */}

                                            <div className="menu-item px-3">

                                                <a
                                                    href="#"
                                                    className="menu-link px-3"
                                                    data-login-history-export="Export as Excel"
                                                >
                                                    Export as Excel
                                                </a>

                                            </div>

                                            {/* CSV */}

                                            <div className="menu-item px-3">

                                                <a
                                                    href="#"
                                                    className="menu-link px-3"
                                                    data-login-history-export="Export as CSV"
                                                >
                                                    Export as CSV
                                                </a>

                                            </div>

                                            {/* PDF */}

                                            <div className="menu-item px-3">

                                                <a
                                                    href="#"
                                                    className="menu-link px-3"
                                                    data-login-history-export="Export as PDF"
                                                >
                                                    Export as PDF
                                                </a>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                                {/* =================================================
                    HIDDEN DATATABLE BUTTONS
                ================================================= */}

                                <div
                                    id="login_history_export"
                                    style={{ display: "none" }}
                                ></div>

                                {/* =================================================
                    TABLE
                ================================================= */}

                                <div className="card-body pt-0">

                                    <div className="table-responsive">

                                        <table
                                            id="login_history_table"
                                            className="table align-middle table-row-dashed fs-6 gy-5"
                                        >

                                            {/* =================================================
                          TABLE HEADER
                      ================================================= */}

                                            <thead>

                                                <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">

                                                    <th className="min-w-50px">
                                                        #
                                                    </th>

                                                    <th className="min-w-100px">
                                                        User
                                                    </th>

                                                    <th className="min-w-120px">
                                                        Email
                                                    </th>

                                                    <th className="min-w-50px">
                                                        Role
                                                    </th>

                                                    <th className="min-w-50px">
                                                        Login Count
                                                    </th>

                                                    <th className="min-w-180px">
                                                        Login Time
                                                    </th>

                                                    <th className="min-w-180px">
                                                        Last Activity
                                                    </th>

                                                    <th className="min-w-130px">
                                                        IP Address
                                                    </th>

                                                    <th className="min-w-120px">
                                                        Device
                                                    </th>

                                                    <th className="min-w-120px">
                                                        Browser
                                                    </th>

                                                    <th className="min-w-140px">
                                                        Operating System
                                                    </th>

                                                    <th className="min-w-180px">
                                                        Session
                                                    </th>

                                                </tr>

                                            </thead>

                                            {/* =================================================
                          TABLE BODY
                      ================================================= */}

                                            <tbody className="fw-semibold text-gray-600">

                                                {data.map((row, index) => {

                                                    const isAdmin =
                                                        row.role?.toLowerCase() ===
                                                        "admin";

                                                    const firstLetter =
                                                        row.username
                                                            ?.charAt(0)
                                                            ?.toUpperCase() || "?";

                                                    return (

                                                        <tr key={row.id}>

                                                            {/* INDEX */}

                                                            <td className="text-gray-500">
                                                                {index + 1}
                                                            </td>

                                                            {/* USER */}

                                                            <td>

                                                                <div className="d-flex align-items-center">

                                                                    {/* USER AVATAR */}



                                                                    {/* USER NAME */}

                                                                    <div className="d-flex flex-column">

                                                                        <span className="text-gray-900 fw-bold">

                                                                            {row.username ||
                                                                                "-"}

                                                                        </span>

                                                                    </div>

                                                                </div>

                                                            </td>

                                                            {/* EMAIL */}

                                                            <td className="text-gray-700">

                                                                {row.email || "-"}

                                                            </td>

                                                            {/* ROLE */}

                                                            <td>

                                                                <span
                                                                    className={`badge ${isAdmin
                                                                            ? "badge-light-danger"
                                                                            : "badge-light-success"
                                                                        }`}
                                                                >

                                                                    {row.role || "-"}

                                                                </span>

                                                            </td>

                                                            {/* LOGIN COUNT */}

                                                            <td>

                                                                <span className="badge badge-light-primary">

                                                                    {row.login_count ??
                                                                        0}

                                                                </span>

                                                            </td>

                                                            {/* LOGIN TIME */}

                                                            <td>

                                                                <span className="text-gray-700">

                                                                    {formatDate(
                                                                        row.login_time
                                                                    )}

                                                                </span>

                                                            </td>

                                                            {/* LAST ACTIVITY */}

                                                            <td>

                                                                <span className="text-gray-700">

                                                                    {formatDate(
                                                                        row.last_activity
                                                                    )}

                                                                </span>

                                                            </td>

                                                            {/* IP */}

                                                            <td>

                                                                <code className="text-gray-700">

                                                                    {row.ip_address ||
                                                                        "-"}

                                                                </code>

                                                            </td>

                                                            {/* DEVICE */}

                                                            <td>

                                                                <span className="text-gray-700">

                                                                    {row.device_type ||
                                                                        "-"}

                                                                </span>

                                                            </td>

                                                            {/* BROWSER */}

                                                            <td>

                                                                <span className="text-gray-700">

                                                                    {row.browser ||
                                                                        "-"}

                                                                </span>

                                                            </td>

                                                            {/* OS */}

                                                            <td>

                                                                <span className="text-gray-700">

                                                                    {row.operating_system ||
                                                                        "-"}

                                                                </span>

                                                            </td>

                                                            {/* SESSION */}

                                                            <td>

                                                                <span
                                                                    className="text-muted fs-8"
                                                                    title={
                                                                        row.session_id ||
                                                                        ""
                                                                    }
                                                                >

                                                                    {row.session_id
                                                                        ? row.session_id.substring(
                                                                            0,
                                                                            15
                                                                        ) + "..."
                                                                        : "-"}

                                                                </span>

                                                            </td>

                                                        </tr>

                                                    );
                                                })}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* =================================================
          FOOTER
      ================================================= */}

            <Footer />

        </div>
    );
};

export default LoginHistory;