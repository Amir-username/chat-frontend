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
} from "./api/profile";

// Hooks
export { useUserProfile, clearUserProfileCache } from "./hooks/useUserProfile";

// Components
export { default as Avatar } from "./components/Avatar";

// Pages
export { default as LoginPage } from "./pages/LoginPage";
export { default as RegisterPage } from "./pages/RegisterPage";
export { default as ProfilePage } from "./pages/ProfilePage";
export { default as UserProfilePage } from "./pages/UserProfilePage";
