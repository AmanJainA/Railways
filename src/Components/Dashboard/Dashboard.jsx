import React, { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import "./Dashboard.css";
import Footer from "../Footer/Footer";
import { useNavigate } from "react-router-dom";
import DashboardCard from "./DashboardCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    counts: {
      mydata: 0,
      nangia: 0,
      nr: 0,
    },
    nrMenus: [],
    visitData: {},
    stats: {
      totalFolders: 0,
      totalFiles: 0,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);
  const handleOpen = (menu) => {
    const slug = menu
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[_-]/g, "");

    sessionStorage.setItem("current_page", slug);
    navigate("/nr/display");
  };

  const formatName = (name) => {
    return name
      .replace(/[_-]/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
  const fetchData = async () => {
    try {
      // Fetch all files
      const { data: files, error } = await supabase
        .from("datacollection")
        .select("*");

      if (error) throw error;

      // -----------------------
      // Dashboard Counts
      // -----------------------

      const myData = files.filter((item) => item.menuname === "mydata").length;

      const nangia = files.filter((item) => item.menuname === "Nangia").length;

      const nrData = files.length - myData - nangia;

      // -----------------------
      // Latest Folder
      // -----------------------

      const menuMap = {};

      files.forEach((item) => {
        const title = item.menuname?.trim();

        if (!title) return;

        const slug = title
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[_-]/g, "");

        if (!menuMap[slug]) {
          menuMap[slug] = {
            name: title,
            slug,
            count: 0,
          };
        }

        menuMap[slug].count++;
      });

      const nrMenus = Object.values(menuMap).filter(
        (menu) => menu.slug !== "mydata" && menu.slug !== "nangia"
      );

      // -----------------------
      // Visit Data
      // -----------------------

      const visitFiles = files.filter((item) => {
        const menu = item.menuname?.trim().toLowerCase();

        const isPdf =
          item.type?.toLowerCase() === "pdf" ||
          item.links?.toLowerCase().endsWith(".pdf");

        return menu === "visit data" && isPdf;
      });

      const visitData = {
        Parcel: [],
        Goods: [],
      };

      visitFiles.forEach((item) => {
        const folder = item.folder?.trim().toLowerCase();

        if (folder === "parcel") {
          visitData.Parcel.push(item);
        } else if (folder === "goods") {
          visitData.Goods.push(item);
        }
      });

      // -----------------------

      setData({
        counts: {
          mydata: myData,
          nangia: nangia,
          nr: nrData,
        },

        nrMenus,

        visitData,

        stats: {
          totalFolders: Object.values(visitData).filter(
            (x) => x.length > 0
          ).length,

          totalFiles: visitFiles.length,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="content d-flex flex-column flex-column-fluid fs-6"
      id="kt_content"
    >
      <div className="container-xxl" id="kt_content_container">
        <div className="row gy-5 gx-xl-10">
          <div className="col-xl-12">
            <div className="row g-5 mb-8">
              <DashboardCard
                title="My Data"
                count={data.counts?.mydata}
                color="primary"
                bgColor="bg-light-primary"
                icon="ki-profile-user"
              />

              <DashboardCard
                title="Nangia"
                count={data.counts?.nangia}
                color="warning"
                bgColor="bg-light-warning"
                icon="ki-briefcase"
              />

              <DashboardCard
                title="NR Data"
                count={data.counts?.nr}
                color="success"
                bgColor="bg-light-success"
                icon="ki-folder"
              />
            </div>
          </div>
        </div>
        <div className="row gy-5 g-xl-10">
          <div className="col-xl-5 mb-xl-10">
            <div className="card card-flush h-lg-100">
              <div className="card-header pt-7">
                <h3 className="card-title align-items-start flex-column">
                  <span className="card-label fw-bold text-gray-800">
                    Latest Folder
                  </span>
                  <span className="text-gray-500 mt-1 fw-semibold fs-6">
                    {data.nrMenus?.length || 0}
                    &nbsp;Active Folder
                  </span>
                </h3>
              </div>
              <div className="card-body">
                <div className="tab-content">
                  <div
                    className="tab-pane fade show active"
                    id="kt_list_widget_10_tab_1"
                  >
                    <div className="m-0">
                      <div className="timeline">
                        {data.nrMenus?.map((menu, index) => (
                          <div
                            key={index}
                            className="timeline-item d-flex align-items-center justify-content-between mb-7"
                          >
                            <div className="d-flex align-items-center">
                              <div className="timeline-icon me-3">
                                <i className="ki-duotone ki-cd fs-2 text-danger">
                                  <span className="path1"></span>
                                  <span className="path2"></span>
                                </i>
                              </div>

                              <div className="timeline-content m-0">
                                <span className="fs-6 text-gray-700 fw-semibold">
                                  {formatName(menu.name)}
                                </span>
                                <span className="text-gray-500 fw-semibold fs-7 d-block text-start ps-0">
                                  {menu.count} Files
                                </span>
                              </div>
                            </div>
                            <div>
                              <button
                                onClick={() => handleOpen(menu.slug)}
                                className="btn btn-sm btn-light-primary fw-semibold px-3 rounded-pill"
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i>
                                Open
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="separator separator-dashed my-6"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-7 mb-5 mb-xl-10">
            <div className="row g-5 g-xl-10 h-xxl-50 mb-0 mb-xl-10">
              <div className="col-xxl-12 mb-5 mb-xl-0">
                <div className="card card-flush h-lg-100">
                  <div className="card-header pt-7 mb-5">
                    <h3 className="card-title align-items-start flex-column">
                      <span className="card-label fw-bold text-gray-800">
                        Visits by Us
                      </span>
                      <span className="text-gray-500 mt-1 fw-semibold fs-6">
                        {data.stats?.totalFolders || 0} folders •{" "}
                        {data.stats?.totalFiles || 0} visits
                      </span>
                    </h3>

                    <div className="card-toolbar">
                      <button
                        onClick={() =>
                          navigate("/nr/display", {
                            state: { menu: "Visit Data" },
                          })
                        }
                        className="btn btn-sm btn-light"
                      >
                        View All
                      </button>
                    </div>
                  </div>

                  <div className="card-body pt-0">
                    {Object.keys(data.visitData || {}).map((folder, i) => (
                      <div key={i} className="m-0">
                        <div className="fw-bold text-gray-700 mb-3 mt-4">
                          📁 {folder} Folder
                        </div>
                        {data.visitData[folder].map((file, j) => (
                          <div key={j}>
                            <div className="d-flex flex-stack mb-3">
                              <div className="d-flex align-items-center">
                                <div className="symbol symbol-40px me-3">
                                  <span className="symbol-label bg-light-primary">
                                    <i className="ki-duotone ki-map fs-2 text-primary">
                                      <span className="path1"></span>
                                      <span className="path2"></span>
                                    </i>
                                  </span>
                                </div>

                                <div>
                                  <span className="text-gray-800 fw-bold fs-6">
                                    {file.name}
                                  </span>

                                  <span className="text-gray-500 fw-semibold fs-7 d-block">
                                    From {file.folder}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="separator separator-dashed my-2"></div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
