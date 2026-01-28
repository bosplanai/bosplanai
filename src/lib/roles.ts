export type DbAppRole = "admin" | "moderator" | "user" | "super_admin";

// UI-facing invite/access roles used across the app
export type UiAccessRole = "admin" | "member" | "viewer";

export const mapDbRoleToUiRole = (dbRole: string | null | undefined): UiAccessRole | null => {
  switch (dbRole) {
    case "admin":
      return "admin";
    case "moderator":
      return "member";
    case "user":
      return "viewer";
    default:
      return null;
  }
};

export const mapUiRoleToDbRole = (uiRole: UiAccessRole): DbAppRole => {
  switch (uiRole) {
    case "admin":
      return "admin";
    case "member":
      return "moderator";
    case "viewer":
      return "user";
  }
};

export const uiRoleLabel: Record<UiAccessRole, string> = {
  admin: "Full Access",
  member: "Manager",
  viewer: "Team",
};
