import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { forgetPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const email = String(new FormData(e.currentTarget).get("email") || "").trim();
    try {
      await forgetPassword({ email });
      navigate("/reset-password", { state: { email } });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email and we'll send you a code."
      footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" name="email" type="email" autoComplete="email" autoFocus required />
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>Send code</Button>
      </form>
    </AuthLayout>
  );
}
