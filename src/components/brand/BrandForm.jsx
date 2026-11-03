import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Field";
import ImageField from "@/components/ui/ImageField";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { createSponsorProfile, fetchBrandTypes, updateSponsorProfile } from "@/lib/api";
import { useResource } from "@/hooks/useResource";
import { CITY_FOCUS_LABELS, KPI_LABELS } from "@/lib/labels";
import { getErrorMessage, titleCase } from "@/lib/utils";

function BrandFormBody({ profile, onClose, onSaved }) {
  const { data: brandTypes } = useResource(fetchBrandTypes);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    if (!form.get("logo")?.size) form.delete("logo");
    try {
      await (profile ? updateSponsorProfile(form) : createSponsorProfile(form));
      toast.success(profile ? "Brand profile updated" : "Brand profile created");
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <ImageField name="logo" label="Logo" current={profile?.logo} hint="Up to 5 MB" aspect="aspect-square max-sm:w-28" />
          <div className="space-y-4">
            <Input label="Brand name" name="brandName" defaultValue={profile?.brandName} placeholder="Nimbu Beverages" required />
            {brandTypes ? (
              <Select label="Industry" name="brandType" defaultValue={profile?.brandType?._id || ""} hint={brandTypes.length ? undefined : "No industries yet. Please try again in a minute."} required>
                <option value="" disabled>{brandTypes.length ? "Choose an industry" : "No industries yet"}</option>
                {brandTypes.map((item) => <option key={item._id} value={item._id}>{titleCase(item.name)}</option>)}
              </Select>
            ) : <div className="h-[74px] animate-pulse rounded-xl bg-sand" />}
          </div>
        </div>
        <Textarea label="About your brand" name="description" defaultValue={profile?.description} rows={4} placeholder="What do you sell, and who do you want to reach?" hint="The AI uses this to judge how well events fit you." required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Main goal" name="brandKpi" defaultValue={profile?.brandKpi || "awareness"}>
            {Object.entries(KPI_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
          <Select label="Where you focus" name="cityFocus" defaultValue={profile?.cityFocus || "all_mp"}>
            {Object.entries(CITY_FOCUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </Select>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={submitting}>{profile ? "Save changes" : "Create profile"}</Button>
      </ModalFooter>
    </form>
  );
}

export default function BrandForm({ open, profile, onClose, onSaved }) {
  return (
    <Modal open={open} onClose={onClose} title={profile ? "Edit brand profile" : "Create your brand profile"} description={profile ? null : "You need this to apply to events and run AI analysis."}>
      {open ? <BrandFormBody profile={profile} onClose={onClose} onSaved={onSaved} /> : null}
    </Modal>
  );
}
