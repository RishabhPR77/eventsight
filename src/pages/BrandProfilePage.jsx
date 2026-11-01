import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Pencil, Store, Target, Trash2, MapPinned } from "lucide-react";
import BrandForm from "@/components/brand/BrandForm";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/Confirm";
import { Avatar, Badge, Card, EmptyState, ErrorState, PageHeader, PageSpinner } from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { deleteSponsorProfile, getSponsorProfile } from "@/lib/api";
import { CITY_FOCUS_LABELS, KPI_LABELS } from "@/lib/labels";
import { getErrorMessage, titleCase } from "@/lib/utils";

export default function BrandProfilePage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const { data: profile, loading, error, reload } = useResource(() => getSponsorProfile().then((res) => res.data));

  const handleDelete = async () => {
    const yes = await confirm({
      title: "Delete brand profile?",
      message: "You won't be able to apply to events or run AI analysis until you create a new one.",
      confirmLabel: "Delete profile",
      danger: true,
    });
    if (!yes) return;
    try {
      await deleteSponsorProfile();
      toast.success("Brand profile deleted");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <PageSpinner label="Loading your brand…" />;

  return (
    <>
      <PageHeader title="Your brand" description="Organizers see this when you apply, and the AI uses it to judge event fit." />

      {error ? <Card><ErrorState error={error} onRetry={reload} /></Card> : null}

      {!error && !profile ? (
        <Card>
          <EmptyState
            icon={Store}
            title="No brand profile yet"
            description="Create one to apply to events and run AI analysis."
            action={<Button onClick={() => setEditing(true)}>Create brand profile</Button>}
          />
        </Card>
      ) : null}

      {profile ? (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={profile.brandName} src={profile.logo} className="h-20 w-20 text-xl" rounded="rounded-2xl" />
            <div className="min-w-0 flex-1 basis-56">
              <h2 className="text-2xl font-bold">{profile.brandName}</h2>
              <Badge tone="brand" className="mt-1.5">{titleCase(profile.brandType?.name) || "No industry set"}</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Button>
              <Button variant="danger-soft" aria-label="Delete brand profile" onClick={handleDelete}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
            </div>
          </div>
          <p className="mt-5 whitespace-pre-line text-ink-soft">{profile.description}</p>
          <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-ink-faint" aria-hidden="true" />
              <div><dt className="text-sm text-ink-soft">Main goal</dt><dd className="font-semibold">{KPI_LABELS[profile.brandKpi]}</dd></div>
            </div>
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-ink-faint" aria-hidden="true" />
              <div><dt className="text-sm text-ink-soft">Where you focus</dt><dd className="font-semibold">{CITY_FOCUS_LABELS[profile.cityFocus]}</dd></div>
            </div>
          </dl>
        </Card>
      ) : null}

      <BrandForm
        open={editing}
        profile={profile}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          reload();
        }}
      />
    </>
  );
}
