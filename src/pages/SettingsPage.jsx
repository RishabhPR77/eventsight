import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { Input, PasswordInput, Toggle } from "@/components/ui/Field";
import { Card, PageHeader } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { changePassword, deleteAccount, updateProfile } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";

function Section({ title, description, children, danger = false }) {
  return (
    <Card surface={danger ? "border-bad/30 bg-white shadow-card" : undefined} className="p-5 sm:p-6">
      <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <h2 className={danger ? "text-lg font-semibold text-bad" : "text-lg font-semibold"}>{title}</h2>
          <p className="mt-1 text-sm text-ink-soft">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Card>
  );
}

function ProfileSection() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await updateProfile({
        username: String(form.get("username") || "").trim() || undefined,
        email: String(form.get("email") || "").trim() || undefined,
      });
      setUser(res.data.user);
      if (res.data.emailChanged) {
        toast.success("Enter the code we sent to your new email");
        navigate("/verify-otp", { state: { email: res.data.user.email } });
        return;
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSaving(false);
  };

  return (
    <Section title="Profile" description="Changing your email means verifying the new address.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Username" name="username" autoComplete="username" minLength={3} maxLength={30} defaultValue={user?.username} required />
        <Input label="Email" name="email" type="email" autoComplete="email" defaultValue={user?.email} required />
        <Button type="submit" loading={saving}>Save changes</Button>
      </form>
    </Section>
  );
}

function AlertsSection() {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleChange = async (e) => {
    const emailAlerts = e.target.checked;
    setSaving(true);
    try {
      const res = await updateProfile({ emailAlerts });
      setUser(res.data.user);
      toast.success(emailAlerts ? "Email alerts are on" : "Email alerts are off");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setSaving(false);
  };

  return (
    <Section title="Email alerts" description="The bell shows everything while you're here. Emails are for when you're not.">
      <Toggle
        label="Email me when I'm away"
        hint="Offers, messages and sponsorship updates."
        checked={user?.emailAlerts !== false}
        disabled={saving}
        onChange={handleChange}
      />
    </Section>
  );
}

function PasswordSection() {
  const { signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(["oldPassword", "newPassword", "confirmPassword"].map((key) => [key, String(form.get(key) || "")]));
    if (payload.newPassword !== payload.confirmPassword) {
      setError("The two new passwords don't match.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(payload);
      toast.success("Password changed. Please sign in again.");
      await signOut().catch(() => {});
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Section title="Password" description="You'll be signed out after changing it.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput label="Current password" name="oldPassword" autoComplete="current-password" required />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput label="New password" name="newPassword" autoComplete="new-password" minLength={8} hint="At least 8 characters." required />
          <PasswordInput label="Confirm new password" name="confirmPassword" autoComplete="new-password" required />
        </div>
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button type="submit" loading={saving}>Change password</Button>
      </form>
    </Section>
  );
}

function DeleteSection() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
      setUser(null);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <Section danger title="Delete account" description="This can't be undone. Finish any accepted sponsorships first.">
      <div className="space-y-3">
        <Input label="Type DELETE to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p> : null}
        <Button variant="danger" disabled={typed !== "DELETE"} loading={deleting} onClick={handleDelete}>Delete my account</Button>
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your account." />
      <div className="space-y-4">
        <ProfileSection />
        <AlertsSection />
        <PasswordSection />
        <DeleteSection />
      </div>
      <p className="mt-6 text-sm text-ink-faint">
        <Link to="/privacy" className="hover:text-ink">Privacy Policy</Link> · <Link to="/terms" className="hover:text-ink">Terms of Use</Link>
      </p>
    </>
  );
}
