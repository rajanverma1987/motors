"use client";

import {
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
} from "@/lib/work-order-fields";

function SpecBlock({ title, subtitle, specs, fields }) {
  if (!fields?.length) return null;
  const data = specs && typeof specs === "object" ? specs : {};
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">{title}</h3>
      {subtitle ? <p className="mb-3 text-xs text-secondary">{subtitle}</p> : null}
      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
        {fields.map((f) => {
          const raw = data[f.key];
          const value =
            raw != null && String(raw).trim() !== "" ? String(raw).trim() : "—";
          return (
            <div key={f.key}>
              <dt className="text-secondary">{f.label}</dt>
              <dd className="text-title break-words">{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/**
 * Read-only customer's motor: identification + technical fields by motor type (AC vs DC+armature).
 */
export default function MotorAssetReadonlyDetail({ motor, customerName }) {
  if (!motor) return null;
  const cust = customerName ?? motor.customerId ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer</h3>
        <p className="text-title font-medium">{cust}</p>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
          Identification & specs
        </h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-secondary">Serial</dt>
            <dd className="text-title">{motor.serialNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Manufacturer</dt>
            <dd className="text-title">{motor.manufacturer || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Model</dt>
            <dd className="text-title">{motor.model || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Motor type</dt>
            <dd className="text-title">{motor.motorType || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">HP</dt>
            <dd className="text-title">{motor.hp || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">RPM</dt>
            <dd className="text-title">{motor.rpm || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Voltage</dt>
            <dd className="text-title">{motor.voltage || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">KW</dt>
            <dd className="text-title">{motor.kw || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">AMPs</dt>
            <dd className="text-title">{motor.amps || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Frame size</dt>
            <dd className="text-title">{motor.frameSize || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Slots</dt>
            <dd className="text-title">{motor.slots || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Core length</dt>
            <dd className="text-title">{motor.coreLength || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Core diameter</dt>
            <dd className="text-title">{motor.coreDiameter || "—"}</dd>
          </div>
          <div>
            <dt className="text-secondary">Bars</dt>
            <dd className="text-title">{motor.bars || "—"}</dd>
          </div>
        </dl>
      </div>
      {String(motor.motorType || "").toUpperCase() === "DC" ? (
        <>
          <SpecBlock
            title="DC motor — technical (customer's motor)"
            subtitle="Stored on motor; pre-fills DC work orders."
            specs={motor.dcSpecs}
            fields={DC_WORK_ORDER_FIELDS}
          />
          <SpecBlock
            title="Armature (customer's motor)"
            subtitle="Stored on motor; pre-fills DC armature tab."
            specs={motor.dcArmatureSpecs}
            fields={DC_ARMATURE_FIELDS}
          />
        </>
      ) : (
        <SpecBlock
          title="AC winding & technical (customer's motor)"
          subtitle="Stored on motor; pre-fills AC work orders."
          specs={motor.acSpecs}
          fields={AC_WORK_ORDER_FIELDS}
        />
      )}
      {(motor.notes || "").trim() ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-title">{motor.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
