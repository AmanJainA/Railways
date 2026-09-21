import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase";
import Footer from "../Footer/Footer";

const UserProfiles = () => {
    const role = (sessionStorage.getItem("role") || "").toLowerCase();
    const username = sessionStorage.getItem("user") || "";

    const isAdmin = role === "admin";

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search / Filter
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);

    // Saving / deleting
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Alert
    const [alert, setAlert] = useState(null);

    // Export menu
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Form
    const [headings, setHeadings] = useState([]);
    const [menus, setMenus] = useState([]);
    const [selectedHeadingIds, setSelectedHeadingIds] = useState([]);
    const [selectedMenuIds, setSelectedMenuIds] = useState([]);
    const [userHeadingMap, setUserHeadingMap] = useState({});
    const [userMenuMap, setUserMenuMap] = useState({});

    const [form, setForm] = useState({
        username: "",
        password: "",
        role: "user",
        email: "",
        dept: "",
        project: "",
    });

    // =========================================================
    // FETCH USERS
    // =========================================================

    useEffect(() => {
        fetchUsers();
        fetchHeadings();
    }, []);

    const fetchHeadings = async () => {
        const { data, error } = await supabase
            .from("main_heading_master")
            .select("id,headingname")
            .eq("status", "1")
            .order("id", { ascending: true });
        if (error) console.error("Heading fetch error:", error);
        else setHeadings(data || []);

        const { data: menuData, error: menuError } = await supabase
            .from("menu_master")
            .select("id,menuname,main_heading_id")
            .eq("status", "1")
            .order("main_heading_id", { ascending: true })
            .order("id", { ascending: true });

        if (menuError) console.error("Menu fetch error:", menuError);
        else setMenus(menuData || []);
    };

    const fetchUsers = async () => {
        setLoading(true);

        const { data, error } = await supabase
            .from("users")
            .select("id,username,password,role,email,dept,project")
            .order("id", { ascending: true });

        if (error) {
            console.error("Users fetch error:", error);
            showAlert("danger", "Error", error.message);
            setUsers([]);
        } else {
            setUsers(data || []);
        }

        const { data: accessRows, error: accessError } = await supabase
            .from("user_main_heading_access")
            .select("user_id, main_heading_id, main_heading_master(headingname)")
            .order("main_heading_id", { ascending: true });

        if (accessError) {
            console.error("User heading access fetch error:", accessError);
            setUserHeadingMap({});
        } else {
            const map = {};
            (accessRows || []).forEach((row) => {
                if (!map[row.user_id]) map[row.user_id] = [];
                const name = row.main_heading_master?.headingname;
                if (name) map[row.user_id].push(name);
            });
            setUserHeadingMap(map);
        }

        const { data: menuAccessRows, error: menuAccessError } = await supabase
            .from("user_menu_access")
            .select("user_id, menu_id, menu_master(menuname)")
            .order("menu_id", { ascending: true });

        if (menuAccessError) {
            console.error("User menu access fetch error:", menuAccessError);
            setUserMenuMap({});
        } else {
            const menuMap = {};
            (menuAccessRows || []).forEach((row) => {
                if (!menuMap[row.user_id]) menuMap[row.user_id] = [];
                const name = row.menu_master?.menuname;
                if (name) menuMap[row.user_id].push(name);
            });
            setUserMenuMap(menuMap);
        }

        setLoading(false);
    };

    // =========================================================
    // ALERT
    // =========================================================

    const showAlert = (type, title, message) => {
        setAlert({
            type,
            title,
            message,
        });

        setTimeout(() => {
            setAlert(null);
        }, 4000);
    };

    // =========================================================
    // STATISTICS
    // =========================================================

    const totalUsers = users.length;

    const adminUsers = users.filter(
        (user) => (user.role || "").toLowerCase() === "admin"
    ).length;

    const normalUsers = users.filter(
        (user) => (user.role || "").toLowerCase() !== "admin"
    ).length;

    // =========================================================
    // FILTER USERS
    // =========================================================

    const filteredUsers = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return users.filter((user) => {
            const matchesSearch =
                !searchValue ||
                (user.username || "").toLowerCase().includes(searchValue) ||
                (user.email || "").toLowerCase().includes(searchValue) ||
                (user.dept || "").toLowerCase().includes(searchValue) ||
                (user.project || "").toLowerCase().includes(searchValue);

            const userRole = (user.role || "").toLowerCase();

            const matchesRole =
                roleFilter === "all" ||
                (roleFilter === "admin" && userRole === "admin") ||
                (roleFilter === "user" && userRole !== "admin");

            return matchesSearch && matchesRole;
        });
    }, [users, search, roleFilter]);

    // =========================================================
    // OPEN ADD MODAL
    // =========================================================

    const openAddModal = () => {
        setEditId(null);

        setForm({
            username: "",
            password: "",
            role: "user",
            email: "",
            dept: "",
            project: "",
        });
        setSelectedHeadingIds([]);

        setShowModal(true);
    };

    // =========================================================
    // OPEN EDIT MODAL
    // =========================================================

    const openEditModal = async (user) => {
        setEditId(user.id);

        setForm({
            username: user.username || "",
            password: "",
            role: user.role || "user",
            email: user.email || "",
            dept: user.dept || "",
            project: user.project || "",
        });

        const { data: access } = await supabase
            .from("user_main_heading_access")
            .select("main_heading_id")
            .eq("user_id", user.id);
        setSelectedHeadingIds((access || []).map(x => Number(x.main_heading_id)));

        const { data: menuAccess } = await supabase
            .from("user_menu_access")
            .select("menu_id")
            .eq("user_id", user.id);
        setSelectedMenuIds((menuAccess || []).map(x => Number(x.menu_id)));

        setShowModal(true);
    };

    // =========================================================
    // CLOSE MODAL
    // =========================================================

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditId(null);

        setForm({
            username: "",
            password: "",
            role: "user",
            email: "",
            dept: "",
            project: "",
        });
        setSelectedHeadingIds([]);
        setSelectedMenuIds([]);
    };

    // =========================================================
    // FORM CHANGE
    // =========================================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // =========================================================
    // ADD / UPDATE USER
    // =========================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.username.trim()) {
            showAlert("warning", "Validation", "Username is required.");
            return;
        }

        if (!form.email.trim()) {
            showAlert("warning", "Validation", "Email is required.");
            return;
        }

        // Password required only for new user
        if (!editId && !form.password.trim()) {
            showAlert("warning", "Validation", "Password is required.");
            return;
        }

        setSaving(true);

        try {
            // =====================================================
            // ADD USER
            // =====================================================

            if (!editId) {
                const { data: existingUser, error: existingError } = await supabase
                    .from("users")
                    .select("id")
                    .eq("username", form.username.trim())
                    .maybeSingle();

                if (existingError) {
                    throw existingError;
                }

                if (existingUser) {
                    showAlert(
                        "warning",
                        "Already Exists",
                        "This username already exists."
                    );

                    setSaving(false);
                    return;
                }

                const { error } = await supabase.from("users").insert([
                    {
                        username: form.username.trim(),
                        password: form.password.trim(),
                        role: form.role,
                        email: form.email.trim(),
                        dept: form.dept.trim(),
                        project: selectedHeadingIds.length
                            ? headings.filter((h) => selectedHeadingIds.includes(Number(h.id))).map((h) => h.headingname).join(", ")
                            : (form.role.toLowerCase() === "admin" ? "All Main Headings" : ""),
                    },
                ]);

                if (error) {
                    throw error;
                }

                const { data: newUser } = await supabase.from("users").select("id").eq("username", form.username.trim()).maybeSingle();
                if (newUser) {
                    await supabase.from("user_main_heading_access").delete().eq("user_id", newUser.id);
                    if (selectedHeadingIds.length) {
                        await supabase.from("user_main_heading_access").insert(selectedHeadingIds.map(id => ({ user_id: newUser.id, main_heading_id: Number(id), created_by: username })));
                    }
                    if (selectedMenuIds.length) {
                        await supabase.from("user_menu_access").insert(selectedMenuIds.map(id => ({ user_id: newUser.id, menu_id: Number(id), created_by: username })));
                    }
                }

                showAlert(
                    "success",
                    "Success",
                    "User added successfully."
                );
            }

            // =====================================================
            // UPDATE USER
            // =====================================================

            else {
                const updateData = {
                    username: form.username.trim(),
                    role: form.role,
                    email: form.email.trim(),
                    dept: form.dept.trim(),
                    project: selectedHeadingIds.length
                        ? headings.filter((h) => selectedHeadingIds.includes(Number(h.id))).map((h) => h.headingname).join(", ")
                        : (form.role.toLowerCase() === "admin" ? "All Main Headings" : ""),
                };

                // Only update password if user entered a new password
                if (form.password.trim()) {
                    updateData.password = form.password.trim();
                }

                const { error } = await supabase
                    .from("users")
                    .update(updateData)
                    .eq("id", editId);

                if (error) {
                    throw error;
                }

                await supabase.from("user_main_heading_access").delete().eq("user_id", editId);
                if (selectedHeadingIds.length) {
                    const { error: accessError } = await supabase.from("user_main_heading_access").insert(selectedHeadingIds.map(id => ({ user_id: editId, main_heading_id: Number(id), created_by: username })));
                    if (accessError) throw accessError;
                }

                await supabase.from("user_menu_access").delete().eq("user_id", editId);
                if (selectedMenuIds.length) {
                    const { error: menuAccessError } = await supabase.from("user_menu_access").insert(selectedMenuIds.map(id => ({ user_id: editId, menu_id: Number(id), created_by: username })));
                    if (menuAccessError) throw menuAccessError;
                }

                showAlert(
                    "success",
                    "Success",
                    "User updated successfully."
                );
            }

            closeModal();
            fetchUsers();
        } catch (error) {
            console.error(error);

            showAlert(
                "danger",
                "Error",
                error.message || "Something went wrong."
            );
        }

        setSaving(false);
    };

    // =========================================================
    // DELETE USER
    // =========================================================

    const confirmDelete = async (id) => {
        setSaving(true);

        try {
            const { error } = await supabase
                .from("users")
                .delete()
                .eq("id", id);

            if (error) {
                throw error;
            }

            showAlert(
                "success",
                "Success",
                "User deleted successfully."
            );

            setDeleteId(null);

            fetchUsers();
        } catch (error) {
            console.error(error);

            showAlert(
                "danger",
                "Error",
                error.message || "Unable to delete user."
            );
        }

        setSaving(false);
    };

    // =========================================================
    // ROLE BADGE
    // =========================================================

    const roleBadge = (userRole) => {
        const currentRole = (userRole || "").toLowerCase();

        if (currentRole === "admin") {
            return "badge-light-danger";
        }

        return "badge-light-success";
    };

    // =========================================================
    // AVATAR
    // =========================================================

    const getInitial = (name) => {
        if (!name) return "?";

        return name.trim().charAt(0).toUpperCase();
    };

    // =========================================================
    // EXPORT CSV
    // =========================================================

    const exportCSV = () => {
        const headers = [
            "ID",
            "Username",
            "Email",
            "Role",
            "Department",
            "Project",
        ];

        const rows = filteredUsers.map((user) => [
            user.id,
            user.username || "",
            user.email || "",
            user.role || "",
            user.dept || "",
            user.project || "",
        ]);

        const csvContent = [
            headers,
            ...rows,
        ]
            .map((row) =>
                row
                    .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "User_Profiles.csv";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        setShowExportMenu(false);
    };

    // =========================================================
    // EXPORT EXCEL
    // =========================================================

    const exportExcel = () => {
        const headers = [
            "ID",
            "Username",
            "Email",
            "Role",
            "Department",
            "Project",
        ];

        const rows = filteredUsers.map((user) => [
            user.id,
            user.username || "",
            user.email || "",
            user.role || "",
            user.dept || "",
            user.project || "",
        ]);

        let tableHTML = `
      <table border="1">
        <tr>
          ${headers.map((h) => `<th>${h}</th>`).join("")}
        </tr>
        ${rows
                .map(
                    (row) => `
              <tr>
                ${row.map((value) => `<td>${value}</td>`).join("")}
              </tr>
            `
                )
                .join("")}
      </table>
    `;

        const blob = new Blob(
            [
                `
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body>
            ${tableHTML}
          </body>
        </html>
        `,
            ],
            {
                type: "application/vnd.ms-excel",
            }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "User_Profiles.xls";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        setShowExportMenu(false);
    };

    // =========================================================
    // COPY
    // =========================================================

    const copyUsers = async () => {
        const text = filteredUsers
            .map(
                (user) =>
                    `${user.id}\t${user.username || ""}\t${user.email || ""}\t${user.role || ""
                    }\t${user.dept || ""}\t${user.project || ""}`
            )
            .join("\n");

        try {
            await navigator.clipboard.writeText(text);

            showAlert(
                "success",
                "Copied",
                "User data copied to clipboard."
            );
        } catch (error) {
            console.error(error);

            showAlert(
                "danger",
                "Error",
                "Unable to copy data."
            );
        }

        setShowExportMenu(false);
    };

    // =========================================================
    // ADMIN ACCESS
    // =========================================================

    if (!isAdmin) {
        return (
            <div className="d-flex flex-column flex-root">
                <div className="d-flex flex-column flex-column-fluid">
                    <div className="container-fluid py-10">
                        <div className="card shadow-sm">
                            <div className="card-body text-center py-20">
                                <i className="ki-duotone ki-shield-cross fs-5x text-danger mb-5">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                    <span className="path3"></span>
                                </i>

                                <h2 className="fw-bold text-gray-800">
                                    Access Denied
                                </h2>

                                <p className="text-muted fs-5">
                                    Only administrators can manage user profiles.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        );
    }

    // =========================================================
    // UI
    // =========================================================

    return (
        <div className="d-flex flex-column flex-root">
            <div className="d-flex flex-column flex-column-fluid">

                <div className="container-fluid py-5">

                    {/* =================================================
              ALERT
          ================================================= */}

                    {alert && (
                        <div
                            className={`alert alert-${alert.type} d-flex align-items-center mb-5`}
                        >
                            <div>
                                <strong>{alert.title}</strong>
                                <div>{alert.message}</div>
                            </div>

                            <button
                                type="button"
                                className="btn btn-sm ms-auto"
                                onClick={() => setAlert(null)}
                            >
                                ×
                            </button>
                        </div>
                    )}
                    <div className="row g-5 mb-8">

                        {/* TOTAL USERS */}

                        <div className="col-md-4">
                            <div className="card card-flush h-md-100 shadow-sm">
                                <div className="card-body d-flex align-items-center">

                                    <div className="symbol symbol-60px me-5">
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
                                        <div className="fs-2hx fw-bold text-gray-900">
                                            {totalUsers}
                                        </div>

                                        <div className="fs-6 text-muted">
                                            Total Users
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* ADMINISTRATORS */}

                        <div className="col-md-4">
                            <div className="card card-flush h-md-100 shadow-sm">
                                <div className="card-body d-flex align-items-center">

                                    <div className="symbol symbol-60px me-5">
                                        <span className="symbol-label bg-light-danger">
                                            <i className="ki-duotone ki-shield-tick fs-2x text-danger">
                                                <span className="path1"></span>
                                                <span className="path2"></span>
                                                <span className="path3"></span>
                                            </i>
                                        </span>
                                    </div>

                                    <div>
                                        <div className="fs-2hx fw-bold text-gray-900">
                                            {adminUsers}
                                        </div>

                                        <div className="fs-6 text-muted">
                                            Administrators
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* NORMAL USERS */}

                        <div className="col-md-4">
                            <div className="card card-flush h-md-100 shadow-sm">
                                <div className="card-body d-flex align-items-center">

                                    <div className="symbol symbol-60px me-5">
                                        <span className="symbol-label bg-light-success">
                                            <i className="ki-duotone ki-user fs-2x text-success">
                                                <span className="path1"></span>
                                                <span className="path2"></span>
                                            </i>
                                        </span>
                                    </div>

                                    <div>
                                        <div className="fs-2hx fw-bold text-gray-900">
                                            {normalUsers}
                                        </div>

                                        <div className="fs-6 text-muted">
                                            Normal Users
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>

                    {/* =================================================
              USER TABLE CARD
          ================================================= */}

                    <div className="card shadow-sm">

                        {/* HEADER */}

                        <div className="card-header border-0 pt-6">

                            <div className="card-title">
                                <h3 className="fw-bold mb-0">
                                    All Users
                                </h3>
                            </div>

                            <div className="card-toolbar flex-row-fluid justify-content-end gap-3 position-relative">

                                {/* SEARCH */}

                                <div className="w-250px">
                                    <div className="position-relative">

                                        <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-4 mt-3">
                                            <span className="path1"></span>
                                            <span className="path2"></span>
                                        </i>

                                        <input
                                            type="text"
                                            className="form-control form-control-solid ps-12"
                                            placeholder="Search users..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />

                                    </div>
                                </div>

                                {/* ROLE FILTER */}

                                <div className="w-150px">
                                    <select
                                        className="form-select form-select-solid"
                                        value={roleFilter}
                                        onChange={(e) =>
                                            setRoleFilter(e.target.value)
                                        }
                                    >
                                        <option value="all">All</option>
                                        <option value="admin">Admin</option>
                                        <option value="user">Users</option>
                                    </select>
                                </div>

                                {/* EXPORT */}

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

                                {/* EXPORT MENU */}

                                {showExportMenu && (
                                    <div
                                        className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-175px py-4"
                                        style={{
                                            display: "block",
                                            position: "absolute",
                                            top: "100%",
                                            right: "0",
                                            marginTop: "10px",
                                            zIndex: 1000,
                                            background: "#fff",
                                            boxShadow:
                                                "0 10px 30px rgba(0,0,0,0.12)",
                                        }}
                                    >

                                        <div className="menu-item px-3">
                                            <button
                                                type="button"
                                                className="menu-link px-3 border-0 bg-transparent w-100 text-start"
                                                onClick={copyUsers}
                                            >
                                                Copy to clipboard
                                            </button>
                                        </div>

                                        <div className="menu-item px-3">
                                            <button
                                                type="button"
                                                className="menu-link px-3 border-0 bg-transparent w-100 text-start"
                                                onClick={exportExcel}
                                            >
                                                Export as Excel
                                            </button>
                                        </div>

                                        <div className="menu-item px-3">
                                            <button
                                                type="button"
                                                className="menu-link px-3 border-0 bg-transparent w-100 text-start"
                                                onClick={exportCSV}
                                            >
                                                Export as CSV
                                            </button>
                                        </div>

                                    </div>
                                )}
                                <button
                                    className="btn btn-primary"
                                    onClick={openAddModal}
                                >
                                    <i className="ki-duotone ki-plus fs-2">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                        <span className="path3"></span>
                                        <span className="path4"></span>
                                    </i>

                                    Add User
                                </button>
                            </div>
                        </div>

                        {/* =================================================
                TABLE
            ================================================= */}

                        <div className="card-body pt-0">

                            <div className="table-responsive">

                                <table className="table align-middle table-row-dashed fs-6 gy-5">

                                    <thead>

                                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">

                                            <th className="min-w-50px">
                                                #
                                            </th>

                                            <th className="min-w-200px">
                                                User
                                            </th>

                                            <th className="min-w-250px">
                                                Email
                                            </th>

                                            <th className="min-w-100px">
                                                Role
                                            </th>

                                            <th className="min-w-150px">
                                                Department
                                            </th>

                                            <th className="min-w-180px">
                                                Main Heading Access
                                            </th>

                                            <th className="min-w-220px">
                                                Menu Access
                                            </th>

                                            <th className="text-end min-w-150px">
                                                Action
                                            </th>

                                        </tr>

                                    </thead>

                                    <tbody className="fw-semibold text-gray-600">

                                        {loading ? (
                                            <tr>
                                                <td
                                                    colSpan="8"
                                                    className="text-center py-15"
                                                >
                                                    <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                                                    Loading users...
                                                </td>
                                            </tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="text-center py-15 text-muted"
                                                >
                                                    No users found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((user, index) => (

                                                <tr key={user.id}>

                                                    {/* INDEX */}

                                                    <td className="text-gray-500">
                                                        {index + 1}
                                                    </td>

                                                    {/* USER */}

                                                    <td>

                                                        <div className="d-flex align-items-center">

                                                            {/* FIRST LETTER */}

                                                            <div className="symbol symbol-40px me-4">

                                                                <span className="symbol-label bg-light-primary text-primary fw-bold fs-5">
                                                                    {getInitial(user.username)}
                                                                </span>

                                                            </div>

                                                            {/* NAME + ID */}

                                                            <div className="d-flex flex-column">

                                                                <span className="text-gray-900 fw-bold text-hover-primary mb-1">
                                                                    {user.username || "-"}
                                                                </span>

                                                                <span className="text-muted fs-7">
                                                                    ID: {user.id}
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* EMAIL */}

                                                    <td>
                                                        <span className="text-gray-700">
                                                            {user.email || "-"}
                                                        </span>
                                                    </td>

                                                    {/* ROLE */}

                                                    <td>

                                                        <span
                                                            className={`badge ${roleBadge(
                                                                user.role
                                                            )}`}
                                                        >
                                                            {(user.role || "User")
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                (user.role || "User")
                                                                    .slice(1)
                                                                    .toLowerCase()}
                                                        </span>

                                                    </td>

                                                    {/* DEPARTMENT */}

                                                    <td>
                                                        {user.dept || "-"}
                                                    </td>

                                                    {/* MAIN HEADING ACCESS */}
                                                    <td>
                                                        {userHeadingMap[user.id]?.length
                                                            ? userHeadingMap[user.id].join(", ")
                                                            : ((user.role || "").toLowerCase() === "admin" ? "All Main Headings" : "-")}
                                                    </td>

                                                    {/* MENU ACCESS */}
                                                    <td>
                                                        {userMenuMap[user.id]?.length
                                                            ? userMenuMap[user.id].join(", ")
                                                            : ((user.role || "").toLowerCase() === "admin" ? "All Menus" : "-")}
                                                    </td>

                                                    {/* ACTION */}

                                                    <td className="text-end">

                                                        {deleteId === user.id ? (

                                                            <div className="d-flex justify-content-end align-items-center">

                                                                <span className="text-danger fs-8 me-3">
                                                                    Delete?
                                                                </span>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-danger me-1"
                                                                    disabled={saving}
                                                                    onClick={() =>
                                                                        confirmDelete(user.id)
                                                                    }
                                                                >
                                                                    Yes
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light"
                                                                    disabled={saving}
                                                                    onClick={() =>
                                                                        setDeleteId(null)
                                                                    }
                                                                >
                                                                    No
                                                                </button>

                                                            </div>

                                                        ) : (

                                                            <>

                                                                {/* EDIT */}

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-icon btn-light-primary me-2"
                                                                    title="Edit User"
                                                                    onClick={() =>
                                                                        openEditModal(user)
                                                                    }
                                                                >
                                                                    <i className="ki-duotone ki-pencil fs-4">
                                                                        <span className="path1"></span>
                                                                        <span className="path2"></span>
                                                                    </i>
                                                                </button>

                                                                {/* DELETE */}

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-icon btn-light-danger"
                                                                    title="Delete User"
                                                                    onClick={() =>
                                                                        setDeleteId(user.id)
                                                                    }
                                                                >
                                                                    <i className="ki-duotone ki-trash fs-4">
                                                                        <span className="path1"></span>
                                                                        <span className="path2"></span>
                                                                        <span className="path3"></span>
                                                                        <span className="path4"></span>
                                                                        <span className="path5"></span>
                                                                    </i>
                                                                </button>

                                                            </>

                                                        )}

                                                    </td>

                                                </tr>

                                            ))
                                        )}

                                    </tbody>

                                </table>

                            </div>

                            {/* TABLE FOOTER */}

                            <div className="d-flex justify-content-between align-items-center pt-5">

                                <div className="text-muted fs-7">
                                    Showing{" "}
                                    <strong>
                                        {filteredUsers.length}
                                    </strong>{" "}
                                    of{" "}
                                    <strong>
                                        {users.length}
                                    </strong>{" "}
                                    users
                                </div>

                            </div>

                        </div>
                    </div>

                </div>

            </div>

            {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

            {showModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    role="dialog"
                    style={{
                        backgroundColor: "rgba(0,0,0,0.45)",
                    }}
                >

                    <div
                        className="modal-dialog modal-dialog-centered modal-lg"
                        role="document"
                    >

                        <div className="modal-content">

                            {/* MODAL HEADER */}

                            <div className="modal-header">

                                <h2 className="fw-bold mb-0">
                                    {editId
                                        ? "Edit User"
                                        : "Add New User"}
                                </h2>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-icon btn-light"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    <i className="ki-duotone ki-cross fs-2">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                    </i>
                                </button>

                            </div>

                            {/* MODAL BODY */}

                            <form onSubmit={handleSubmit}>

                                <div className="modal-body">

                                    <div className="row g-5">

                                        {/* USERNAME */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-bold">
                                                Username
                                            </label>

                                            <input
                                                type="text"
                                                name="username"
                                                className="form-control form-control-solid"
                                                placeholder="Enter username"
                                                value={form.username}
                                                onChange={handleChange}
                                                required
                                            />

                                        </div>

                                        {/* ROLE */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-bold">
                                                Role
                                            </label>

                                            <select
                                                name="role"
                                                className="form-select form-select-solid"
                                                value={form.role}
                                                onChange={handleChange}
                                            >
                                                <option value="user">
                                                    User
                                                </option>

                                                <option value="admin">
                                                    Admin
                                                </option>
                                            </select>

                                        </div>

                                        {/* EMAIL */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-bold">
                                                Email
                                            </label>

                                            <input
                                                type="email"
                                                name="email"
                                                className="form-control form-control-solid"
                                                placeholder="user@example.com"
                                                value={form.email}
                                                onChange={handleChange}
                                                required
                                            />

                                        </div>

                                        {/* PASSWORD */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-bold">
                                                Password
                                            </label>

                                            <input
                                                type="password"
                                                name="password"
                                                className="form-control form-control-solid"
                                                placeholder={
                                                    editId
                                                        ? "Leave blank to keep current password"
                                                        : "Enter password"
                                                }
                                                value={form.password}
                                                onChange={handleChange}
                                                required={!editId}
                                            />

                                            {editId && (
                                                <div className="form-text">
                                                    Leave blank if you don't want to change
                                                    the password.
                                                </div>
                                            )}

                                        </div>

                                        {/* DEPARTMENT */}

                                        <div className="col-md-6">

                                            <label className="form-label fw-bold">
                                                Department
                                            </label>

                                            <input
                                                type="text"
                                                name="dept"
                                                className="form-control form-control-solid"
                                                placeholder="e.g. G&PS"
                                                value={form.dept}
                                                onChange={handleChange}
                                            />

                                        </div>

                                        {/* MAIN HEADING + MENU ACCESS */}
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Main Heading & Menu Access</label>
                                            <div className="border rounded p-4 bg-light">
                                                {headings.length === 0 ? (
                                                    <span className="text-muted">No Main Headings available. Create them from Manage Main Heading.</span>
                                                ) : headings.map((heading) => {
                                                    const headingId = Number(heading.id);
                                                    const headingMenus = menus.filter((menu) => Number(menu.main_heading_id) === headingId);
                                                    const headingSelected = selectedHeadingIds.includes(headingId);

                                                    return (
                                                        <div key={heading.id} className="mb-5">
                                                            <label className="d-flex align-items-center mb-3">
                                                                <input
                                                                    type="checkbox"
                                                                    className="form-check-input me-3"
                                                                    checked={headingSelected}
                                                                    onChange={(e) => {
                                                                        setSelectedHeadingIds((prev) =>
                                                                            e.target.checked
                                                                                ? [...new Set([...prev, headingId])]
                                                                                : prev.filter((id) => id !== headingId)
                                                                        );
                                                                        if (!e.target.checked) {
                                                                            setSelectedMenuIds((prev) =>
                                                                                prev.filter((menuId) =>
                                                                                    !headingMenus.some((menu) => Number(menu.id) === Number(menuId))
                                                                                )
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="fw-bold">{heading.headingname}</span>
                                                            </label>

                                                            <div className="ms-8">
                                                                {headingMenus.length === 0 ? (
                                                                    <div className="text-muted fs-7">No menus under this Main Heading.</div>
                                                                ) : headingMenus.map((menu) => (
                                                                    <label key={menu.id} className="d-flex align-items-center mb-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input me-3"
                                                                            disabled={!headingSelected}
                                                                            checked={selectedMenuIds.includes(Number(menu.id))}
                                                                            onChange={(e) =>
                                                                                setSelectedMenuIds((prev) =>
                                                                                    e.target.checked
                                                                                        ? [...new Set([...prev, Number(menu.id)])]
                                                                                        : prev.filter((id) => id !== Number(menu.id))
                                                                                )
                                                                            }
                                                                        />
                                                                        <span>{menu.menuname}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="form-text">
                                                Select the Main Heading first, then select the specific menus this user can access. Admins have access to all Main Headings and Menus.
                                            </div>
                                        </div>

                                        {/* PROJECT / MAIN HEADING */}

                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Project / Main Heading Access</label>
                                            <div className="form-control form-control-solid bg-light">
                                                {selectedHeadingIds.length
                                                    ? headings.filter((h) => selectedHeadingIds.includes(Number(h.id))).map((h) => h.headingname).join(", ")
                                                    : (form.role.toLowerCase() === "admin" ? "All Main Headings" : "Select Main Heading Access above")}
                                            </div>
                                            <div className="form-text">Project is automatically stored as the user's assigned Main Heading name(s). Menu permissions are stored separately.</div>
                                        </div>

                                    </div>

                                </div>

                                {/* MODAL FOOTER */}

                                <div className="modal-footer">

                                    <button
                                        type="button"
                                        className="btn btn-light"
                                        onClick={closeModal}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Saving...
                                            </>
                                        ) : editId ? (
                                            "Update User"
                                        ) : (
                                            "Add User"
                                        )}
                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>

                </div>
            )}

            <Footer />

        </div>
    );
};

export default UserProfiles;