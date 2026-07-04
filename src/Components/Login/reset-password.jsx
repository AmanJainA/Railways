import React, { useState, useEffect } from "react";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [done, setDone] = useState(false);

  const email = sessionStorage.getItem("reset_email");
  const resetToken = sessionStorage.getItem("reset_token");

  // ✅ Theme setup (same as login)
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

  // If someone lands here directly without verifying OTP, send them back
  useEffect(() => {
    if (!email || !resetToken) {
      window.location.href = "/forgot-password";
    }
  }, [email, resetToken]);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      showAlert("danger", "Error", "Please fill all fields");
      return;
    }

    if (newPassword.length < 6) {
      showAlert("danger", "Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("danger", "Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const response = await fetch("https://samrat.cu.ma/reset_password.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          reset_token: resetToken,
          new_password: newPassword,
        }),
      });

      const res = await response.json();

      if (res.status === 1) {
        showAlert(
          "primary",
          "Success",
          res.msg || "Password updated successfully. A confirmation email has been sent."
        );

        // cleanup temp session data
        sessionStorage.removeItem("reset_email");
        sessionStorage.removeItem("reset_token");

        setDone(true);

        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      } else {
        showAlert("danger", "Error", res.msg);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      showAlert("danger", "Error", "Something went wrong. Try again.");
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

                <h1 className="fw-bold fs-2qx text-white">Reset Password</h1>
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
                {/* ALERT */}
                {alert && (
                  <div className={`alert alert-${alert.type} mb-5`}>
                    <h4 className="mb-1">{alert.title}</h4>
                    <span>{alert.message}</span>
                  </div>
                )}

                {!done ? (
                  <form className="form w-100" onSubmit={handleSubmit}>
                    <div className="text-center mb-10">
                      <h1 className="text-gray-900 mb-3">Set New Password</h1>
                      <div className="text-gray-500 fw-semibold fs-6">
                        Enter and confirm your new password
                      </div>
                    </div>

                    {/* NEW PASSWORD */}
                    <div className="fv-row mb-10">
                      <label className="form-label fw-bold">New Password</label>
                      <input
                        type="password"
                        className="form-control form-control-lg form-control-solid"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="off"
                        required
                      />
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div className="fv-row mb-10">
                      <label className="form-label fw-bold">Confirm Password</label>
                      <input
                        type="password"
                        className="form-control form-control-lg form-control-solid"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="text-center">
                      <button
                        type="submit"
                        className="btn btn-lg btn-primary w-100 mb-5"
                        disabled={loading}
                      >
                        {loading ? "Updating..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center">
                    <h1 className="text-gray-900 mb-3">All Set!</h1>
                    <div className="text-gray-500 fw-semibold fs-6">
                      Redirecting you to login...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
