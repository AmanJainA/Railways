import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./SidebarLayout.css";
import logodefault from "../Assets/logos/logo-default.svg";
import logominimize from "../Assets/logos/logo-compact.svg";
import { supabase } from "../../supabase";
import { getAccessibleHeadings, getAccessibleMenus, setCurrentDataContext } from "../Utility/dataAccess";
import { startPresence, markCurrentUserOffline } from "../Utility/presence";
const pageTitles = {
  "/dashboard": "Dashboard",
  "/mydata": "My Data",
  "/nangia": "Nangia",
  "/changepassword": "Change Password",
  "/manageupload": "Manage Uploads",
  "/pendingapprovals": "Pending Approvals",
  "/managefolder": "Manage Folder",
  "/managemenu": "Manage Menu",
  "/pageactivity": "Page Activity",
  "/loginhistory": "Login History",
  "/managetracking": "Manage Tracking",
  "/userprofiles": "User Profiles",
  "/uploadfile": "Upload Files",
  "/nr/dashboard": "Data Dashboard",
  "/managemainheading": "Manage Main Heading",
  "/worktracker": "Work Tracker / Todo",
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
  "/loginhistory",
  "/userprofiles",
  "/pageactivity",
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
      ? sessionStorage.getItem("current_page") || ""
      : "";

  const isNrActive = currentPath.startsWith("/nr");
  const isFileMgmtActive = FILE_MGMT_PATHS.includes(currentPath);

  const [openNR, setOpenNR] = useState(isNrActive);
  const [openFiles, setOpenFiles] = useState(isFileMgmtActive);
  const [headings, setHeadings] = useState([]);
  const [headingMenus, setHeadingMenus] = useState({});
  const [openHeadings, setOpenHeadings] = useState({});

  const user = (sessionStorage.getItem("user") || "User").trim();

  const role = sessionStorage.getItem("role") || "user";
  const email = sessionStorage.getItem("email");

  const isAdmin = role.toLowerCase() === "admin";
  const isSubAdmin = role.toLowerCase() === "subadmin";
  const canApprove = isAdmin || isSubAdmin;

  const userInitial = user.charAt(0).toUpperCase();

  const userDisplay = user.charAt(0).toUpperCase() + user.slice(1);
  const hasAccess = () => true;

  useEffect(() => {
    let cancelled = false;
    let cleanupPresence;

    startPresence().then((cleanup) => {
      if (cancelled) {
        cleanup();
        return;
      }
      cleanupPresence = cleanup;
    });

    return () => {
      cancelled = true;
      if (cleanupPresence) cleanupPresence();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadNavigation = async () => {
      try {
        const hs = await getAccessibleHeadings();
        if (cancelled) return;
        setHeadings(hs);

        const pairs = await Promise.all(
          hs.map(async (h) => [h.id, await getAccessibleMenus(h.id)])
        );
        if (cancelled) return;
        setHeadingMenus(Object.fromEntries(pairs));

        const currentHeadingId = Number(sessionStorage.getItem("current_heading_id"));
        setOpenHeadings(
          Object.fromEntries(
            hs.map((h) => [h.id, Number(h.id) === currentHeadingId])
          )
        );
      } catch (e) {
        console.error("Unable to load data navigation", e);
      }
    };

    loadNavigation();

    const channel = supabase
      .channel("sidebar-main-heading-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "main_heading_master" },
        () => loadNavigation()
      )
      .subscribe();

    const refreshTimer = window.setInterval(loadNavigation, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [isAdmin, currentPath]);
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
    if (currentPath !== "/nr/display" || isAdmin) return;
    (async () => {
      try {
        const allowed = await getAccessibleHeadings();
        const currentHeadingId = Number(sessionStorage.getItem("current_heading_id"));
        if (!allowed.some(h => Number(h.id) === currentHeadingId)) {
          navigate("/nr/dashboard", { replace: true });
        }
      } catch (e) {
        console.error(e);
        navigate("/nr/dashboard", { replace: true });
      }
    })();
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
    currentPath === "/nr/display"
      ? (sessionStorage.getItem("current_menu_name") || sessionTitles[sessionPage] || "Data")
      : pageTitles[currentPath] || "Dashboard";
  const logPageActivity = async (page = null) => {

    try {
      const userId = sessionStorage.getItem("user_id");
      const username = sessionStorage.getItem("user");

      if (!userId || !username) return;

      const ua = navigator.userAgent;

      const browser =
        ua.includes("Edg") ? "Edge" :
          ua.includes("Chrome") ? "Chrome" :
            ua.includes("Firefox") ? "Firefox" :
              ua.includes("Safari") ? "Safari" :
                "Unknown";

      const operatingSystem =
        ua.includes("Windows") ? "Windows" :
          ua.includes("Mac") ? "MacOS" :
            ua.includes("Android") ? "Android" :
              ua.includes("iPhone") || ua.includes("iPad") ? "iOS" :
                ua.includes("Linux") ? "Linux" :
                  "Unknown";

      const deviceType =
        /Mobi|Android|iPhone|iPad/i.test(ua)
          ? "Mobile"
          : "Desktop";

      let ip = "";

      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        ip = data.ip;
      } catch { }

      let pageName = currentTitle;

      if (page) {
        pageName = sessionTitles[page] || page;
      } else if (currentPath === "/nr/display") {
        const slug = sessionStorage.getItem("current_page") || "";
        pageName = sessionTitles[slug] || slug;
      }

      const now = new Date();

      const { error } = await supabase
        .from("page_activity")
        .insert({
          user_id: userId,
          username,
          page_name: pageName,
          page_url: window.location.pathname,
          ip_address: ip,
          browser,
          device_type: deviceType,
          operating_system: operatingSystem,
          visit_time: now.toISOString(),
          activity_date: now.toISOString().split("T")[0],
          visit_count: 1,
        });

      if (error) {
        console.error(error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!currentPath) return;

    logPageActivity();
  }, [currentPath, sessionPage]);


  // NR navigation via localStorage (replaces PHP POST form)
  const handleNrNavigation = async (slug) => {
    sessionStorage.setItem("current_page", slug);

    // Log immediately
    await logPageActivity(slug);

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
                     Manage Uploads -> admin only; Pending Approvals -> admin and subadmin */}
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

                    {(isAdmin || isSubAdmin) && (
                      <div className="menu-item">
                        <Link className={`menu-link${currentPath === "/managemainheading" ? " active" : ""}`} to="/managemainheading">
                          <span className="menu-icon"><i className="ki-duotone ki-category fs-2"><span className="path1"></span><span className="path2"></span></i></span>
                          <span className="menu-title">Manage Main Heading</span>
                        </Link>
                      </div>
                    )}

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
                    {isAdmin && (
                      <div className="menu-item">
                        <Link
                          className={`menu-link${currentPath === "/managetracking" ? " active" : ""}`}
                          to="/managetracking"
                        >
                          <span className="menu-icon">
                            <i className="ki-duotone ki-chart-simple-2 fs-2">
                              <span className="path1"></span><span className="path2"></span><span className="path3"></span><span className="path4"></span>
                            </i>
                          </span>
                          <span className="menu-title">Manage Tracking</span>
                        </Link>
                      </div>
                    )}
                    {isAdmin && (
                      <div className="menu-item">
                        <Link
                          className={`menu-link${currentPath === "/userprofiles" ? " active" : ""}`}
                          to="/userprofiles"
                        >
                          <span className="menu-icon">
                            <i className="ki-duotone ki-profile-user fs-2">
                              <span className="path1"></span><span className="path2"></span><span className="path3"></span><span className="path4"></span>
                            </i>
                          </span>
                          <span className="menu-title">User Profiles</span>
                        </Link>
                      </div>
                    )}
                    {/* Pending Approvals - ADMIN + SUBADMIN */}
                    {(isAdmin || isSubAdmin) && (
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

                {/* Work / Todo - read-only register for all roles */}
                <div className="menu-item">
                  <Link
                    className={`menu-link${currentPath === "/worktracker" ? " active" : ""}`}
                    to="/worktracker"
                  >
                    <span className="menu-icon">
                      <i className="ki-duotone ki-check-square fs-2">
                        <span className="path1"></span>
                        <span className="path2"></span>
                      </i>
                    </span>
                    <span className="menu-title">Work / Todo</span>
                  </Link>
                </div>

                {/* Dynamic Main Heading navigation */}
                {headings.map((heading) => {
                  const menus = headingMenus[heading.id] || [];
                  const isOpen = !!openHeadings[heading.id];
                  const selectedHeadingId = Number(sessionStorage.getItem("current_heading_id"));
                  const headingActive = selectedHeadingId === Number(heading.id) && currentPath.startsWith("/nr");
                  const headingDashboardActive = currentPath === "/nr/dashboard" && selectedHeadingId === Number(heading.id);
                  return (
                    <div className={`menu-item menu-accordion mb-1${isOpen ? " show" : ""}`} key={heading.id}>
                      <div
                        className={`menu-link${headingActive ? " active" : ""}`}
                        onClick={() =>
                          setOpenHeadings((prev) =>
                            Object.fromEntries(
                              headings.map((h) => [h.id, Number(h.id) === Number(heading.id) ? !prev[h.id] : false])
                            )
                          )
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <span className="menu-icon"><i className="ki-duotone ki-delivery fs-2"><span className="path1"></span><span className="path2"></span><span className="path3"></span><span className="path4"></span></i></span>
                        <span className="menu-title">{heading.headingname}</span>
                        <span className="menu-arrow"></span>
                      </div>
                      <div className="menu-sub menu-sub-accordion">
                        <div className="menu-item">
                          <button
                            className={`menu-link w-100${headingDashboardActive ? " active" : ""}`}
                            style={{ background: "none", border: "none" }}
                            onClick={() => {
                              sessionStorage.setItem("current_heading_id", String(heading.id));
                              sessionStorage.setItem("current_heading_name", heading.headingname);
                              sessionStorage.removeItem("current_menu_id");
                              sessionStorage.removeItem("current_menu_name");
                              sessionStorage.setItem("current_page", "dashboard");
                              setOpenHeadings(
                                Object.fromEntries(
                                  headings.map((h) => [h.id, Number(h.id) === Number(heading.id)])
                                )
                              );
                              navigate(`/nr/dashboard?heading=${heading.id}`);
                            }}
                          >
                            <span className="menu-bullet"><span className="bullet bullet-dot"></span></span>
                            <span className="menu-title">Dashboard</span>
                          </button>
                        </div>
                        {menus.map((menu) => {
                          const active = currentPath === "/nr/display" && Number(sessionStorage.getItem("current_heading_id")) === Number(heading.id) && Number(sessionStorage.getItem("current_menu_id")) === Number(menu.id);
                          return (
                            <div className="menu-item" key={menu.id}>
                              <button
                                onClick={async () => {
                                  setCurrentDataContext(heading, menu);
                                  await logPageActivity(menu.menuname);
                                  navigate("/nr/display");
                                }}
                                className={`menu-link w-100${active ? " active" : ""}`}
                                style={{ background: "none", border: "none" }}
                              >
                                <span className="menu-bullet"><span className={`bullet bullet-dot${active ? " bg-primary" : ""}`}></span></span>
                                <span className="menu-title">{menu.menuname}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

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
                      {isAdmin ? "Admin" : isSubAdmin ? "SubAdmin" : "User"}
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
                    onClick={() => sessionStorage.clear()}
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
                        {isAdmin ? "Admin" : isSubAdmin ? "SubAdmin" : "User"}
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
                          sessionStorage.clear();
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