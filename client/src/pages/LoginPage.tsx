import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "../lib/auth-client";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        {/* Using Card component from shadcn */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="mb-6 text-2xl font-bold text-center">{view === "login" ? "Sign in" : "Sign up"}</h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded">
              {formError}
            </div>
          )}
          <form
            onSubmit={view === "login" ? loginForm.handleSubmit(onSubmit) : signupForm.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {view === "signup" && (
              <div className="space-y-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                    Name
                  </label>
                  <Input
                    {...signupForm.register("name", {
                      required: "Name is required",
                    })}
                    id="name"
                    placeholder="Enter your name"
                  />
                  {signupForm.formState.errors.name && (
                    <p className="mt-1 text-sm text-red-600">{signupForm.formState.errors.name.message}</p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                Email address
              </label>
              <Input
                {...(view === "login" ? loginForm.register("email", {
                  required: "Email is required",
                }) : signupForm.register("email", {
                  required: "Email is required",
                }))}
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
              />
              {(view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email) && (
                <p className="mt-1 text-sm text-red-600">
                  {(view === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email)?.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-900">
                Password
              </label>
              <Input
                {...(view === "login" ? loginForm.register("password", {
                  required: "Password is required",
                  minLength: 6,
                }) : signupForm.register("password", {
                  required: "Password is required",
                  minLength: 6,
                }))}
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
              {(view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password) && (
                <p className="mt-1 text-sm text-red-600">
                  {(view === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password)?.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "Signing in..." : view === "login" ? "Sign in" : "Sign up"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            {view === "login" ? "Don’t have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setView(view === "login" ? "signup" : "login");
                setFormError("");
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-500 underline"
            >
              {view === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}