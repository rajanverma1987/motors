export const TALENT_AVAILABILITY = ["available_now", "open", "not_looking"];

export const TALENT_AVAILABILITY_LABELS = {
  available_now: "Available now",
  open: "Open to opportunities",
  not_looking: "Not available for hire",
};

export const TALENT_AVAILABILITY_HELP = {
  available_now: "Shops see you as ready to start. You still get job alerts if enabled.",
  open: "You are open to the right role. Job alerts stay on if enabled.",
  not_looking: "You can keep editing your profile, but you will not get job alerts. Your public page shows Not available for hire.",
};

export const TALENT_STATUS = ["active", "paused", "banned"];

export const TALENT_SKILLS = [
  { value: "motor_rewind", label: "Motor rewind" },
  { value: "machining", label: "Machining" },
  { value: "field_service", label: "Field service" },
  { value: "electrical", label: "Electrical" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "balancing", label: "Balancing" },
  { value: "welding", label: "Welding" },
  { value: "sales", label: "Sales" },
  { value: "logistics", label: "Logistics" },
  { value: "shop_management", label: "Shop management" },
  { value: "qc_inspection", label: "QC / inspection" },
  { value: "vfd_controls", label: "VFD / controls" },
];

export const TALENT_ROLES = [
  { value: "winder", label: "Winder" },
  { value: "technician", label: "Technician" },
  { value: "machinist", label: "Machinist" },
  { value: "field_tech", label: "Field technician" },
  { value: "apprentice", label: "Apprentice" },
  { value: "supervisor", label: "Supervisor" },
  { value: "sales", label: "Sales" },
  { value: "office", label: "Office / admin" },
];

export const TALENT_EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
];

export const TALENT_EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

/** US state abbreviations used for location matching and preferred areas. */
export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

export const TALENT_COOKIE = "talent_session";
export const TALENT_JWT_TYP = "motors_talent";
export const TALENT_VERIFY_PURPOSE = "talent";
export const TALENT_ALERT_BATCH_CAP = 500;
