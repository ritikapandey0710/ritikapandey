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

  if (isPending) return <div className="flex items-center justify-center min-h-screen bg-gray-50">Loading…</div>;
  if (session) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[380px]">
        <h2 className="mb-4 text-2xl font-bold">{view === "login" ? "Sign in" : "Sign up"}</h2>
        {formError && <p className="mb-2 text-sm text-red-600">{formError}</p>}
        <form
          onSubmit={view === "login" ? loginForm.handleSubmit(onSubmit) : signupForm.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {view === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                {...signupForm.register("name")}
                className={`
                  block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${signupForm.formState.errors.name ? "border-red-500" : ""}
                `}
                placeholder="Name"
              />
              {signupForm.formState.errors.name && (
                <p className="mt-1 text-sm text-red-500">{signupForm.formState.errors.name.message}</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              {...(view === "login" ? loginForm.register("email") : signupForm.register("email"))}
              type="email"
              className={`
                block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500
                ${(view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email)
                  ? "border-red-500"
                  : ""}
              `}
              placeholder="Email"
            />
            {(view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email) && (
              <p className="mt-1 text-sm text-red-500">
                {(view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email)?.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              {...(view === "login" ? loginForm.register("password") : signupForm.register("password"))}
              type="password"
              className={`
                block w-full rounded border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500
                ${(view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password)
                  ? "border-red-500"
                  : ""}
              `}
              placeholder="Password"
            />
            {(view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password) && (
              <p className="mt-1 text-sm text-red-500">
                {(view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password)?.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className={`
              w-full px-3 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-70
            `}
          >
            {submitting ? "Submitting..." : view === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          {view === "login" ? "No account? " : "Have an account? "}
          <span
            className="text-blue-600 font-semibold underline cursor-pointer"
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