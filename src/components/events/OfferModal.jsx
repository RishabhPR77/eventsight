import { useState } from "react";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import Modal, { ModalBody, ModalFooter } from "@/components/ui/Modal";
import { rupees } from "@/lib/utils";

// Counter-offers: each side answers the other's latest number until one accepts
export default function OfferModal({ open, currentAmount, onClose, onSubmit }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    await onSubmit({ amount: Number(form.get("amount")), message: String(form.get("message") || "") });
    setSubmitting(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Make a counter-offer" description={`The current offer is ${rupees(currentAmount)}.`}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="space-y-4">
          <Input label="Your amount (₹)" name="amount" type="number" min="1" defaultValue={currentAmount} autoFocus required />
          <Textarea label="Add a note" name="message" optional maxLength={1000} rows={3} placeholder="Explain what this amount covers" />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submitting}>Send counter-offer</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
