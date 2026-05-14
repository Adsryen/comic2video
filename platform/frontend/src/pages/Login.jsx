import React, { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, Shield, Lock, Mail, User } from "lucide-react";
import Swal from "sweetalert2";
import { useSiteText } from "../context/siteText";

const Login = () => {
  const { login, register, authEnabled, googleAuthEnabled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const text = useSiteText();

  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const savedRedirect = sessionStorage.getItem("auth_redirect");
  const parsedRedirect = savedRedirect ? JSON.parse(savedRedirect) : null;

  const from = useMemo(
    () => location.state?.from?.pathname || parsedRedirect?.pathname || "/projects",
    [location.state, parsedRedirect]
  );

  const title = mode === "login" ? text.loginTitle : text.registerTitle;
  const subtitle = mode === "login" ? text.loginSubtitle : text.registerSubtitle;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!authEnabled) {
      setError(text.authDisabledBanner);
      return;
    }

    if (!email || !password) {
      setError(text.loginMissingFields);
      return;
    }

    if (mode === "register" && !displayName.trim()) {
      setError(text.registerMissingName);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, displayName });
      }

      Swal.fire({
        icon: "success",
        title: mode === "login" ? text.loginSuccessTitle : text.registerSuccessTitle,
        text: mode === "login" ? text.loginSuccessBody : text.registerSuccessBody,
        background: "transparent",
        color: "#fff",
        timer: 1400,
        showConfirmButton: false,
        iconColor: "#a78bfa",
        backdrop: "rgba(0,0,0,0.4)",
      });

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1400);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const normalizedError = Array.isArray(detail)
        ? detail.map((item) => item?.msg || item?.message || String(item)).join("；")
        : typeof detail === "object" && detail !== null
          ? detail.msg || detail.message || JSON.stringify(detail)
          : detail;
      setError(normalizedError || err.message || text.loginGenericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="relative mt-10 z-10 w-full max-w-md">
        <div className="backdrop-blur-2xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl p-8 sm:p-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-4 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">{title}</h1>
            <p className="text-md font-semibold text-purple-400/80">{subtitle}</p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-2 block text-sm text-white/70">{text.displayNameLabel}</label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <User className="h-5 w-5 text-purple-200" />
                  <input
                    className="w-full bg-transparent text-white outline-none placeholder:text-white/35" autoComplete={mode === "login" ? "username" : "email"}
                    placeholder={text.displayNamePlaceholder}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-white/70">{mode === "login" ? (text.usernameOrEmailLabel || text.emailLabel) : text.emailLabel}</label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Mail className="h-5 w-5 text-purple-200" />
                <input
                  type="text"
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/35"
                  placeholder={mode === "login" ? (text.usernameOrEmailPlaceholder || "admin 或 admin@local") : text.emailPlaceholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/70">{text.passwordLabel}</label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <Lock className="h-5 w-5 text-purple-200" />
                <input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full bg-transparent text-white outline-none placeholder:text-white/35"
                  placeholder={text.passwordPlaceholder}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:opacity-95 disabled:opacity-60"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "login" ? text.signingIn : text.creatingAccount}
                </span>
              ) : mode === "login" ? text.loginButton : text.registerButton}
            </button>
          </form>

          {googleAuthEnabled && (
            <>
              <div className="my-6 flex items-center gap-3 text-white/35">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs uppercase tracking-[0.3em]">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/45">
                {text.googleComingSoon}
              </div>
            </>
          )}

          <div className="mt-6 text-center text-sm text-white/55">
            {mode === "login" ? text.noAccountYet : text.alreadyHaveAccount}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              className="ml-2 font-semibold text-purple-300 hover:text-purple-200"
            >
              {mode === "login" ? text.switchToRegister : text.switchToLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
