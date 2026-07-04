import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Login from "./Components/Login/Login";
import Dashboard from "./Components/Dashboard/Dashboard";
import MyData from "./Components/Dashboard/MyData";
import SidebarLayout from "./Components/Sidebar/SidebarLayout";
import Display from "./Components/NR/Display";
import Viewer from "./Components/NR/Viewer";
import Nangia from "./Components/Dashboard/Nangia";
import NRDashboard from "./Components/NR/NRDashboard";
import ForgotPassword from "./Components/Login/forgot-password";
import ResetPassword from "./Components/Login/reset-password";
import ProtectedRoute from "./Components/Utility/ProtectedRoute";
import PageTracker from "./Components/Utility/PageTracker";
import ChangePassword from "./Components/Login/change-password";
import UploadFile from "./Components/Admin/upload-file";
import ManageUploads from "./Components/Admin/manage-uploads";
import PendingApprovals from "./Components/Admin/PendingApprovals";
import ManageFolder from "./Components/Admin/manage-folder";
import ManageMenu from "./Components/Admin/manage-menu";

function DisplayWrapper() {
  const location = useLocation();
  const [page, setPage] = useState("");

  useEffect(() => {
    if (location.state?.menu) {
      const slug = location.state.menu
        .toLowerCase()
        .replace(/\s+/g, "");

      localStorage.setItem("current_page", slug);
      setPage(slug);
    } else {
      setPage(localStorage.getItem("current_page") || "");
    }
  }, [location]);

  if (!page) {
    return <div className="p-10 text-center">No page selected</div>;
  }

  return <Display page={page} />;
}
function App() {
  return (
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}>
      <PageTracker/>
      <Routes>
        {/* ✅ Without Sidebar */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/nr/viewer" element={<Viewer />} />  {/* 👈 moved outside */}

        {/* ✅ With Sidebar */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
            <SidebarLayout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/mydata" element={<MyData />} />
                <Route path="/nangia" element={<Nangia />} />
                <Route path="/nr/dashboard" element={<NRDashboard/>}/>
                <Route path="/nr/display" element={<DisplayWrapper />} />
                <Route path="/changepassword" element={<ChangePassword />} />
                <Route path="/manageupload" element={<ManageUploads />} />
                <Route path="/uploadfile" element={<UploadFile />} />
                <Route path="/pendingapprovals" element={<PendingApprovals />} />
                <Route path="/managefolder" element={<ManageFolder />} />
                <Route path="/managemenu" element={<ManageMenu />} />
              </Routes>
            </SidebarLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;