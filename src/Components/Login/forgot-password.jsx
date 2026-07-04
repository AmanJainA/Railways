import React, { useState, useEffect } from "react";

const ForgotPassword = () => {
  // step 1 = email, step 2 = otp
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

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

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  // STEP 1: Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!email) {
      showAlert("danger", "Error", "Please enter your email");
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const response = await fetch("https://samrat.cu.ma/send_otp.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const res = await response.json();

      if (res.status === 1) {
        showAlert("primary", "OTP Sent", res.msg);
        setStep(2); // move to OTP screen
      } else {
        showAlert("danger", "Error", res.msg);
      }
    } catch (error) {
      console.error(error);
      showAlert("danger", "Error", "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP, then redirect to reset-password page
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp) {
      showAlert("danger", "Error", "Please enter the OTP");
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const response = await fetch("https://samrat.cu.ma/verify_otp.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const res = await response.json();

      if (res.status === 1) {
        showAlert("primary", "Verified", res.msg);

        // Save email + reset_token temporarily so reset-password.jsx can use it
        sessionStorage.setItem("reset_email", email);
        sessionStorage.setItem("reset_token", res.reset_token);

        setTimeout(() => {
          window.location.href = "/reset-password";
        }, 800);
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

  const handleResendOtp = async () => {
    setLoading(true);
    setAlert(null);
    // try {
    //   const response = await fetch("https://samrat.cu.ma/send_otp.php", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ email }),
    //   });
    //   const res = await response.json();
    //   showAlert(res.status === 1 ? "primary" : "danger", res.status === 1 ? "OTP Sent" : "Error", res.msg);
    // } catch (error) {
    //   showAlert("danger", "Error", "Something went wrong. Try again.");
    // } finally {
    //   setLoading(false);
    // }
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

                <h1 className="fw-bold fs-2qx text-white">Forgot Password?</h1>
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

                {step === 1 && (
                  <form className="form w-100" onSubmit={handleSendOtp}>
                    <div className="text-center mb-10">
                      <h1 className="text-gray-900 mb-3">Forgot Password</h1>
                      <div className="text-gray-500 fw-semibold fs-6">
                        Enter your email to receive a verification OTP
                      </div>
                    </div>

                    {/* EMAIL */}
                    <div className="fv-row mb-10">
                      <label className="form-label fw-bold">Email</label>
                      <input
                        type="email"
                        className="form-control form-control-lg form-control-solid"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="d-flex flex-wrap justify-content-center pb-lg-0">
                      <button
                        type="submit"
                        className="btn btn-lg btn-primary w-100 mb-5"
                        disabled={loading}
                      >
                        {loading ? "Sending OTP..." : "Send OTP"}
                      </button>

                      <a href="/login" className="btn btn-lg btn-light-primary w-100">
                        Back to Login
                      </a>
                    </div>
                  </form>
                )}

                {step === 2 && (
                  <form className="form w-100" onSubmit={handleVerifyOtp}>
                    <div className="text-center mb-10">
                      <h1 className="text-gray-900 mb-3">Enter OTP</h1>
                      <div className="text-gray-500 fw-semibold fs-6">
                        We sent a verification code to <b>{email}</b>
                      </div>
                    </div>

                    {/* OTP */}
                    <div className="fv-row mb-10">
                      <label className="form-label fw-bold">OTP Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        className="form-control form-control-lg form-control-solid text-center"
                        style={{ letterSpacing: "8px", fontSize: "22px" }}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="d-flex flex-wrap justify-content-center pb-lg-0">
                      <button
                        type="submit"
                        className="btn btn-lg btn-primary w-100 mb-5"
                        disabled={loading}
                      >
                        {loading ? "Verifying..." : "Verify OTP"}
                      </button>

                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="btn btn-lg btn-light-primary w-100 mb-5"
                        disabled={loading}
                      >
                        Resend OTP
                      </button>

                      <a
                        href="/login"
                        className="link-primary fs-6 fw-bold mt-2"
                      >
                        Back to Login
                      </a>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
