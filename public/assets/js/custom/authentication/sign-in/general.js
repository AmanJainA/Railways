"use strict";

var KTSigninGeneral = (function () {
  var form, submitBtn, validator;

  return {
    init: function () {

      form = document.querySelector("#kt_sign_in_form");
      submitBtn = document.querySelector("#kt_sign_in_submit");

      if (!form || !submitBtn) return;

      // ✅ Prevent default form submit (extra safety)
      form.addEventListener("submit", function (e) {
        e.preventDefault();
      });

      // ✅ Validation
      validator = FormValidation.formValidation(form, {
        fields: {
          username: {
            validators: {
              notEmpty: {
                message: "Username is required",
              },
            },
          },
          password: {
            validators: {
              notEmpty: {
                message: "Password is required",
              },
            },
          },
        },
        plugins: {
          trigger: new FormValidation.plugins.Trigger(),
          bootstrap: new FormValidation.plugins.Bootstrap5({
            rowSelector: ".fv-row",
          }),
        },
      });

      // ✅ Button Click
      submitBtn.addEventListener("click", function (e) {
        e.preventDefault();

        validator.validate().then(function (status) {

          if (status === "Valid") {

            // 🔄 Loader ON
            submitBtn.setAttribute("data-kt-indicator", "on");
            submitBtn.disabled = true;

            axios.post("login_check.php", {
              u: form.querySelector('[name="username"]').value,
              p: form.querySelector('[name="password"]').value,
            })

            .then(function (response) {

              let res = (response.data || "").toString().trim();
              console.log("Response:", res); // debug

              if (res === "1") {

                form.reset();

                Swal.fire({
                  text: "Login successful!",
                  icon: "success",
                  confirmButtonText: "Ok, got it!",
                  customClass: {
                    confirmButton: "btn btn-primary",
                  },
                }).then(function (result) {
                  if (result.isConfirmed) {
                    window.location.href = "index.php"; // ✅ redirect
                  }
                });

              } else {

                Swal.fire({
                  text: "Invalid username or password",
                  icon: "error",
                  confirmButtonText: "Try again",
                });

              }

            })

            .catch(function (error) {
              console.error(error);

              Swal.fire({
                text: "Server error, please try again.",
                icon: "error",
              });
            })

            .finally(function () {
              submitBtn.removeAttribute("data-kt-indicator");
              submitBtn.disabled = false;
            });

          } else {

            Swal.fire({
              text: "Please fill all required fields.",
              icon: "error",
            });

          }

        });

      });

    },
  };

})();

// ✅ Init
KTUtil.onDOMContentLoaded(function () {
  KTSigninGeneral.init();
});