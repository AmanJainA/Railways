import { supabase } from "../../supabase";

export const getCurrentRole = () =>
  (sessionStorage.getItem("role") || "user").trim().toLowerCase();

export const isAdminUser = () => getCurrentRole() === "admin";
export const isSubAdminUser = () => getCurrentRole() === "subadmin";
export const canManageHeadings = () => isAdminUser();
export const canAccessHeadingManagement = () => isAdminUser() || isSubAdminUser();

export const getCurrentUserId = () => {
  const value = sessionStorage.getItem("user_id");
  return value ? Number(value) : null;
};

export async function getAccessibleHeadings() {
  const { data: headings, error } = await supabase
    .from("main_heading_master")
    .select("*")
    .eq("status", "1")
    .order("id", { ascending: true });

  if (error) throw error;
  if (isAdminUser()) return headings || [];

  const userId = getCurrentUserId();
  if (!userId) return [];

  const { data: access, error: accessError } = await supabase
    .from("user_main_heading_access")
    .select("main_heading_id")
    .eq("user_id", userId);

  if (accessError) throw accessError;

  const allowed = new Set((access || []).map((x) => Number(x.main_heading_id)));
  return (headings || []).filter((h) => allowed.has(Number(h.id)));
}

export async function getAccessibleMenus(mainHeadingId) {
  const { data: menus, error } = await supabase
    .from("menu_master")
    .select("*")
    .eq("status", "1")
    .eq("main_heading_id", Number(mainHeadingId))
    .order("id", { ascending: true });

  if (error) throw error;
  if (isAdminUser()) return menus || [];

  const userId = getCurrentUserId();
  if (!userId) return [];

  const { data: access, error: accessError } = await supabase
    .from("user_menu_access")
    .select("menu_id")
    .eq("user_id", userId);

  if (accessError) throw accessError;

  const allowed = new Set((access || []).map((x) => Number(x.menu_id)));
  return (menus || []).filter((menu) => allowed.has(Number(menu.id)));
}

export async function getAccessibleFolders(mainHeadingId, menuId) {
  const { data, error } = await supabase
    .from("folder_master")
    .select("*")
    .eq("status", "1")
    .eq("main_heading_id", Number(mainHeadingId))
    .eq("menu_id", Number(menuId))
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}

export const menuSlug = (name = "") =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function setCurrentDataContext(heading, menu) {
  sessionStorage.setItem("current_heading_id", String(heading.id));
  sessionStorage.setItem("current_heading_name", heading.headingname);
  sessionStorage.setItem("current_menu_id", String(menu.id));
  sessionStorage.setItem("current_menu_name", menu.menuname);
  sessionStorage.setItem("current_page", menuSlug(menu.menuname));
}
