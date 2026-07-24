import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "../lib/auth-client";
import { useNavigate, useLocation } from "react-router-dom";

// Zod schemas for validation
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

export default function LoginPage() {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState(location.pathname === "/signup" ? "signup" : "login");

  // Form states
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  // State for form submission
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setView(location.pathname === "/signup" ? "signup" : "login");
    // Clear form error when view changes
    setFormError("");
  }, [location.pathname]);

  useEffect(() => {
    if (!isPending && session) navigate("/");
  }, [session, isPending, navigate]);

  const onSubmit = async (data: LoginFormValues | SignupFormValues) => {
    setSubmitting(true);
    setFormError("");
    try {
      if (view === "signup") {
        const signupData = data as SignupFormValues;
        const res = await authClient.signUp.email({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
        });
        if (res.error) setFormError(res.error.message ?? "Sign up failed");
        else navigate("/");
      } else {
        const loginData = data as LoginFormValues;
        const res = await authClient.signIn.email({
          email: loginData.email,
          password: loginData.password,
        });
        if (res.error) setFormError(res.error.message ?? "Sign in failed");
        else navigate("/");
      }
    } catch (err) {
      setFormError("An unexpected error occurred");
      console.error("Auth error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending) return <div style={{ textAlign: "center", padding: "2rem" }}>Loading…</div>;
  if (session) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "100%", maxWidth: "380px" }}>
        <h2 style={{ margin: "0 0 1.2rem", fontSize: "1.4rem", fontWeight: 700 }}>
          {view === "login" ? "Sign in" : "Sign up"}
        </h2>
        {formError && <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: "0 0 0.5rem" }}>{formError}</p>}
        <form onSubmit={view === "login" ? loginForm.handleSubmit(onSubmit) : signupForm.handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {view === "signup" && (
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", fontWeight: 500 }}>Name</label>
              <input
                {...signupForm.register("name")}
                style={{
                  padding: "0.65rem 0.9rem",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  ...(signupForm.formState.errors.name && { borderColor: "#dc2626" }),
                  fontSize: "0.95rem",
                  outline: "none",
                  width: "100%",
                  boxSizing: "border-box",
                }}
                placeholder="Name"
              />
              {signupForm.formState.errors.name && <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.25rem" }}>{signupForm.formState.errors.name.message}</p>}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", fontWeight: 500 }}>Email</label>
            <input
              {...(view === "login" ? loginForm.register("email") : signupForm.register("email"))}
              type="email"
              style={{
                padding: "0.65rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                ...((view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email) && { borderColor: "#dc2626" }),
                fontSize: "0.95rem",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
              placeholder="Email"
            />
            {(view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email) &&
              <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {(view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email)?.message}
              </p>
            }
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", fontWeight: 500 }}>Password</label>
            <input
              {...(view === "login" ? loginForm.register("password") : signupForm.register("password"))}
              type="password"
              style={{
                padding: "0.65rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                ...((view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password) && { borderColor: "#dc2626" }),
                fontSize: "0.95rem",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
              }}
              placeholder="Password"
            />
            {(view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password) &&
              <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                {(view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password)?.message}
              </p>
            }
          </div>
          <button
            style={{
              padding: "0.7rem",
              borderRadius: "8px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              width: "100%",
              opacity: submitting ? 0.7 : 1
            }}
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : view === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", textAlign: "center", color: "#6b7280" }}>
          {view === "login" ? "No account? " : "Have an account? "}
          <span
            style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}
            onClick={() => {
              setView(view === "login" ? "signup" : "login");
              setFormError("");
            }}
          >
            {view === "login" ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}