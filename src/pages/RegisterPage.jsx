import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Check, Store } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";
import Button from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Field";
import { registerOrganizer, registerSponsor } from "@/lib/api";
import { cn, getErrorMessage } from "@/lib/utils";

const ROLES = [
  { id: "sponsor", title: "I'm a sponsor", text: "I want to find events for my brand", icon: Store },
  { id: "organizer", title: "I'm an organizer", text: "I want sponsors for my event", icon: CalendarDays },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState("sponsor");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      await (role === "sponsor" ? registerSponsor(payload) : registerOrganizer(payload));
      navigate("/verify-otp", { state: { email: payload.email } });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      description="Choose how you'll use SponsorWise."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="sr-only">Account type</legend>
          {ROLES.map(({ id, title, text, icon: Icon }) => (
            <label
              key={id}
              className={cn(
                "relative cursor-pointer rounded-xl border p-3.5 transition focus-within:ring-2 focus-within:ring-marigold",
                role === id ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-ink-faint/50"
              )}
            >
              <input type="radio" name="role" value={id} checked={role === id} onChange={() => setRole(id)} className="sr-only" />
              <Icon className="h-5 w-5 text-brand" aria-hidden="true" />
              <span className="mt-2 block text-sm font-semibold">{title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{text}</span>
              {role === id ? (
                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              ) : null}
            </label>
          ))}
        </fieldset>

        <Input label="Username" name="username" autoComplete="username" minLength={3} maxLength={30} required />
        <Input label="Email" name="email" type="email" autoComplete="email" hint="We'll send a code to verify it." required />
        <PasswordInput label="Password" name="password" autoComplete="new-password" minLength={8} hint="At least 8 characters." required />
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting}>Create account</Button>
      </form>
    </AuthLayout>
  );
}
