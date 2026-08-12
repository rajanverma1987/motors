"use client";

import { useCallback, useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { buildDemoAccountCredentialsEmailContent } from "@/lib/demo-account-credentials-email";

const FORM_ID = "admin-client-edit-form";

const PACKAGE_OPTIONS_EDIT = [
  { value: "", label: "Keep current package" },
  { value: "trial", label: "Trial (3-customer limit)" },
  { value: "free_ultimate", label: "Free Ultimate" },
  { value: "listing_only", label: "Directory listing only" },
  { value: "paypal", label: "PayPal plan…" },
];

const PACKAGE_OPTIONS_CREATE = [
  { value: "trial", label: "Trial (3-customer limit)" },
  { value: "free_ultimate", label: "Free Ultimate" },
  { value: "listing_only", label: "Directory listing only" },
  { value: "paypal", label: "PayPal plan…" },
];

function generateTempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let s = "";
  for (let i = 0; i < 14; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function planLabelFor(packageKind, plans, planId) {
  if (packageKind === "trial") return "Trial";
  if (packageKind === "free_ultimate") return "Free Ultimate";
  if (packageKind === "listing_only") return "Directory listing";
  if (packageKind === "paypal" && planId) {
    const p = plans.find((x) => x.value === planId);
    return p?.name || "PayPal plan";
  }
  return "";
}

export default function AdminClientEditModal({ client = null, open, onClose, onSaved, mode = "edit" }) {
  const isCreate = mode === "create" || !client;
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [shopName, setShopName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [packageKind, setPackageKind] = useState("");
  const [planId, setPlanId] = useState("");
  const [plans, setPlans] = useState([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBodyHtml, setEmailBodyHtml] = useState("");
  const [emailDirty, setEmailDirty] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  const rebuildEmail = useCallback(
    (next = {}) => {
      const pwd = next.password ?? password;
      const to = (next.email ?? email).trim().toLowerCase();
      const shop = next.shopName ?? shopName;
      const contact = next.contactName ?? contactName;
      const kind = next.packageKind ?? packageKind;
      const pid = next.planId ?? planId;
      if (!pwd) return;
      if (!isCreate && !client?.id) return;
      const built = buildDemoAccountCredentialsEmailContent({
        to: to || client?.email || "",
        shopName: shop || client?.shopName || "",
        contactName: contact || client?.contactName || "",
        userId: isCreate ? "(assigned after create)" : String(client.id),
        plainPassword: pwd,
        planLabel:
          planLabelFor(kind, plans, pid) ||
          client?.subscriptionSummary?.planName ||
          "",
      });
      setEmailSubject(built.subject);
      setEmailBodyHtml(built.bodyHtml);
      setEmailDirty(false);
    },
    [password, email, shopName, contactName, packageKind, planId, plans, client, isCreate]
  );

  useEffect(() => {
    if (!open) return;

    if (isCreate) {
      const pwd = generateTempPassword();
      setShopName("");
      setContactName("");
      setEmail("");
      setPassword(pwd);
      setPackageKind("trial");
      setPlanId("");
      setEmailDirty(false);
      setEditingEmail(false);
      const built = buildDemoAccountCredentialsEmailContent({
        to: "",
        shopName: "",
        contactName: "",
        userId: "(assigned after create)",
        plainPassword: pwd,
        planLabel: "Trial",
      });
      setEmailSubject(built.subject);
      setEmailBodyHtml(built.bodyHtml);
    } else if (client) {
      setShopName(client.shopName || "");
      setContactName(client.contactName || "");
      setEmail(client.email || "");
      setPassword("");
      setPackageKind("");
      setPlanId("");
      setEmailDirty(false);
      setEditingEmail(false);
      setEmailSubject("");
      setEmailBodyHtml("");
    }

    (async () => {
      try {
        const plansRes = await fetch("/api/admin/subscription-plans", { credentials: "include" });
        const plansData = await plansRes.json().catch(() => ({}));
        const paypalPlans = (plansData.plans || []).filter(
          (p) => p.planType === "paypal" && p.active && p.paypalPlanId
        );
        const mapped = paypalPlans.map((p) => ({
          value: p.id,
          label: `${p.name} — ${p.currency} ${Number(p.customPrice).toFixed(2)} (${p.billingCycle})`,
          name: p.name,
        }));
        setPlans(mapped);
        if (mapped[0]) setPlanId(mapped[0].value);
      } catch {
        setPlans([]);
      }
    })();
  }, [open, client, isCreate]);

  function handleGeneratePassword() {
    const pwd = generateTempPassword();
    setPassword(pwd);
    rebuildEmail({ password: pwd });
  }

  function handleFieldBlurRebuild() {
    if (!emailDirty && password) rebuildEmail();
  }

  async function submit(sendEmail) {
    if (!email.trim()) {
      toast.error("Login email is required.");
      return;
    }
    if (isCreate && (!password || password.length < 6)) {
      toast.error("Generate or enter a password (min 6 characters).");
      return;
    }
    if (sendEmail && (!password || password.length < 6)) {
      toast.error("Generate or enter a password (min 6 characters) to send credentials.");
      return;
    }
    if (packageKind === "paypal" && !planId) {
      toast.error("Select a PayPal plan.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        shopName,
        contactName,
        email,
        password: password || undefined,
        packageKind: packageKind || undefined,
        planId: packageKind === "paypal" ? planId : undefined,
        sendEmail: !!sendEmail,
        ...(emailDirty || !isCreate
          ? { emailSubject, emailBodyHtml }
          : sendEmail
            ? {}
            : { emailSubject, emailBodyHtml }),
      };
      // On create + send with default template, let the server build email with the real user id.
      if (isCreate && sendEmail && !emailDirty) {
        delete payload.emailSubject;
        delete payload.emailBodyHtml;
      }

      const res = await fetch(isCreate ? "/api/admin/users" : `/api/admin/users/${client.id}/demo-credentials`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (isCreate ? "Create failed" : "Save failed"));

      if (data.packageError) {
        toast.error(data.packageError);
      } else if (sendEmail) {
        if (data.emailSent) {
          toast.success(isCreate ? "Client created and credentials emailed." : "Saved and demo credentials emailed.");
        } else {
          toast.error(data.emailError || (isCreate ? "Client created, but email failed." : "Saved, but email failed to send."));
        }
      } else {
        toast.success(isCreate ? "Client created." : "Client details saved.");
      }
      if (data.approvalUrl) {
        try {
          await navigator.clipboard.writeText(data.approvalUrl);
          toast.info("PayPal approval URL copied to clipboard.");
        } catch {
          /* ignore */
        }
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message || (isCreate ? "Create failed" : "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    submit(false);
  }

  if (!open) return null;
  if (!isCreate && !client) return null;

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      showClose={!saving}
      title={isCreate ? "Add client" : "Edit client"}
      size="3xl"
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => submit(false)}>
            {saving ? (isCreate ? "Creating…" : "Saving…") : isCreate ? "Create" : "Save"}
          </Button>
          <Button type="button" variant="primary" size="sm" disabled={saving} onClick={() => submit(true)}>
            {saving
              ? isCreate
                ? "Creating…"
                : "Sending…"
              : isCreate
                ? "Create & send credentials"
                : "Save & send credentials"}
          </Button>
        </>
      }
    >
      <Form id={FORM_ID} onSubmit={handleFormSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <FormSectionTitle>Customer details</FormSectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Shop name"
            name="shopName"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            onBlur={handleFieldBlurRebuild}
          />
          <Input
            label="Contact name"
            name="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            onBlur={handleFieldBlurRebuild}
          />
        </div>
        <Input
          label="Login email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={handleFieldBlurRebuild}
          required
        />

        <FormSectionTitle>Login password</FormSectionTitle>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Input
              label="Password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handleFieldBlurRebuild}
              autoComplete="new-password"
              required={isCreate}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword} disabled={saving}>
            <FiRefreshCw className="h-4 w-4 shrink-0" />
            Generate random
          </Button>
        </div>
        <p className="text-xs text-secondary">
          {isCreate
            ? "A password is required to create the account. Use Generate random for a secure temp password."
            : "Click Generate random to set a new login password. Leave empty when saving details/package only (password unchanged). Required for Save & send credentials."}
        </p>

        <FormSectionTitle>Package</FormSectionTitle>
        <Select
          label="Assign package"
          name="packageKind"
          options={isCreate ? PACKAGE_OPTIONS_CREATE : PACKAGE_OPTIONS_EDIT}
          value={packageKind}
          onChange={(e) => {
            const v = e.target.value;
            setPackageKind(v);
            if (!emailDirty) rebuildEmail({ packageKind: v });
          }}
        />
        {packageKind === "paypal" ? (
          plans.length > 0 ? (
            <Select
              label="PayPal plan"
              name="planId"
              options={plans.map(({ value, label }) => ({ value, label }))}
              value={planId}
              onChange={(e) => {
                const v = e.target.value;
                setPlanId(v);
                if (!emailDirty) rebuildEmail({ planId: v });
              }}
              placeholder="Select plan"
            />
          ) : (
            <p className="text-sm text-warning">
              No active PayPal plans. Create one under Admin → Subscriptions.
            </p>
          )
        ) : null}

        <FormSectionTitle>Demo credentials email</FormSectionTitle>
        <p className="text-xs text-secondary">
          Preview what the client receives. Edit subject or body before sending.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={editingEmail ? "primary" : "outline"}
            size="sm"
            onClick={() => setEditingEmail((v) => !v)}
          >
            {editingEmail ? "Show preview" : "Edit email"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => rebuildEmail()} disabled={!password}>
            Reset to default
          </Button>
        </div>

        {editingEmail ? (
          <div className="space-y-3">
            <Input
              label="Subject"
              name="emailSubject"
              value={emailSubject}
              onChange={(e) => {
                setEmailSubject(e.target.value);
                setEmailDirty(true);
              }}
            />
            <Textarea
              label="Body (HTML)"
              name="emailBodyHtml"
              rows={12}
              value={emailBodyHtml}
              onChange={(e) => {
                setEmailBodyHtml(e.target.value);
                setEmailDirty(true);
              }}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
            <div className="border-b border-border px-3 py-2 text-xs text-secondary">
              Subject: <span className="text-title">{emailSubject || "—"}</span>
            </div>
            <div
              className="prose prose-sm max-w-none bg-white p-4 text-sm text-black dark:bg-white"
              dangerouslySetInnerHTML={{
                __html:
                  emailBodyHtml ||
                  "<p style='color:#666'>Generate or enter a password to build the email preview.</p>",
              }}
            />
          </div>
        )}
      </Form>
    </Modal>
  );
}
