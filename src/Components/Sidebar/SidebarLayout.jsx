import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./SidebarLayout.css";
import logodefault from "../Assets/logos/logo-default.svg";
import logominimize from "../Assets/logos/logo-compact.svg";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/mydata": "My Data",
  "/nangia": "Nangia",
  "/changepassword": "Change Password",
  "/manageupload": "Manage Uploads",
  "/pendingapprovals": "Pending Approvals",
  "/managefolder": "Manage Folder",
  "/managemenu": "Manage Menu",
  "/uploadfile": "Upload Files",
  "/nr/dashboard": "NR Dashboard",
};

const sessionTitles = {
  dashboarddesign: "Dashboard Design",
  letter: "Letter",
  meeting: "Meeting",
  studydata: "Study Data",
  visitdata: "Visit Data",
  policy: "Policy",
  reports: "Reports",
  questions: "Questions",
  researchpaper: "Research Paper",
  summarization: "Summarization",
  format: "Format",
};

// routes that live inside the collapsible "File Management" accordion
const FILE_MGMT_PATHS = [
  "/uploadfile",
  "/managefolder",
  "/managemenu",
  "/manageupload",
  "/pendingapprovals",
];

const SidebarLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const currentPath = location.pathname;

  const sessionPage =
    currentPath === "/nr/display"
      ? localStorage.getItem("current_page") || ""
      : "";

  const isNrActive = currentPath.startsWith("/nr");
  const isFileMgmtActive = FILE_MGMT_PATHS.includes(currentPath);

  const [openNR, setOpenNR] = useState(isNrActive);
  const [openFiles, setOpenFiles] = useState(isFileMgmtActive);

  const user = (localStorage.getItem("user") || "User").trim();

  const role = localStorage.getItem("role") || "user";
  const email = localStorage.getItem("email");

  const isAdmin = role.toLowerCase() === "admin";

  const userInitial = user.charAt(0).toUpperCase();

  const userDisplay = user.charAt(0).toUpperCase() + user.slice(1);
  const restrictedPages = {
    user: [
      "studydata", // User cannot access this
    ],
  };
  const hasAccess = (page) => {
    if (isAdmin) return true;

    return !(restrictedPages.user || []).includes(page);
  };
  // Sync NR accordion when route changes
  useEffect(() => {
    if (currentPath.startsWith("/nr")) {
      setOpenNR(true);
    }
  }, [currentPath]);

  // Sync File Management accordion when route changes
  useEffect(() => {
    if (FILE_MGMT_PATHS.includes(currentPath)) {
      setOpenFiles(true);
    }
  }, [currentPath]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  useEffect(() => {
    if (!isAdmin && currentPath === "/dashboard") {
      navigate("/nr/dashboard");
    }
  }, [isAdmin, currentPath, navigate]);

  // Keep non-admins out of admin-only pages even if they hit the URL directly
  useEffect(() => {
    if (!isAdmin && (currentPath === "/manageupload" || currentPath === "/pendingapprovals")) {
      navigate("/nr/dashboard");
    }
  }, [isAdmin, currentPath, navigate]);

  useEffect(() => {
    if (!isAdmin && currentPath === "/nr/display") {
      const page = localStorage.getItem("current_page");

      if (!hasAccess(page)) {
        navigate(-1);
      }
    }
  }, [currentPath, isAdmin, navigate]);
  // Lock body scroll on mobile when sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  useEffect(() => {
    const el = document.getElementById("kt_content");
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 10);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  // Title logic
  let currentTitle =
    currentPath === "/nr/display" && sessionPage
      ? sessionTitles[sessionPage] || "Data"
      : pageTitles[currentPath] || "Dashboard";

  // NR navigation via localStorage (replaces PHP POST form)
  const handleNrNavigation = (slug) => {
    localStorage.setItem("current_page", slug);
    navigate("/nr/display");
  };
  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        {/* ===== OVERLAY (mobile only) ===== */}
        {mobileOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* ===== SIDEBAR ===== */}
        <div
          id="kt_aside"
          className={`aside${mobileOpen ? " show-mobile" : ""}`}
        >
          {/* Logo */}
          <div
            className="aside-logo flex-column-auto pt-9 pb-7 px-9"
            id="kt_aside_logo"
          >
            <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
              <img
                alt="Logo"
                src={logodefault}
                className="max-h-50px logo-default"
              />
              <img
                alt="Logo"
                src={logominimize}
                className="max-h-50px logo-minimize"
              />
            </Link>
          </div>

          {/* Menu */}
          <div className="aside-menu flex-column-fluid px-3 px-lg-6">
            <div
              className="menu menu-column menu-sub-indention menu-active-bg menu-pill menu-title-gray-600 menu-icon-gray-500 menu-state-primary menu-arrow-gray-500 fw-semibold fs-5 my-5 mt-lg-2 mb-lg-0"
              id="kt_aside_menu"
            >
              <div
                className="hover-scroll-y me-n3 pe-3"
                id="kt_aside_menu_wrapper"
              >
                {/* Dashboard */}
                {isAdmin && (
                  <div className="menu-item">
                    <Link
                      className={`menu-link${currentPath === "/dashboard" ? " active" : ""}`}
                      to="/dashboard"
                    >
                      <span className="menu-icon">
                        <i className="ki-duotone ki-element-11 fs-2">
                          <span className="path1"></span>
                          <span className="path2"></span>
                          <span className="path3"></span>
                          <span className="path4"></span>
                          <span className="path5"></span>
                          <span className="path6"></span>
                        </i>
                      </span>
                      <span className="menu-title">Dashboards</span>
                    </Link>
                  </div>
                )}

                {/* Admin Only Menus */}
                {isAdmin && (
                  <>
                    {/* My Data */}
                    <div className="menu-item">
                      <Link
                        className={`menu-link${currentPath === "/mydata" ? " active" : ""}`}
                        to="/mydata"
                      >
                        <span className="menu-icon">
                          <i className="ki-duotone ki-folder fs-2">
                            <span className="path1"></span>
                            <span className="path2"></span>
                          </i>
                        </span>
                        <span className="menu-title">My Data</span>
                      </Link>
                    </div>

                    {/* Nangia */}
                    <div className="menu-item">
                      <Link
                        className={`menu-link${currentPath === "/nangia" ? " active" : ""}`}
                        to="/nangia"
                      >
                        <span className="menu-icon">
                          <i className="ki-duotone ki-briefcase fs-2">
                            <span className="path1"></span>
                            <span className="path2"></span>
                          </i>
                        </span>
                        <span className="menu-title">Nangia</span>
                      </Link>
                    </div>
                  </>
                )}

                {/* ===== File Management Accordion =====
                     Upload Files / Manage Folder / Manage Menu -> visible to everyone
                     Manage Uploads / Pending Approvals -> admin only */}
                <div
                  className={`menu-item menu-accordion mb-1${openFiles ? " show" : ""}`}
                >
                  <div
                    className={`menu-link${isFileMgmtActive ? " active" : ""}`}
                    onClick={() => setOpenFiles((prev) => !prev)}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="menu-icon">
                      <i className="ki-duotone ki-folder-added fs-2">
                        <span className="path1"></span>
                        <span className="path2"></span>
                      </i>
                    </span>
                    <span className="menu-title">File Management</span>
                    <span className="menu-arrow"></span>
                  </div>

                  <div className="menu-sub menu-sub-accordion">
                    {/* Upload Files - everyone */}
                    <div className="menu-item">
                      <Link
                        className={`menu-link${currentPath === "/uploadfile" ? " active" : ""}`}
                        to="/uploadfile"
                      >
                        <span className="menu-icon">
                          <i className="ki-duotone ki-cloud-add fs-2">
                            <span className="path1"></span>
                            <span className="path2"></span>
                          </i>
                        </span>
                        <span className="menu-title">Upload Files</span>
                      </Link>
                    </div>

                    {/* Manage Folder - everyone */}
                    <div className="menu-item">
                      <Link
                        className={`menu-link${currentPath === "/managefolder" ? " active" : ""}`}
                        to="/managefolder"
                      >
                        <span className="menu-icon">
                          <i className="ki-duotone ki-folder-added fs-2">
                            <span className="path1"></span>
                            <span className="path2"></span>
                          </i>
                        </span>
                        <span className="menu-title">Manage Folder</span>
                      </Link>
                    </div>

                    {/* Manage Menu - everyone */}
                    <div className="menu-item">
                      <Link
                        className={`menu-link${currentPath === "/managemenu" ? " active" : ""}`}
                        to="/managemenu"
                      >
                        <span className="menu-icon">
                          <i className="ki-duotone ki-category fs-2">
                            <span className="path1"></span>
                            <span className="path2"></span>
                          </i>
                        </span>
                        <span className="menu-title">Manage Menu</span>
                      </Link>
                    </div>

                    {/* Manage Uploads - ADMIN ONLY */}
                    {isAdmin && (
                      <div className="menu-item">
                        <Link
                          className={`menu-link${currentPath === "/manageupload" ? " active" : ""}`}
                          to="/manageupload"
                        >
                          <span className="menu-icon">
                            <i className="ki-duotone ki-document fs-2">
                              <span className="path1"></span>
                              <span className="path2"></span>
                            </i>
                          </span>
                          <span className="menu-title">Manage Uploads</span>
                        </Link>
                      </div>
                    )}

                    {/* Pending Approvals - ADMIN ONLY */}
                    {isAdmin && (
                      <div className="menu-item">
                        <Link
                          className={`menu-link${currentPath === "/pendingapprovals" ? " active" : ""}`}
                          to="/pendingapprovals"
                        >
                          <span className="menu-icon">
                            <i className="ki-duotone ki-check-square fs-2">
                              <span className="path1"></span>
                              <span className="path2"></span>
                            </i>
                          </span>
                          <span className="menu-title">Pending Approvals</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* NR Data Accordion */}
                <div
                  className={`menu-item menu-accordion mb-1${openNR ? " show" : ""}`}
                >
                  <div
                    className={`menu-link${isNrActive ? " active" : ""}`}
                    onClick={() => setOpenNR((prev) => !prev)}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="menu-icon">
                      <i className="ki-duotone ki-delivery fs-2">
                        <span className="path1"></span>
                        <span className="path2"></span>
                        <span className="path3"></span>
                        <span className="path4"></span>
                      </i>
                    </span>
                    <span className="menu-title">NR Data</span>
                    <span className="menu-arrow"></span>
                  </div>

                  <div className="menu-sub menu-sub-accordion">
                    {/* NR Dashboard (direct link) */}
                    <div className="menu-item">
                      <Link
                        className={`menu-link${currentPath === "/nr/dashboard" ? " active" : ""}`}
                        to="/nr/dashboard"
                      >
                        <span className="menu-bullet">
                          <span className="bullet bullet-dot"></span>
                        </span>
                        <span className="menu-title">Dashboard</span>
                      </Link>
                    </div>

                    {/* Dynamic NR items (same order as PHP) */}
                    {[
                      "dashboarddesign",
                      "studydata",
                      "reports",
                      "format",
                      "meeting",
                      "policy",
                      "questions",
                      "researchpaper",
                      "summarization",
                      "visitdata",
                      "letter",
                    ]
                      .filter((key) => hasAccess(key))
                      .map((key) => {
                        const isActive =
                          currentPath === "/nr/display" && sessionPage === key;
                        return (
                          <div className="menu-item" key={key}>
                            <button
                              onClick={() => handleNrNavigation(key)}
                              className={`menu-link w-100${isActive ? " active" : ""}`}
                              style={{ background: "none", border: "none" }}
                            >
                              <span className="menu-bullet">
                                <span
                                  className={`bullet bullet-dot${isActive ? " bg-primary" : ""}`}
                                ></span>
                              </span>
                              <span className="menu-title">
                                {sessionTitles[key]}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="mt-4"></div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAIN WRAPPER ===== */}
        <div
          className="wrapper d-flex flex-column flex-row-fluid"
          id="kt_wrapper"
        >
          {/* ===== HEADER ===== */}
          <div
            id="kt_header"
            className={scrolled ? "header header-scrolled" : "header"}
          >
            <div
              className="container-fluid d-flex align-items-center justify-content-between px-4 px-lg-6"
              id="kt_header_container"
              style={{ minHeight: "60px" }}
            >
              {/* ── MOBILE HEADER (visible only < lg) ── */}
              <div className="d-flex d-lg-none align-items-center justify-content-between w-100">
                {/* Left: Hamburger + User Circle */}
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="mobile-hamburger btn btn-icon btn-active-light-primary"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Open sidebar"
                  >
                    <i className="ki-duotone ki-abstract-14 fs-1">
                      <span className="path1"></span>
                      <span className="path2"></span>
                    </i>
                  </button>
                  <div
                    className="symbol symbol-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                    style={{ width: "36px", height: "36px", fontSize: "14px" }}
                  >
                    {userInitial}
                  </div>
                </div>

                {/* Right: Avatar + Name + Role + Logout */}
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="symbol symbol-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                    style={{ width: "36px", height: "36px", fontSize: "14px" }}
                  >
                    {userInitial}
                  </div>
                  <div>
                    <div className="fw-semibold text-dark lh-1">
                      {userDisplay}
                    </div>
                    <div className="text-muted fs-7">
                      {isAdmin ? "Admin" : "User"}
                    </div>
                  </div>
                  <Link
                    to="/"
                    className="d-flex align-items-center justify-content-center rounded-circle text-danger"
                    style={{
                      width: "32px",
                      height: "32px",
                      transition: "0.3s",
                    }}
                    onClick={() => localStorage.clear()}
                    title="Logout"
                  >
                    <i className="bi bi-box-arrow-right fs-5"></i>
                  </Link>
                </div>
              </div>

              {/* ── DESKTOP HEADER (visible only ≥ lg) ── */}
              <div className="d-none d-lg-flex align-items-center justify-content-between w-100">
                {/* Left: Page Title + Breadcrumb */}
                <div className="page-title d-flex flex-column align-items-start justify-content-center me-2">
                  <h1 className="text-gray-900 fw-bold mt-1 mb-1 fs-2">
                    {currentTitle}
                    <small className="text-muted fs-6 fw-normal ms-1"></small>
                  </h1>
                  <ul className="breadcrumb fw-semibold fs-base mb-1">
                    <li className="breadcrumb-item text-muted">
                      <Link
                        to="/dashboard"
                        className="text-muted text-hover-primary"
                      >
                        Home
                      </Link>
                    </li>
                    {currentPath.startsWith("/nr") && (
                      <li className="breadcrumb-item text-muted">NR Data</li>
                    )}
                    <li className="breadcrumb-item text-muted">
                      {currentTitle}
                    </li>
                  </ul>
                </div>

                {/* Right: User Info + Logout */}
                <div className="position-relative" ref={menuRef}>
                  <div
                    className="d-flex align-items-center"
                    style={{ cursor: "pointer" }}
                    onClick={() => setShowMenu(!showMenu)}
                  >
                    <div
                      className="symbol symbol-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                      style={{
                        width: "40px",
                        height: "40px",
                      }}
                    >
                      {userInitial}
                    </div>

                    <div className="ms-2">
                      <div className="fw-semibold text-dark">{userDisplay}</div>

                      <div className="text-muted fs-7">
                        {isAdmin ? "Admin" : "User"}
                      </div>
                    </div>

                    <i className="bi bi-chevron-down ms-2 text-muted"></i>
                  </div>

                  {showMenu && (
                    <div
                      className="dropdown-menu show shadow border-0 mt-2"
                      style={{
                        right: 0,
                        left: "auto",
                        minWidth: "220px",
                        borderRadius: "12px",
                      }}
                    >
                      <div className="d-flex align-items-center px-3 py-2 border-bottom">
                        <div
                          className="symbol symbol-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold"
                          style={{
                            width: "40px",
                            height: "40px",
                          }}
                        >
                          {userInitial}
                        </div>
                        <div className="ms-2">
                          <div className="fw-semibold text-dark">
                            {userDisplay}{" "}
                            <span className="text-muted fs-9">
                              {" "}
                              ({isAdmin ? "Admin" : "User"})
                            </span>
                          </div>

                          <div className="text-muted fs-7">{email}</div>
                        </div>
                      </div>

                      <Link
                        to="/changepassword"
                        className="dropdown-item py-2"
                        onClick={() => setShowMenu(false)}
                      >
                        <i className="bi bi-key me-2"></i>
                        Change Password
                      </Link>

                      <div className="dropdown-divider"></div>

                      <Link
                        to="/"
                        className="dropdown-item text-danger py-2"
                        onClick={() => {
                          localStorage.clear();
                          setShowMenu(false);
                        }}
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Logout
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== PAGE CONTENT ===== */}
          <div id="kt_content">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default SidebarLayout;