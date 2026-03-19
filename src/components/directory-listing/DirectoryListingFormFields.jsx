"use client";

import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Checkbox from "@/components/ui/checkbox";
import {
  FormContainer,
  FormSectionTitle,
} from "@/components/ui/form-layout";
import {
  SERVICES_OFFERED,
  MOTOR_CAPABILITIES,
  EQUIPMENT_TESTING,
  REWINDING_CAPABILITIES,
  INDUSTRIES_SERVED,
  CERTIFICATIONS,
} from "@/lib/directory-listing-constants";

function CheckboxGroup({ options, selected, onChange, name }) {
  const toggle = (key) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    onChange({ target: { name, value: next } });
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

/**
 * Same fields as the public “list your center” form (no marketing hero / steps).
 */
export default function DirectoryListingFormFields({
  formData,
  updateForm,
  updateFormBool,
  handleLogoFileChange,
  logoPreviewUrl,
  existingLogoUrl = "",
  clearLogo,
  logoError,
  handleGalleryPhotosChange,
  emailReadOnly = false,
  emailLabel = "Email",
  emailHelpText,
}) {
  const showExistingLogo = existingLogoUrl && !logoPreviewUrl;

  return (
    <div className="space-y-10">
      <FormContainer>
        <FormSectionTitle as="h2">Company & contact</FormSectionTitle>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_8rem]">
            <Input label="Company name" name="companyName" value={formData.companyName} onChange={updateForm} required />
            <Input label="Years in business" name="yearsInBusiness" type="number" min="0" placeholder="e.g. 25" value={formData.yearsInBusiness} onChange={updateForm} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-title">Company logo (optional)</label>
              <p className="mb-2 text-xs text-secondary">
                Upload a logo image — it is stored on our servers and shown on your listing. JPEG, PNG, GIF or WebP, max 2MB.
              </p>
              {logoPreviewUrl ? (
                <div className="flex items-center gap-3">
                  <img src={logoPreviewUrl} alt="Logo preview" className="h-16 w-16 rounded border border-border object-cover" />
                  <div>
                    <button type="button" onClick={clearLogo} className="text-sm text-primary hover:underline">
                      Remove new logo
                    </button>
                  </div>
                </div>
              ) : showExistingLogo ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <img src={existingLogoUrl} alt="Current logo" className="h-16 w-16 rounded border border-border object-cover" />
                    <span className="text-sm text-secondary">Current logo on file</span>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoFileChange}
                    className="block w-full text-sm text-secondary file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white file:transition-opacity hover:file:opacity-90"
                  />
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleLogoFileChange}
                  className="block w-full text-sm text-secondary file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white file:transition-opacity hover:file:opacity-90"
                />
              )}
              {logoError && <p className="mt-1 text-sm text-danger">{logoError}</p>}
            </div>
            <Input label="Website" name="website" type="url" placeholder="https://..." value={formData.website} onChange={updateForm} />
          </div>
          <Textarea label="Short description" name="shortDescription" placeholder="Brief description of your center for the listing" value={formData.shortDescription} onChange={updateForm} rows={2} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Phone" name="phone" type="tel" value={formData.phone} onChange={updateForm} required />
            <Input
              label={emailLabel}
              name="email"
              type="email"
              value={formData.email}
              onChange={updateForm}
              required
              readOnly={emailReadOnly}
              help={emailHelpText}
            />
            <Input label="Primary contact person" name="primaryContactPerson" value={formData.primaryContactPerson} onChange={updateForm} required />
          </div>
        </div>
        <FormSectionTitle as="h3" className="mt-6">Address</FormSectionTitle>
        <div className="mt-2 space-y-4">
          <Input label="Street address" name="address" value={formData.address} onChange={updateForm} required />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="City" name="city" value={formData.city} onChange={updateForm} required />
            <Input label="State" name="state" value={formData.state} onChange={updateForm} />
            <Input label="ZIP code" name="zipCode" value={formData.zipCode} onChange={updateForm} required />
            <Input label="Country" name="country" value={formData.country} onChange={updateForm} required />
          </div>
        </div>
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Services offered</FormSectionTitle>
        <CheckboxGroup name="services" options={SERVICES_OFFERED} selected={formData.services} onChange={updateForm} />
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Motor capabilities</FormSectionTitle>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Max motor size (HP)" name="maxMotorSizeHP" type="number" min="0" value={formData.maxMotorSizeHP} onChange={updateForm} />
            <Input label="Max voltage" name="maxVoltage" placeholder="e.g. 13.8 kV" value={formData.maxVoltage} onChange={updateForm} />
            <Input label="Max weight handled" name="maxWeightHandled" placeholder="e.g. 10,000 lbs" value={formData.maxWeightHandled} onChange={updateForm} />
          </div>
          <CheckboxGroup name="motorCapabilities" options={MOTOR_CAPABILITIES} selected={formData.motorCapabilities} onChange={updateForm} />
        </div>
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Equipment & testing capabilities</FormSectionTitle>
        <CheckboxGroup name="equipmentTesting" options={EQUIPMENT_TESTING} selected={formData.equipmentTesting} onChange={updateForm} />
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Rewinding capabilities</FormSectionTitle>
        <CheckboxGroup name="rewindingCapabilities" options={REWINDING_CAPABILITIES} selected={formData.rewindingCapabilities} onChange={updateForm} />
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Industries served</FormSectionTitle>
        <CheckboxGroup name="industriesServed" options={INDUSTRIES_SERVED} selected={formData.industriesServed} onChange={updateForm} />
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Logistics & handling</FormSectionTitle>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-6">
            <Checkbox name="pickupDeliveryAvailable" label="Pickup and delivery available" checked={formData.pickupDeliveryAvailable} onChange={(e) => updateFormBool("pickupDeliveryAvailable", e.target.checked)} />
            <Checkbox name="rushRepairAvailable" label="Rush repair available" checked={formData.rushRepairAvailable} onChange={(e) => updateFormBool("rushRepairAvailable", e.target.checked)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Crane capacity" name="craneCapacity" placeholder="e.g. 5 tons" value={formData.craneCapacity} onChange={updateForm} />
            <Input label="Forklift capacity" name="forkliftCapacity" placeholder="e.g. 10,000 lbs" value={formData.forkliftCapacity} onChange={updateForm} />
          </div>
          <Input label="Typical turnaround time" name="turnaroundTime" placeholder="e.g. 5–7 business days" value={formData.turnaroundTime} onChange={updateForm} />
        </div>
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Certifications</FormSectionTitle>
        <CheckboxGroup name="certifications" options={CERTIFICATIONS} selected={formData.certifications} onChange={updateForm} />
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Shop facilities</FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Shop size (sq ft)" name="shopSizeSqft" type="number" min="0" value={formData.shopSizeSqft} onChange={updateForm} />
          <Input label="Number of technicians" name="numTechnicians" type="number" min="0" value={formData.numTechnicians} onChange={updateForm} />
          <Input label="Number of engineers" name="numEngineers" type="number" min="0" value={formData.numEngineers} onChange={updateForm} />
        </div>
        <div className="mt-4 max-w-xs">
          <Input label="Years of combined experience" name="yearsCombinedExperience" type="number" min="0" value={formData.yearsCombinedExperience} onChange={updateForm} />
        </div>
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Gallery photos (optional)</FormSectionTitle>
        <p className="mb-4 text-sm text-secondary">
          Upload photos for your listing gallery. These will appear on your public listing page and help customers see your facility and work.
        </p>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-title">Upload photos</label>
          <input
            type="file"
            name="galleryPhotos"
            accept="image/*"
            multiple
            onChange={handleGalleryPhotosChange}
            className="block w-full text-sm text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:opacity-90"
          />
          {formData.galleryPhotos.length > 0 && (
            <p className="text-sm text-secondary">
              {formData.galleryPhotos.length} photo{formData.galleryPhotos.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>
      </FormContainer>

      <FormContainer>
        <FormSectionTitle as="h2">Where do you serve customers?</FormSectionTitle>
        <p className="mb-4 text-sm text-secondary">
          Customers look for repair centers by location. Tell us where you’re based and which areas you cover so they can find your listing when they search.
        </p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Primary service ZIP code"
              name="serviceZipCode"
              placeholder="e.g. 77001"
              value={formData.serviceZipCode}
              onChange={updateForm}
            />
            <Input
              label="Service radius (miles)"
              name="serviceRadiusMiles"
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={formData.serviceRadiusMiles}
              onChange={updateForm}
            />
          </div>
          <Input
            label="States served"
            name="statesServed"
            placeholder="e.g. Texas, Oklahoma, Louisiana"
            value={formData.statesServed}
            onChange={updateForm}
          />
          <Input
            label="Cities or metro areas"
            name="citiesOrMetrosServed"
            placeholder="e.g. Houston, Dallas–Fort Worth, San Antonio"
            value={formData.citiesOrMetrosServed}
            onChange={updateForm}
          />
          <Textarea
            label="Other areas or regions you cover"
            name="areaCoveredFrom"
            placeholder="e.g. Gulf Coast, West Texas, industrial parks in Pasadena"
            value={formData.areaCoveredFrom}
            onChange={updateForm}
            rows={2}
          />
        </div>
      </FormContainer>
    </div>
  );
}
