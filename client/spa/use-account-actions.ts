"use client";

import { useAuth } from "@/client/auth/auth-provider";
import { useNavigate, useParams } from "react-router";

/** Account actions shared by the avatar menu (desktop) and the mobile drawer. */
export function useAccountActions() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { propertyId } = useParams();
  return {
    goDashboard: () => window.location.assign("/dashboard"),
    // Settings are per property; there is no account-level settings page yet.
    goSettings: propertyId ? () => navigate(`/properties/${propertyId}/settings`) : null,
    logOut: () => { void signOut().then(() => window.location.assign("/")); },
  };
}
