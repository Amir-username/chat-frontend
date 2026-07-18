// ---------------------------------------------------------------------------
// Auth feature barrel.
//
// Re-exports the auth store, API helpers, and pages so consumers can import
// from a single path:
//
//   import { useAuthStore } from "@/features/auth";
//   import LoginPage from "@/features/auth";
//   import { login } from "@/features/auth";
// ---------------------------------------------------------------------------

// Store (Zustand)
export { useAuthStore } from "./store/authStore";

// API helpers — auth
export { register, login, refresh, logout, getMe } from "./api/auth";
// API helpers — profile
export {
  getMyProfile,
  getUserProfile,
  updateMyProfile,
  uploadProfileImage,
  searchUsers,
} from "./api/profile";

// Hooks
export { useUserProfile, clearUserProfileCache } from "./hooks/useUserProfile";
export { useUserSearch } from "./hooks/useUserSearch";
export type { SearchStatus } from "./hooks/useUserSearch";

// Components
export { default as Avatar } from "./components/Avatar";
export { default as UserSearchOverlay } from "./components/UserSearchOverlay";

// Pages
export { default as LoginPage } from "./pages/LoginPage";
export { default as RegisterPage } from "./pages/RegisterPage";
export { default as ProfilePage } from "./pages/ProfilePage";
export { default as UserProfilePage } from "./pages/UserProfilePage";
