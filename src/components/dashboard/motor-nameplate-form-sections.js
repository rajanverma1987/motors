"use client";

import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { MOTOR_TYPE_SELECT_OPTIONS } from "@/lib/motor-type-options";

/**
 * Same layout as Customer's motors — "Customer & identification" serial row (without customer select)
 * plus "Motor details" grid. Values are keyed like the Motor model.
 */
export default function MotorNameplateFormSections({ values, onFieldChange, disabled = false }) {
  const v = values || {};
  const ch = (key) => (e) => onFieldChange(key, e.target.value ?? "");

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="w-full min-w-0">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Nameplate & identification</h3>
        <div className="grid w-full min-w-0 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Serial number"
            value={v.serialNumber ?? ""}
            onChange={ch("serialNumber")}
            placeholder="Serial number"
            disabled={disabled}
            className="min-w-0"
          />
        </div>
      </div>
      <div className="w-full min-w-0">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Motor details</h3>
        <div className="grid w-full min-w-0 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Manufacturer"
            value={v.manufacturer ?? ""}
            onChange={ch("manufacturer")}
            placeholder="Manufacturer"
            disabled={disabled}
          />
          <Input label="Model" value={v.model ?? ""} onChange={ch("model")} placeholder="Model" disabled={disabled} />
          <Select
            label="Motor type"
            options={MOTOR_TYPE_SELECT_OPTIONS}
            value={v.motorType ?? ""}
            onChange={(e) => onFieldChange("motorType", e.target.value ?? "")}
            placeholder="Select type"
            searchable={false}
            disabled={disabled}
          />
          <Input label="HP" value={v.hp ?? ""} onChange={ch("hp")} placeholder="e.g. 50" disabled={disabled} />
          <Input label="RPM" value={v.rpm ?? ""} onChange={ch("rpm")} placeholder="e.g. 1800" disabled={disabled} />
          <Input
            label="Voltage"
            value={v.voltage ?? ""}
            onChange={ch("voltage")}
            placeholder="e.g. 480V"
            disabled={disabled}
          />
          <Input label="KW" value={v.kw ?? ""} onChange={ch("kw")} placeholder="e.g. 37" disabled={disabled} />
          <Input label="AMPs" value={v.amps ?? ""} onChange={ch("amps")} placeholder="e.g. 45" disabled={disabled} />
          <Input
            label="Frame size"
            value={v.frameSize ?? ""}
            onChange={ch("frameSize")}
            placeholder="Frame size"
            disabled={disabled}
          />
          <Input label="Slots" value={v.slots ?? ""} onChange={ch("slots")} placeholder="Slots" disabled={disabled} />
          <Input
            label="Core length"
            value={v.coreLength ?? ""}
            onChange={ch("coreLength")}
            placeholder="Core length"
            disabled={disabled}
          />
          <Input
            label="Core diameter"
            value={v.coreDiameter ?? ""}
            onChange={ch("coreDiameter")}
            placeholder="Core diameter"
            disabled={disabled}
          />
          <Input label="Bars" value={v.bars ?? ""} onChange={ch("bars")} placeholder="Bars" disabled={disabled} />
        </div>
      </div>
    </div>
  );
}
