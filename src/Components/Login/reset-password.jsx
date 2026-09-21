import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [done, setDone] = useState(false);

  const email = sessionStorage.getItem("reset_email");
  const resetToken = sessionStorage.getItem("reset_token");
  const navigate = useNavigate();

  // ✅ Theme setup (same as login)
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

  // If someone lands here directly without verifying OTP, send them back
  useEffect(() => {
    if (!email || !resetToken) {
      navigate("/login", { replace: true });
    }
  }, [email, resetToken, navigate]);

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      return showAlert("danger", "Error", "Please fill all fields");
    }

    if (newPassword.length < 6) {
      return showAlert(
        "danger",
        "Error",
        "Password must be at least 6 characters"
      );
    }

    if (newPassword !== confirmPassword) {
      return showAlert("danger", "Error", "Passwords do not match");
    }

    setLoading(true);
    setAlert(null);

    try {
      // Check OTP was verified
      const { data: resetData, error: resetError } = await supabase
        .from("password_resets")
        .select("*")
        .eq("email", email)
        .eq("verified", true)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (resetError || !resetData) {
        showAlert(
          "danger",
          "Error",
          "OTP verification not found. Please verify OTP again."
        );
        setLoading(false);
        return;
      }

      // Update password
      // Update password
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: newPassword,
        })
        .eq("email", email);

      if (updateError) throw updateError;

      // Delete OTP record
      await supabase
        .from("password_resets")
        .delete()
        .eq("id", resetData.id);

      // Send confirmation email
      const mailResponse = await fetch("https://samrat.cu.ma/password_updated_mail.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const mailRes = await mailResponse.json();
      // Remove session
      sessionStorage.removeItem("reset_email");
      sessionStorage.removeItem("reset_token");

      setDone(true);

      showAlert(
        "success",
        "Success",
        "Password updated successfully."
      );

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.log(err);
      showAlert("danger", "Error", err.message);
    }

    setLoading(false);
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
