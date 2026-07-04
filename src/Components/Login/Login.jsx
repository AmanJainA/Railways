import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // ✅ Theme setup (converted from script)
  useEffect(() => {
    let defaultThemeMode = "light";
    let themeMode;

    if (document.documentElement.hasAttribute("data-bs-theme-mode")) {
      themeMode = document.documentElement.getAttribute("data-bs-theme-mode");
    } else if (localStorage.getItem("data-bs-theme")) {
      themeMode = localStorage.getItem("data-bs-theme");
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
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    const role = localStorage.getItem("role");

    if (isLoggedIn === "true") {
      if (role === "admin") {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/nr/dashboard";
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
      const response = await fetch("https://samrat.cu.ma/login_check.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const res = await response.json();

      if (res.status === 1) {
        showAlert("primary", "Success", res.msg);
        const user = res.user;
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", res.user);
        localStorage.setItem("role", res.role);
        localStorage.setItem("email", res.email);
        localStorage.setItem("dept", res.dept);
        localStorage.setItem("project", res.project);

        setTimeout(() => {
          if (res.role === "Admin") {
            window.location.href = "/dashboard";
          } else {
            window.location.href = "/nr/dashboard";
          }
        }, 1000);
      } else {
        showAlert("danger", "Error", res.msg);
        setLoading(false);
      }
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
          <div className="d-flex flex-column flex-lg-row-auto w-xl-600px bg-primary position-xl-relative">
            <div className="d-flex flex-column position-xl-fixed top-0 bottom-0 w-xl-600px scroll-y">
              <div className="d-flex flex-row-fluid flex-column flex-center text-center">
                <a href="/" className="py-9 mb-4">
                  <img
                    alt="Logo"
                    src={
                      process.env.PUBLIC_URL +
                      "/assets/media/logos/logo-compact-light.svg"
                    }
                    className="h-70px"
                  />
                </a>

                <h1 className="fw-bold fs-2qx text-white">Welcome Samrat</h1>
              </div>

              <div className="d-flex flex-row-auto flex-center">
                <img
                  src={
                    process.env.PUBLIC_URL +
                    "/assets/media/illustrations/dozzy-1/2.png"
                  }
                  alt=""
                  className="h-200px h-lg-300px mb-2"
                />
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="d-flex flex-column flex-lg-row-fluid py-10">
            <div className="d-flex flex-center flex-column flex-column-fluid">
              <div className="w-lg-500px p-10 p-lg-15 mx-auto">
                <form className="form w-100" onSubmit={handleSubmit}>
                  <div className="text-center mb-10">
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
                  <div className="fv-row mb-10">
                    <label className="form-label fw-bold">Username</label>
                    <input
                      type="text"
                      className="form-control form-control-lg form-control-solid"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* PASSWORD */}
                  <div className="fv-row mb-10">
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
                      className="form-control form-control-lg form-control-solid"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* BUTTON */}
                  <div className="text-center">
                    <button
                      type="submit"
                      className="btn btn-lg btn-primary w-100 mb-5"
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
