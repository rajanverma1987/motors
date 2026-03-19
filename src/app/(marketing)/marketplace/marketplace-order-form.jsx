"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

export default function MarketplaceOrderForm({ itemSlug }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/marketplace/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemSlug,
          buyerName: name.trim(),
          buyerEmail: email.trim(),
          buyerPhone: phone.trim(),
          buyerMessage: message.trim(),
          quantity: Math.min(99, Math.max(1, parseInt(quantity, 10) || 1)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit");
      setDone(true);
      toast.success("Request sent. The seller will contact you.");
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-title">
        <p className="font-medium">Thanks — your request was sent.</p>
        <p className="mt-2 text-sm text-secondary">
          There is no payment on this site. The seller will reach out using the contact details you provided.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">Request this item</h2>
      <p className="mt-1 text-sm text-secondary">
        Submit your details. The seller will contact you directly. No payment is processed here.
      </p>
      <Form onSubmit={submit} className="mt-4 flex flex-col gap-3 !space-y-0">
        <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input
          label="Quantity"
          type="number"
          min={1}
          max={99}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Textarea
          label="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Questions, pickup location, timing…"
        />
        <Button type="submit" variant="primary" disabled={sending}>
          {sending ? "Sending…" : "Send request"}
        </Button>
      </Form>
    </div>
  );
}
