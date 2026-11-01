import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { login } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") || "").trim();
    try {
      const res = await login({ username, password: String(form.get("password") || "") });
      setUser(res.data.user);
    } catch (err) {
      const message = getErrorMessage(err);
      if (/verify your email/i.test(message)) {
        navigate("/verify-otp", { state: { needsResend: true } });
        return;
      }
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your SponsorWise account."
      footer={<>New here? <Link to="/" className="font-semibold text-brand hover:underline">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Username" name="username" autoComplete="username" autoFocus required />
        <div>
          <PasswordInput label="Password" name="password" autoComplete="current-password" required />
          <Link to="/forgot-password" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
}
