import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  register as registerRequest,
} from "../api/auth";

const AuthContext = createContext();
const ACCESS_TOKEN_KEY = "platform_access_token";
const REFRESH_TOKEN_KEY = "platform_refresh_token";

const normalizeLocalIdentifier = (value) => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return normalized;
  return normalized.includes("@") ? normalized : `${normalized}@local`;
};

const readToken = (key) => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
};

const writeToken = (key, value) => {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(() => readToken(ACCESS_TOKEN_KEY));
  const [refreshTokenValue, setRefreshTokenValue] = useState(() => readToken(REFRESH_TOKEN_KEY));

  const persistTokens = (nextAccessToken, nextRefreshToken) => {
    setAccessToken(nextAccessToken || null);
    setRefreshTokenValue(nextRefreshToken || null);
    writeToken(ACCESS_TOKEN_KEY, nextAccessToken || "");
    writeToken(REFRESH_TOKEN_KEY, nextRefreshToken || "");
  };

  const fetchCurrentUser = async () => {
    try {
      const { data } = await getCurrentUser();
      setUser(data?.user ?? null);
      return data?.user ?? null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);
      let currentUser = await fetchCurrentUser();

      if (!currentUser && refreshTokenValue) {
        try {
          const { data } = await refreshRequest({ refresh_token: refreshTokenValue });
          persistTokens(data?.access_token, data?.refresh_token);
          currentUser = await fetchCurrentUser();
        } catch {
          persistTokens(null, null);
        }
      }

      if (active) {
        setUser(currentUser);
        setLoading(false);
      }
    };

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const register = async ({ email, password, displayName }) => {
    const { data } = await registerRequest({
      email: normalizeLocalIdentifier(email),
      password,
      display_name: displayName?.trim() || null,
    });
    persistTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    return data;
  };

  const login = async ({ email, password }) => {
    const { data } = await loginRequest({
      email: normalizeLocalIdentifier(email),
      password,
    });
    persistTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      persistTokens(null, null);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      authEnabled: true,
      accessToken,
      refreshToken: refreshTokenValue,
      register,
      login,
      logout,
      googleAuthEnabled: import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true",
      refreshCurrentUser: fetchCurrentUser,
    }),
    [user, loading, accessToken, refreshTokenValue]
  );

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
