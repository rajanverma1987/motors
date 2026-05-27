"use client";

import { useSyncExternalStore } from "react";
import Input from "@/components/ui/input";
import { FormLayout, FormField } from "@/components/ui/form-layout";

function motorSpecColumnCount() {
  if (typeof window === "undefined") return 3;
  const w = window.innerWidth;
  if (w < 640) return 1;
  if (w < 1024) return 2;
  return 3;
}

function useMotorSpecColumns() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const m640 = window.matchMedia("(min-width: 640px)");
      const m1024 = window.matchMedia("(min-width: 1024px)");
      const fn = () => onStoreChange();
      m640.addEventListener("change", fn);
      m1024.addEventListener("change", fn);
      window.addEventListener("resize", fn);
      return () => {
        m640.removeEventListener("change", fn);
        m1024.removeEventListener("change", fn);
        window.removeEventListener("resize", fn);
      };
    },
    motorSpecColumnCount,
    () => 3
  );
}

export default function MotorSpecGrid({ fields, values, onChange, idPrefix = "motor" }) {
  const cols = useMotorSpecColumns();
  return (
    <FormLayout labelWidth="minmax(7.5rem, 10.5rem)" cols={cols} className="w-full min-w-0">
      {fields.map(({ key, label }) => {
        const fid = `${idPrefix}-${key}`;
        return (
          <FormField key={key} label={label} id={fid} name={key} labelAlign="right" classNameLabel="pr-2">
            <Input
              id={fid}
              name={key}
              value={values[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="min-w-0"
            />
          </FormField>
        );
      })}
    </FormLayout>
  );
}
