import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";
import { getAccessibleHeadings } from "../Utility/dataAccess";

const fileColorsMap = {
  pdf: "danger", doc: "primary", docx: "primary",
  xls: "success", xlsx: "success", ppt: "warning", pptx: "warning",
  png: "info", jpg: "info", jpeg: "info", gif: "info",
};

const PendingApprovals = () => {
  const navigate = useNavigate();
  const role = (sessionStorage.getItem("role") || "").toLowerCase();
  const isAdmin = role === "admin";
  const isSubAdmin = role === "subadmin";
  const canApprove = isAdmin || isSubAdmin;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectRemark, setRejectRemark] = useState("");
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/nr/dashboard");
      return;
    }
    fetchPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApprove, isAdmin, navigate]);

  const fetchPending = async () => {
    setLoading(true);

    try {
      // Pending files: Admin sees all; SubAdmin sees only assigned Main Headings.
      const headings = await getAccessibleHeadings();
      if (!isAdmin && !headings.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      let fileQuery = supabase
        .from("datacollection")
        .select("*")
        .eq("status", 0);

      if (!isAdmin) {
        fileQuery = fileQuery.in(
          "main_heading_id",
          headings.map((h) => Number(h.id))
        );
      }

      const { data: files, error: fileError } = await fileQuery
        .order("uploaded_at", { ascending: false });
