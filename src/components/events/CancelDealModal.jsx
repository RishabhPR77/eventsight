import { useState } from "react";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";

export default function CancelDealModal({ open, onClose, onSubmit }) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit(String(new FormData(e.currentTarget).get("reason")).trim());
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Cancel this sponsorship?" description="The other side will see your reason. You can't undo this.">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalBody>
          <Textarea label="Reason" name="reason" minLength={5} maxLength={500} rows={3} placeholder="Why are you cancelling?" required />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>Keep sponsorship</Button>
          <Button type="submit" variant="danger" loading={saving}>Cancel sponsorship</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
