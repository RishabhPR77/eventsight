import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Field";
import { registerOrganizer, registerSponsor } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

const ROLES = {
  sponsor: {
    title: "Create your sponsor account",
    description: "Set up your account, then add your brand.",
    register: registerSponsor,
    switchText: "Organizing an event instead?",
    switchLink: "Sign up as an organizer",
    switchTo: "/register?role=organizer",
  },
  organizer: {
    title: "Create your organizer account",
    description: "Set up your account, then publish your first event.",
    register: registerOrganizer,
    switchText: "Looking to sponsor instead?",
    switchLink: "Sign up as a sponsor",
    switchTo: "/register?role=sponsor",
  },
};

// The role comes from the landing page the visitor chose, so it isn't asked again here
export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const role = ROLES[params.get("role")];
  if (!role) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      username: String(form.get("username") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
    };
    try {
      await role.register(payload);
      navigate("/verify-otp", { state: { email: payload.email } });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={role.title}
      description={role.description}
      footer={(
        <div className="space-y-1.5">
          <p>Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p>
          <p>{role.switchText} <Link to={role.switchTo} className="font-semibold text-brand hover:underline">{role.switchLink}</Link></p>
        </div>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Username" name="username" autoComplete="username" minLength={3} maxLength={30} autoFocus required />
        <Input label="Email" name="email" type="email" autoComplete="email" hint="We'll send a code to verify it." required />
        <PasswordInput label="Password" name="password" autoComplete="new-password" minLength={8} hint="At least 8 characters." required />
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
