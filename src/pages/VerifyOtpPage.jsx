import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import OtpInput from "@/components/ui/OtpInput";
import { useAuth } from "@/context/AuthContext";
import { resendOtp, verifyOtp } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

export default function VerifyOtpPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || "");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await verifyOtp({ email: email.trim(), otp });
      toast.success("Email verified");
      if (user) setUser({ ...user, email: email.trim(), isVerified: true });
      navigate(user ? "/settings" : "/login");
    } catch (err) {
      setError(getErrorMessage(err));
      setOtp("");
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await resendOtp({ email: email.trim() });
      toast.success("If that email needs verifying, a new code is on its way");
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setResending(false);
  };

  return (
    <AuthLayout
      title="Check your email"
      description={state?.email ? `We sent a 6-digit code to ${state.email}. It expires in 5 minutes.` : "Enter your email and the 6-digit code we sent you."}
      footer={<Link to="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {state?.email ? null : (
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        )}
        <OtpInput value={otp} onChange={setOtp} />
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={otp.length !== 6 || !email} loading={submitting}>Verify email</Button>
        <Button variant="ghost" className="w-full" disabled={!email} loading={resending} onClick={handleResend}>Send a new code</Button>
        <p className="text-center text-sm text-ink-faint">Can't find it? Check your spam folder.</p>
      </form>
    </AuthLayout>
  );
}
