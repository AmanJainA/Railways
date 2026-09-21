import React, { useState } from "react";
import Footer from "../Footer/Footer";
import { supabase } from "../../supabase";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const userId = sessionStorage.getItem("user_id");
  const username = sessionStorage.getItem("user");

  const showAlert = (type, title, message) => {
    setAlert({ type, title, message });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return showAlert("danger", "Error", "Please fill all fields.");
  }

  if (newPassword.length < 6) {
    return showAlert(
      "danger",
      "Error",
      "Password must be at least 6 characters."
    );
  }

  if (newPassword !== confirmPassword) {
    return showAlert("danger", "Error", "Passwords do not match.");
  }

  setLoading(true);

  try {
    // Check current password
    const { data: user, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId)
  .eq("username", username)
  .eq("password", currentPassword)
  .single();

    if (error || !user) {
      setLoading(false);
      return showAlert(
        "danger",
        "Error",
        "Current password is incorrect."
      );
    }

    // Update password
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password: newPassword,
      })
      .eq("id", userId);

    if (updateError) {
      setLoading(false);
      return showAlert("danger", "Error", updateError.message);
    }

    showAlert(
      "success",
      "Success",
      "Password changed successfully."
    );

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

  } catch (err) {
    showAlert("danger", "Error", err.message);
  }

  setLoading(false);
};

  return (
    <>
      <div
        className="content d-flex flex-column flex-column-fluid fs-6"
        id="kt_content"
      >
        <div className="container-xxl" id="kt_content_container">
          <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-8">

              <div className="card card-flush">

                <div className="card-header">
                  <div className="card-title">
                    <h2>Change Password</h2>
                  </div>
                </div>

                <div className="card-body">

                  {alert && (
                    <div className={`alert alert-${alert.type}`}>
                      <strong>{alert.title}</strong>
                      <br />
                      {alert.message}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>

                    <div className="mb-8">
                      <label className="form-label fw-bold">
                        Current Password
                      </label>

                      <input
                        type="password"
                        className="form-control form-control-solid"
                        value={currentPassword}
                        onChange={(e) =>
                          setCurrentPassword(e.target.value)
                        }
                      />
                    </div>

                    <div className="mb-8">
                      <label className="form-label fw-bold">
                        New Password
                      </label>

                      <input
                        type="password"
                        className="form-control form-control-solid"
                        value={newPassword}
                        onChange={(e) =>
                          setNewPassword(e.target.value)
                        }
                      />
                    </div>

                    <div className="mb-10">
                      <label className="form-label fw-bold">
                        Confirm Password
                      </label>

                      <input
                        type="password"
                        className="form-control form-control-solid"
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(e.target.value)
                        }
                      />
                    </div>

                    <div className="text-end">
                      <button
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Updating...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-key me-2"></i>
                            Change Password
                          </>
                        )}
                      </button>
                    </div>

                  </form>

                </div>

              </div>

            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default ChangePassword;