import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

const PageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const pageName = (() => {
  switch (location.pathname) {
    case "/dashboard":
      return "Dashboard";

    case "/mydata":
      return "My Data";

    case "/nangia":
      return "Nangia";

    case "/changepassword":
      return "Change Password";

    case "/nr/dashboard":
      return "NR Dashboard";

    case "/nr/display": {
      // Get actual selected menu
      const slug = localStorage.getItem("current_page") || "";

      const menuMap = {
        studydata: "Study Data",
        meeting: "Meeting",
        policy: "Policy",
        reports: "Reports",
        visitdata: "Visit Data",
        dashboarddesign: "Dashboard Design",
        questions: "Questions",
        researchpaper: "Research Paper",
        summarization: "Summarization",
        format: "Format",
        letter: "Letter",
      };

      return menuMap[slug] || `Display (${slug})`;
    }

    case "/nr/viewer": {
      const slug = localStorage.getItem("current_page") || "";
      return `Viewer (${slug})`;
    }

    default:
      return location.pathname;
  }
})();

    axios.post("https://samrat.cu.ma/track_page.php", {
    username: localStorage.getItem("user"),
    page: pageName,
    url: location.pathname,
})
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [location]);

  return null;
};

export default PageTracker;