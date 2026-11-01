import { SEO_INDUSTRIAL_KEYWORD_CORE, SEO_INDUSTRIAL_MIN_HP } from "@/lib/seo-industrial-lead-framing";

export const NEAR_ME_PATH = "/electric-motor-repair-near-me";

export const NEAR_ME_KEYWORDS = [
  ...SEO_INDUSTRIAL_KEYWORD_CORE,
  "plant motor repair near me",
  "facility motor repair shop near me",
  "industrial AC motor rewinding near me",
  "industrial DC motor repair near me",
  "emergency industrial motor repair near me",
  "industrial motor rewind shop near me",
  "commercial motor repair near facility",
];

export const NEAR_ME_FAQS = [
  {
    question: "How do I find an industrial motor repair shop near my facility?",
    answer:
      `Use the 3PhaseFlow directory to browse industrial repair shops by state. Filter by motor type (AC, DC, servo, high-voltage) and service region. Submit a repair request for plant or facility motors typically ${SEO_INDUSTRIAL_MIN_HP} HP and above. Residential, pool, and spa motors are not matched through this network.`,
  },
  {
    question: "What information do I need before contacting an industrial motor repair shop?",
    answer:
      "Gather the motor nameplate data: manufacturer, model number, horsepower (HP), voltage, RPM, frame size, and enclosure type. Also note the plant application, failure symptoms, unusual noise, tripped overloads, vibration, or smoke. Photos of the nameplate and any visible damage speed up the quoting process significantly.",
  },
  {
    question: "How much does industrial electric motor repair cost?",
    answer:
      "Repair costs depend on motor size, failure type, and repair scope. A full rewind on a 50 HP industrial motor typically runs $1,500 to $4,000. Larger frames and medium-voltage work cost more. As a rule of thumb, if repair cost exceeds 50 to 65% of new motor replacement cost, replacement is worth evaluating. See the full cost guide for ranges by motor HP and repair type.",
  },
  {
    question: "What types of industrial electric motors can be repaired?",
    answer:
      "Most industrial repair shops handle AC induction motors (three-phase), DC motors, servo motors, high-voltage motors, and specialty wound equipment. This network focuses on industrial and commercial plant motors, not residential or pool/spa pumps. Confirm voltage and HP capability before shipping.",
  },
  {
    question: "How long does industrial electric motor repair take?",
    answer:
      "Standard repair turnaround is 5 to 10 business days for many motors under 200 HP. Large frame motors (above 200 HP), high-voltage rewinding, or jobs requiring custom parts can take 2 to 4 weeks. Emergency shops offer 24 to 72 hour turnaround at premium pricing. Always ask for a written timeline before authorizing work.",
  },
  {
    question: "What certifications should I look for in an industrial motor repair shop?",
    answer:
      "Look for EASA (Electrical Apparatus Service Association) accreditation; it means the shop follows EASA AR100 repair standards, which preserve motor efficiency and quality. ISO 9001 certification indicates documented quality management processes. NEMA, IEEE, and OSHA compliance are baseline requirements for industrial work.",
  },
  {
    question: "What is the difference between motor repair and motor rewinding?",
    answer:
      "Motor repair covers mechanical fixes: bearing replacement, shaft repair, coupling alignment, enclosure work, and electrical connection repairs. Motor rewinding replaces the copper winding inside the stator or armature, required when insulation has broken down due to heat, moisture, or electrical fault. A rewound motor, done to EASA AR100 standards, should perform at or above original nameplate efficiency.",
  },
  {
    question: "Do industrial motor repair shops offer pickup and delivery?",
    answer:
      "Many shops offer pickup and delivery within their service region, particularly for motors too large to ship safely. For out-of-area motors, freight shipping via flatbed or crated LTL is standard. Confirm pickup availability, insurance coverage during transport, and whether the shop provides packaging materials before arranging shipment.",
  },
];
