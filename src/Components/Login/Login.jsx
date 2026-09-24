import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();
  // ✅ Theme setup (converted from script)
  useEffect(() => {
    let defaultThemeMode = "light";
    let themeMode;

    if (document.documentElement.hasAttribute("data-bs-theme-mode")) {
      themeMode = document.documentElement.getAttribute("data-bs-theme-mode");
    } else if (sessionStorage.getItem("data-bs-theme")) {
      themeMode = sessionStorage.getItem("data-bs-theme");
    } else {
      themeMode = defaultThemeMode;
    }

    if (themeMode === "system") {
      themeMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    document.documentElement.setAttribute("data-bs-theme", themeMode);
  }, []);

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");
    const role = sessionStorage.getItem("role");

    if (isLoggedIn === "true") {
      if (role === "Admin") {
        navigate("/dashboard");
      } else {
        navigate("/nr/dashboard");
      }
    }
  }, []);
  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      showAlert("danger", "Error", "Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.from("users").select().match({
        username: username,
        password: password,
      });
      if (error) {
        console.log(error);
        showAlert("danger", "Error", error.message);
        return;
      }

      if (!data || data.length === 0) {
        showAlert("danger", "Error", "Invalid Username or Password");
        return;
      }

      const user = data[0];
      // Get public IP
      let ipAddress = "";

      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const ip = await res.json();
        ipAddress = ip.ip;
      } catch (e) {
        console.log("Unable to fetch IP");
      }

      // Browser details
      const browser = navigator.userAgent;
      const operating_system = navigator.platform;
      const device_type =
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
          ? "Mobile"
          : "Desktop";

      const session_id = crypto.randomUUID();

      // Check existing login history
      const { data: history, error: historyError } = await supabase
        .from("login_history")
        .select("id, login_count")
        .eq("user_id", user.id)
        .maybeSingle();


      if (history) {
        // Update existing record
        await supabase
          .from("login_history")
          .update({
            login_count: (history.login_count || 0) + 1,
            login_time: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            ip_address: ipAddress,
            browser,
            operating_system,
            device_type,
            session_id,
          })
          .eq("user_id", user.id);
      } else {
        // Insert first login
        await supabase
          .from("login_history")
          .insert({
            user_id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            login_count: 1,
            login_time: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            ip_address: ipAddress,
            browser,
            operating_system,
            device_type,
            session_id,
            created_at: new Date().toISOString(),
          });
      }

      sessionStorage.setItem("isLoggedIn", "true");
      sessionStorage.setItem("user_id", user.id);
      sessionStorage.setItem("user", user.username);
      sessionStorage.setItem("role", user.role);
      sessionStorage.setItem("email", user.email ?? "");
      sessionStorage.setItem("dept", user.dept ?? "");
      sessionStorage.setItem("project", user.project ?? "");
      showAlert("success", "Success", "Login Successful");

      setTimeout(() => {
        if (user.role === "Admin") {
          navigate("/dashboard");
        } else {
          navigate("/nr/dashboard");
        }
      }, 1000);
    } catch (error) {
      console.error(error);

      showAlert("danger", "Error", error.message);

      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="d-flex flex-column flex-root min-vh-100">
        <div className="d-flex flex-column flex-lg-row flex-column-fluid h-100">
          {/* LEFT SIDE */}
          <div className="d-flex flex-column flex-lg-row-auto w-100 w-lg-600px bg-primary position-xl-relative flex-shrink-0 py-3 py-lg-0" style={{ minHeight: "145px" }}>
            <div className="d-flex flex-column w-100 w-lg-600px h-100">
              <div className="d-flex flex-column flex-center text-center flex-grow-1 py-1 py-lg-0">
                <a href={process.env.PUBLIC_URL + "/"} className="py-1 py-lg-9 mb-1 mb-lg-4">
                  <img
                    alt="Logo"
                    src={
                      process.env.PUBLIC_URL +
                      "/assets/media/logos/logo-compact-light.svg"
                    }
                    className="h-50px h-lg-70px"
                  />
                </a>

                <h1 className="fw-bold fs-3 fs-lg-2qx text-white mb-0">Welcome Samrat</h1>
              </div>

              <div className="d-none d-lg-flex flex-row-auto flex-center">
                <img
                  src={
                    process.env.PUBLIC_URL +
                    "/assets/media/illustrations/dozzy-1/2.png"
                  }
                  alt=""
                  className="d-none d-lg-block h-200px h-lg-300px mb-2"
                />
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="d-flex flex-column flex-lg-row-fluid py-3 py-lg-10 min-vh-100">
            <div className="d-flex flex-center flex-column flex-column-fluid">
              <div className="w-100 w-lg-500px px-4 px-sm-8 px-lg-15 py-2 py-lg-0 mx-auto" style={{ maxWidth: "560px", boxSizing: "border-box" }}>
                <form className="form w-100" onSubmit={handleSubmit}>
                  <div className="text-center mb-4 mb-lg-10">
                    <h1 className="text-gray-900 mb-3">Sign In</h1>
                  </div>

                  {/* ALERT */}
                  {alert && (
                    <div className={`alert alert-${alert.type} mb-5`}>
                      <h4 className="mb-1">{alert.title}</h4>
                      <span>{alert.message}</span>
                    </div>
                  )}

                  {/* USERNAME */}
                  <div className="fv-row mb-5 mb-lg-10">
                    <label className="form-label fw-bold">Username</label>
                    <input
                      type="text"
                      className="form-control form-control-lg form-control-solid w-100"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* PASSWORD */}
                  <div className="fv-row mb-6 mb-lg-10">
                    <div className="d-flex flex-stack mb-2">
                      <label className="form-label fw-bold">Password</label>
                      <Link
                        to="/forgot-password"
                        className="link-primary fs-6 fw-bold"
                      >
                        Forgot Password?
                      </Link>
                    </div>

                    <input
                      type="password"
                      className="form-control form-control-lg form-control-solid w-100"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* BUTTON */}
                  <div className="text-center pt-1">
                    <button
                      type="submit"
                      className="btn btn-lg btn-primary w-100 mb-2 mb-lg-5"
                      disabled={loading}
                    >
                      {loading ? "Logging in..." : "Login"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
