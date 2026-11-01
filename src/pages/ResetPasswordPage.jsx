import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Field";
import OtpInput from "@/components/ui/OtpInput";
import { resetPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) {
      setError("The two passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email: String(form.get("email") || "").trim(), otp, newPassword, confirmPassword });
      toast.success("Password changed. You can sign in now.");
      navigate("/login");
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      description="If that email has an account, we've sent it a 6-digit code."
      footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" name="email" type="email" autoComplete="email" defaultValue={state?.email || ""} required />
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Code</span>
          <OtpInput value={otp} onChange={setOtp} />
        </div>
        <PasswordInput label="New password" name="newPassword" autoComplete="new-password" minLength={8} hint="At least 8 characters." required />
        <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" required />
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={otp.length !== 6} loading={submitting}>Change password</Button>
      </form>
    </AuthLayout>
  );
}
