"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Badge from "@/components/ui/badge";
import Checkbox from "@/components/ui/checkbox";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const STATUS_COLORS = { "in-review": "warning", pending: "warning", approved: "success", rejected: "danger" };

const SERVICES_OFFERED = [
  { key: "acMotorRepair", label: "AC Motor Repair" },
  { key: "dcMotorRepair", label: "DC Motor Repair" },
  { key: "motorRewinding", label: "Motor Rewinding" },
  { key: "pumpRepair", label: "Pump Repair" },
  { key: "generatorRepair", label: "Generator Repair" },
  { key: "servoMotorRepair", label: "Servo Motor Repair" },
  { key: "spindleRepair", label: "Spindle Repair" },
  { key: "vfdRepair", label: "VFD Repair" },
  { key: "fieldService", label: "Field Service" },
  { key: "emergencyRepair", label: "Emergency Repair (24/7)" },
  { key: "onSiteTroubleshooting", label: "On-site Troubleshooting" },
];
const MOTOR_CAPABILITIES = [
  { key: "lowVoltage", label: "Low Voltage" },
  { key: "mediumVoltage", label: "Medium Voltage" },
  { key: "highVoltage", label: "High Voltage" },
  { key: "explosionProof", label: "Explosion Proof" },
  { key: "hazardousLocation", label: "Hazardous Location" },
  { key: "submersible", label: "Submersible" },
];
const EQUIPMENT_TESTING = [
  { key: "dynamometer", label: "Dynamometer" },
  { key: "surge", label: "Surge" },
  { key: "vibration", label: "Vibration" },
  { key: "balancing", label: "Balancing" },
  { key: "laserAlignment", label: "Laser Alignment" },
  { key: "infrared", label: "Infrared" },
  { key: "loadTesting", label: "Load Testing" },
  { key: "highVoltageTesting", label: "High Voltage Testing" },
];
const REWINDING_CAPABILITIES = [
  { key: "acMotorRewinding", label: "AC Motor Rewinding" },
  { key: "dcArmatureRewinding", label: "DC Armature Rewinding" },
  { key: "fieldCoilRewinding", label: "Field Coil Rewinding" },
  { key: "coilManufacturing", label: "Coil Manufacturing" },
  { key: "vpi", label: "VPI" },
  { key: "insulationUpgrades", label: "Insulation Upgrades" },
];
const INDUSTRIES_SERVED = [
  { key: "manufacturing", label: "Manufacturing" },
  { key: "oilGas", label: "Oil & Gas" },
  { key: "waterTreatment", label: "Water Treatment" },
  { key: "powerPlants", label: "Power Plants" },
  { key: "mining", label: "Mining" },
  { key: "hvac", label: "HVAC" },
  { key: "foodProcessing", label: "Food Processing" },
  { key: "agriculture", label: "Agriculture" },
];
const CERTIFICATIONS = [
  { key: "easaMember", label: "EASA Member" },
  { key: "isoCertification", label: "ISO Certification" },
  { key: "ulCertified", label: "UL Certified" },
  { key: "factoryAuthorizedRepair", label: "Factory Authorized Repair" },
  { key: "insuranceCoverage", label: "Insurance Coverage" },
];

function CheckboxGroup({ name, options, selected = [], onToggle }) {
  const toggle = (key) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    onToggle(name, next);
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map(({ key, label }) => (
        <Checkbox
          key={key}
          name={key}
          label={label}
          checked={selected.includes(key)}
          onChange={() => toggle(key)}
        />
      ))}
    </div>
  );
}

export default function AdminListingDetailPage() {
  const params = useParams();
  const toast = useToast();
  const id = params?.id;
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const listingRef = useRef(listing);
  listingRef.current = listing;

  useEffect(() => {
    if (!id) return;
    setFetchError("");
    fetch(`/api/listings/${id}`, { credentials: "include", cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          setFetchError("Session expired. Please log in again.");
          return null;
        }
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => data && setListing(data))
      .catch(() => setFetchError("Listing not found or failed to load."))
      .finally(() => setLoading(false));
  }, [id]);

  function updateField(field, value) {
    setListing((prev) => (prev ? { ...prev, [field]: value } : null));
  }

  function updateFieldBool(field, value) {
    setListing((prev) => (prev ? { ...prev, [field]: !!value } : null));
  }

  async function handleLogoFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/upload/logo", { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error || "Logo upload failed");
      const patchRes = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ logoUrl: upData.url }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error || "Failed to save logo");
      setListing(patchData.listing);
      listingRef.current = patchData.listing;
      toast.success("Logo saved.");
    } catch (err) {
      toast.error(err.message || "Logo upload failed");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleGalleryUpload(e) {
    const files = e.target.files;
    if (!files?.length || !id) return;
    setGalleryUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
      const res = await fetch(`/api/listings/${id}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const urls = data.urls ?? [];
      setListing((prev) =>
        prev
          ? { ...prev, galleryPhotoUrls: [...(prev.galleryPhotoUrls ?? []), ...urls] }
          : null
      );
      if (urls.length) toast.success(`${urls.length} photo(s) added. Click Save to keep.`);
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setGalleryUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave() {
    const current = listingRef.current;
    if (!current) return;
    setSaving(true);
    try {
      // Build payload with all editable fields so nothing is omitted (JSON.stringify drops undefined)
      const payload = {
        companyName: current.companyName ?? "",
        email: (current.email ?? "").trim(),
        logoUrl: current.logoUrl ?? "",
        shortDescription: current.shortDescription ?? "",
        yearsInBusiness: current.yearsInBusiness ?? "",
        phone: current.phone ?? "",
        website: current.website ?? "",
        primaryContactPerson: current.primaryContactPerson ?? "",
        address: current.address ?? "",
        city: current.city ?? "",
        state: current.state ?? "",
        zipCode: current.zipCode ?? "",
        country: current.country ?? "",
        services: current.services ?? [],
        maxMotorSizeHP: current.maxMotorSizeHP ?? "",
        maxVoltage: current.maxVoltage ?? "",
        maxWeightHandled: current.maxWeightHandled ?? "",
        motorCapabilities: current.motorCapabilities ?? [],
        equipmentTesting: current.equipmentTesting ?? [],
        rewindingCapabilities: current.rewindingCapabilities ?? [],
        industriesServed: current.industriesServed ?? [],
        pickupDeliveryAvailable: !!current.pickupDeliveryAvailable,
        craneCapacity: current.craneCapacity ?? "",
        forkliftCapacity: current.forkliftCapacity ?? "",
        rushRepairAvailable: !!current.rushRepairAvailable,
        turnaroundTime: current.turnaroundTime ?? "",
        certifications: current.certifications ?? [],
        shopSizeSqft: current.shopSizeSqft ?? "",
        numTechnicians: current.numTechnicians ?? "",
        numEngineers: current.numEngineers ?? "",
        yearsCombinedExperience: current.yearsCombinedExperience ?? "",
        galleryPhotoUrls: current.galleryPhotoUrls ?? [],
        serviceZipCode: current.serviceZipCode ?? "",
        serviceRadiusMiles: current.serviceRadiusMiles ?? "",
        statesServed: current.statesServed ?? "",
        citiesOrMetrosServed: current.citiesOrMetrosServed ?? "",
        areaCoveredFrom: current.areaCoveredFrom ?? "",
      };
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setListing(data.listing);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!listing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setListing(data.listing);
      toast.success("Listing approved. Email sent to contact.");
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!listing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "rejected", rejectionReason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setListing(data.listing);
      setRejectReason("");
      toast.success("Listing rejected. Email sent to contact.");
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !listing) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        {loading && <p className="text-secondary">Loading…</p>}
        {!loading && fetchError && <p className="text-secondary">{fetchError}</p>}
        {!loading && !listing && !fetchError && <p className="text-secondary">Listing not found.</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin/listings">
            <Button variant="outline">Back to list</Button>
          </Link>
          {fetchError === "Session expired. Please log in again." && (
            <Link href="/admin/login">
              <Button variant="primary">Log in</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const statusLabel = listing.status === "pending" ? "In-review" : listing.status === "in-review" ? "In-review" : listing.status;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/listings" className="text-sm text-primary hover:underline">
            ← Listings
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-title">{listing.companyName}</h1>
          <p className="text-sm text-secondary">{listing.email}</p>
          {listing.submittedAt && (
            <p className="mt-1 text-xs text-secondary">
              Submitted {new Date(listing.submittedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Badge variant={STATUS_COLORS[listing.status] || "default"}>{statusLabel}</Badge>
      </div>

      {/* Company & contact */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Company & contact</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company name" value={listing.companyName ?? ""} onChange={(e) => updateField("companyName", e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-title">Company logo</label>
            <p className="mb-2 text-xs text-secondary">Upload an image — stored on this server (JPEG, PNG, GIF, WebP, max 2MB).</p>
            {listing.logoUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                <img
                  src={listing.logoUrl.startsWith("http") ? listing.logoUrl : listing.logoUrl.startsWith("/") ? listing.logoUrl : `/${listing.logoUrl}`}
                  alt="Logo"
                  className="h-16 w-16 rounded border border-border object-cover"
                />
                <label className="cursor-pointer text-sm text-primary hover:underline">
                  {logoUploading ? "Uploading…" : "Replace logo"}
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" onChange={handleLogoFileUpload} disabled={logoUploading} />
                </label>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleLogoFileUpload}
                  disabled={logoUploading}
                  className="block w-full max-w-sm text-sm text-secondary file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white"
                />
                {logoUploading && <p className="mt-1 text-xs text-secondary">Uploading…</p>}
              </div>
            )}
          </div>
          <Input label="Years in business" value={listing.yearsInBusiness ?? ""} onChange={(e) => updateField("yearsInBusiness", e.target.value)} />
          <Input label="Phone" value={listing.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} />
          <Input label="Email" value={listing.email ?? ""} onChange={(e) => updateField("email", e.target.value)} />
          <Input label="Website" value={listing.website ?? ""} onChange={(e) => updateField("website", e.target.value)} />
          <Input label="Primary contact" value={listing.primaryContactPerson ?? ""} onChange={(e) => updateField("primaryContactPerson", e.target.value)} className="sm:col-span-2" />
        </div>
        <Textarea label="Short description" value={listing.shortDescription ?? ""} onChange={(e) => updateField("shortDescription", e.target.value)} rows={2} className="mt-4" />
        <FormSectionTitle as="h3" className="mt-6">Address</FormSectionTitle>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <Input label="Address" value={listing.address ?? ""} onChange={(e) => updateField("address", e.target.value)} />
          <Input label="City" value={listing.city ?? ""} onChange={(e) => updateField("city", e.target.value)} />
          <Input label="State" value={listing.state ?? ""} onChange={(e) => updateField("state", e.target.value)} />
          <Input label="ZIP" value={listing.zipCode ?? ""} onChange={(e) => updateField("zipCode", e.target.value)} />
          <Input label="Country" value={listing.country ?? ""} onChange={(e) => updateField("country", e.target.value)} />
        </div>
      </FormContainer>

      {/* Services offered */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Services offered</FormSectionTitle>
        <CheckboxGroup name="services" options={SERVICES_OFFERED} selected={listing.services ?? []} onToggle={updateField} />
      </FormContainer>

      {/* Motor capabilities */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Motor capabilities</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Max motor size (HP)" value={listing.maxMotorSizeHP ?? ""} onChange={(e) => updateField("maxMotorSizeHP", e.target.value)} />
          <Input label="Max voltage" value={listing.maxVoltage ?? ""} onChange={(e) => updateField("maxVoltage", e.target.value)} />
          <Input label="Max weight handled" value={listing.maxWeightHandled ?? ""} onChange={(e) => updateField("maxWeightHandled", e.target.value)} />
        </div>
        <div className="mt-4">
          <CheckboxGroup name="motorCapabilities" options={MOTOR_CAPABILITIES} selected={listing.motorCapabilities ?? []} onToggle={updateField} />
        </div>
      </FormContainer>

      {/* Equipment & testing */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Equipment & testing</FormSectionTitle>
        <CheckboxGroup name="equipmentTesting" options={EQUIPMENT_TESTING} selected={listing.equipmentTesting ?? []} onToggle={updateField} />
      </FormContainer>

      {/* Rewinding */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Rewinding capabilities</FormSectionTitle>
        <CheckboxGroup name="rewindingCapabilities" options={REWINDING_CAPABILITIES} selected={listing.rewindingCapabilities ?? []} onToggle={updateField} />
      </FormContainer>

      {/* Industries served */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Industries served</FormSectionTitle>
        <CheckboxGroup name="industriesServed" options={INDUSTRIES_SERVED} selected={listing.industriesServed ?? []} onToggle={updateField} />
      </FormContainer>

      {/* Logistics & handling */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Logistics & handling</FormSectionTitle>
        <div className="flex flex-wrap gap-6">
          <Checkbox name="pickupDeliveryAvailable" label="Pickup and delivery available" checked={!!listing.pickupDeliveryAvailable} onChange={(e) => updateFieldBool("pickupDeliveryAvailable", e.target.checked)} />
          <Checkbox name="rushRepairAvailable" label="Rush repair available" checked={!!listing.rushRepairAvailable} onChange={(e) => updateFieldBool("rushRepairAvailable", e.target.checked)} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Crane capacity" value={listing.craneCapacity ?? ""} onChange={(e) => updateField("craneCapacity", e.target.value)} />
          <Input label="Forklift capacity" value={listing.forkliftCapacity ?? ""} onChange={(e) => updateField("forkliftCapacity", e.target.value)} />
        </div>
        <Input label="Typical turnaround time" value={listing.turnaroundTime ?? ""} onChange={(e) => updateField("turnaroundTime", e.target.value)} className="mt-4" />
      </FormContainer>

      {/* Certifications */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Certifications</FormSectionTitle>
        <CheckboxGroup name="certifications" options={CERTIFICATIONS} selected={listing.certifications ?? []} onToggle={updateField} />
      </FormContainer>

      {/* Shop facilities */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Shop facilities</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Shop size (sq ft)" value={listing.shopSizeSqft ?? ""} onChange={(e) => updateField("shopSizeSqft", e.target.value)} />
          <Input label="Number of technicians" value={listing.numTechnicians ?? ""} onChange={(e) => updateField("numTechnicians", e.target.value)} />
          <Input label="Number of engineers" value={listing.numEngineers ?? ""} onChange={(e) => updateField("numEngineers", e.target.value)} />
        </div>
        <Input label="Years of combined experience" value={listing.yearsCombinedExperience ?? ""} onChange={(e) => updateField("yearsCombinedExperience", e.target.value)} className="mt-4 max-w-xs" />
      </FormContainer>

      {/* Gallery – show uploaded photos */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Gallery photos</FormSectionTitle>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.isArray(listing.galleryPhotoUrls) &&
            listing.galleryPhotoUrls.map((url, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-bg">
                <img
                  src={url.startsWith("http") ? url : url.startsWith("/") ? url : `/${url.replace(/^\//, "")}`}
                  alt={`Gallery ${i + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50' y='55' fill='%23999' text-anchor='middle' font-size='12'%3EImage%3C/text%3E%3C/svg%3E";
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = (listing.galleryPhotoUrls ?? []).filter((_, j) => j !== i);
                    updateField("galleryPhotoUrls", next);
                  }}
                  className="absolute right-1 top-1 rounded bg-danger/90 px-2 py-1 text-xs text-white hover:bg-danger"
                  aria-label="Remove photo"
                >
                  Remove
                </button>
              </div>
            ))}
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-title">Add photos</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleGalleryUpload}
            className="block w-full max-w-xs text-sm text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:opacity-90"
          />
          {galleryUploading && <p className="mt-2 text-sm text-secondary">Uploading…</p>}
        </div>
      </FormContainer>

      {/* Service region */}
      <FormContainer className="mb-6">
        <FormSectionTitle as="h2">Service region</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Service ZIP" value={listing.serviceZipCode ?? ""} onChange={(e) => updateField("serviceZipCode", e.target.value)} />
          <Input label="Radius (miles)" value={listing.serviceRadiusMiles ?? ""} onChange={(e) => updateField("serviceRadiusMiles", e.target.value)} />
          <Input label="States served" value={listing.statesServed ?? ""} onChange={(e) => updateField("statesServed", e.target.value)} />
          <Input label="Cities / metros" value={listing.citiesOrMetrosServed ?? ""} onChange={(e) => updateField("citiesOrMetrosServed", e.target.value)} />
        </div>
        <Textarea label="Area covered from" value={listing.areaCoveredFrom ?? ""} onChange={(e) => updateField("areaCoveredFrom", e.target.value)} rows={2} className="mt-4" />
      </FormContainer>

      {/* Status & review – at bottom */}
      <FormContainer className="mb-6 border border-border bg-card">
        <FormSectionTitle as="h2">Status & review</FormSectionTitle>
        {listing.reviewedAt && (
          <p className="mb-4 text-sm text-secondary">
            Reviewed {new Date(listing.reviewedAt).toLocaleString()}
            {listing.reviewedBy && ` by ${listing.reviewedBy}`}
            {listing.rejectionReason && (
              <span className="mt-1 block">Reason: {listing.rejectionReason}</span>
            )}
          </p>
        )}
        <div className="flex flex-col gap-4">
          <Textarea
            placeholder="Rejection reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={2}
            className="min-w-0"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={handleApprove} disabled={saving}>
              {saving ? "Saving…" : "Approve listing"}
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={saving}>
              Reject listing
            </Button>
          </div>
        </div>
      </FormContainer>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
