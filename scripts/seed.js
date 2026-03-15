const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Load .env or .env.local
function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(__dirname, "..", name);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
      break;
    }
  }
}
loadEnv();

const SEED_LISTINGS = [
  { companyName: "Houston Motor Rewind Co", city: "Houston", state: "Texas", zipCode: "77001", email: "contact@houstonmotorrewind.com", phone: "713-555-0101", serviceZipCode: "77001", statesServed: "Texas", areaCoveredFrom: "Greater Houston, Gulf Coast" },
  { companyName: "Dallas Electric Motor Repair", city: "Dallas", state: "Texas", zipCode: "75201", email: "info@dallasmotorrepair.com", phone: "214-555-0102", serviceZipCode: "75201", statesServed: "Texas, Oklahoma", areaCoveredFrom: "DFW metro, North Texas" },
  { companyName: "Phoenix Industrial Motors", city: "Phoenix", state: "Arizona", zipCode: "85001", email: "service@phoenixindustrial.com", phone: "602-555-0103", serviceZipCode: "85001", statesServed: "Arizona", areaCoveredFrom: "Phoenix metro, 50 mile radius" },
  { companyName: "Denver Mountain Electric", city: "Denver", state: "Colorado", zipCode: "80201", email: "repair@denvermountain.com", phone: "303-555-0104", serviceZipCode: "80201", statesServed: "Colorado, Wyoming", areaCoveredFrom: "Front Range, mining regions" },
  { companyName: "Chicago Great Lakes Motor", city: "Chicago", state: "Illinois", zipCode: "60601", email: "orders@chicagomotors.com", phone: "312-555-0105", serviceZipCode: "60601", statesServed: "Illinois, Indiana, Wisconsin", areaCoveredFrom: "Chicagoland, 75 mile radius" },
  { companyName: "Detroit Motor Works", city: "Detroit", state: "Michigan", zipCode: "48201", email: "info@detroitmotorworks.com", phone: "313-555-0106", serviceZipCode: "48201", statesServed: "Michigan, Ohio", areaCoveredFrom: "Southeast Michigan, Toledo" },
  { companyName: "Atlanta Southeast Rewinding", city: "Atlanta", state: "Georgia", zipCode: "30301", email: "contact@atlantarewind.com", phone: "404-555-0107", serviceZipCode: "30301", statesServed: "Georgia, South Carolina, Alabama", areaCoveredFrom: "Metro Atlanta, North Georgia" },
  { companyName: "Miami Gulf Electric Motors", city: "Miami", state: "Florida", zipCode: "33101", email: "service@miamigulfmotors.com", phone: "305-555-0108", serviceZipCode: "33101", statesServed: "Florida", areaCoveredFrom: "South Florida, Keys" },
  { companyName: "Seattle Pacific Motor Co", city: "Seattle", state: "Washington", zipCode: "98101", email: "repair@seattlepacific.com", phone: "206-555-0109", serviceZipCode: "98101", statesServed: "Washington, Oregon", areaCoveredFrom: "Puget Sound, Pacific Northwest" },
  { companyName: "LA Basin Motor Repair", city: "Los Angeles", state: "California", zipCode: "90001", email: "info@labasinmotors.com", phone: "213-555-0110", serviceZipCode: "90001", statesServed: "California", areaCoveredFrom: "LA metro, Inland Empire" },
  { companyName: "San Francisco Bay Electric", city: "San Francisco", state: "California", zipCode: "94102", email: "contact@sfbayelectric.com", phone: "415-555-0111", serviceZipCode: "94102", statesServed: "California", areaCoveredFrom: "Bay Area, 60 mile radius" },
  { companyName: "Philadelphia Keystone Motors", city: "Philadelphia", state: "Pennsylvania", zipCode: "19101", email: "orders@keystonemotors.com", phone: "215-555-0112", serviceZipCode: "19101", statesServed: "Pennsylvania, New Jersey, Delaware", areaCoveredFrom: "Greater Philadelphia" },
  { companyName: "Boston New England Motor", city: "Boston", state: "Massachusetts", zipCode: "02101", email: "service@bostonnemotor.com", phone: "617-555-0113", serviceZipCode: "02101", statesServed: "Massachusetts, Rhode Island", areaCoveredFrom: "Greater Boston, 50 mile radius" },
  { companyName: "Minneapolis North Star Electric", city: "Minneapolis", state: "Minnesota", zipCode: "55401", email: "repair@northstarelectric.com", phone: "612-555-0114", serviceZipCode: "55401", statesServed: "Minnesota, Wisconsin", areaCoveredFrom: "Twin Cities metro" },
  { companyName: "Nashville Tennessee Valley Motors", city: "Nashville", state: "Tennessee", zipCode: "37201", email: "info@tnvalleymotors.com", phone: "615-555-0115", serviceZipCode: "37201", statesServed: "Tennessee, Kentucky", areaCoveredFrom: "Middle Tennessee, 75 mile radius" },
  { companyName: "New Orleans Delta Motor Co", city: "New Orleans", state: "Louisiana", zipCode: "70112", email: "contact@deltamotor.com", phone: "504-555-0116", serviceZipCode: "70112", statesServed: "Louisiana, Mississippi", areaCoveredFrom: "Gulf Coast, Baton Rouge" },
  { companyName: "Baltimore Chesapeake Electric", city: "Baltimore", state: "Maryland", zipCode: "21201", email: "service@chesapeakeelectric.com", phone: "410-555-0117", serviceZipCode: "21201", statesServed: "Maryland, DC, Virginia", areaCoveredFrom: "Baltimore–Washington corridor" },
  { companyName: "Las Vegas Desert Motor Repair", city: "Las Vegas", state: "Nevada", zipCode: "89101", email: "repair@vegasdesertmotor.com", phone: "702-555-0118", serviceZipCode: "89101", statesServed: "Nevada, Arizona", areaCoveredFrom: "Las Vegas valley, Southern Nevada" },
  { companyName: "Salt Lake City Wasatch Motors", city: "Salt Lake City", state: "Utah", zipCode: "84101", email: "info@wasatchmotors.com", phone: "801-555-0119", serviceZipCode: "84101", statesServed: "Utah, Idaho", areaCoveredFrom: "Wasatch Front, mining regions" },
  { companyName: "Charlotte Queen City Electric", city: "Charlotte", state: "North Carolina", zipCode: "28201", email: "orders@queencityelectric.com", phone: "704-555-0120", serviceZipCode: "28201", statesServed: "North Carolina, South Carolina", areaCoveredFrom: "Charlotte metro, Piedmont" },
];

const listingSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    companyName: { type: String, required: true },
    logoUrl: { type: String, default: "" },
    shortDescription: { type: String, default: "" },
    yearsInBusiness: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    primaryContactPerson: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    country: { type: String, default: "United States" },
    services: [{ type: String }],
    maxMotorSizeHP: { type: String, default: "" },
    maxVoltage: { type: String, default: "" },
    maxWeightHandled: { type: String, default: "" },
    motorCapabilities: [{ type: String }],
    equipmentTesting: [{ type: String }],
    rewindingCapabilities: [{ type: String }],
    industriesServed: [{ type: String }],
    pickupDeliveryAvailable: { type: Boolean, default: false },
    craneCapacity: { type: String, default: "" },
    forkliftCapacity: { type: String, default: "" },
    rushRepairAvailable: { type: Boolean, default: false },
    turnaroundTime: { type: String, default: "" },
    certifications: [{ type: String }],
    shopSizeSqft: { type: String, default: "" },
    numTechnicians: { type: String, default: "" },
    numEngineers: { type: String, default: "" },
    yearsCombinedExperience: { type: String, default: "" },
    galleryPhotoUrls: [{ type: String }],
    serviceZipCode: { type: String, default: "" },
    serviceRadiusMiles: { type: String, default: "" },
    statesServed: { type: String, default: "" },
    citiesOrMetrosServed: { type: String, default: "" },
    areaCoveredFrom: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

const Listing = mongoose.models.Listing || mongoose.model("Listing", listingSchema);

const reviewSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    authorName: { type: String, required: true, trim: true },
    authorEmail: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true, trim: true },
    status: { type: String, enum: ["approved", "pending"], default: "approved" },
    ipHash: { type: String, default: "" },
  },
  { timestamps: true }
);

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

const SEED_REVIEWS = [
  { authorName: "James Wilson", authorEmail: "j.wilson@industrial.com", rating: 5, body: "We had an urgent motor failure and Atlanta Southeast had us back up in three days. Professional, clear communication, and the rewind quality was excellent. Will use again." },
  { authorName: "Maria Santos", authorEmail: "msantos@plantops.com", rating: 5, body: "Full-service motor repair and rewinding. They picked up from our facility and delivered when ready. Very satisfied with the work and turnaround time." },
  { authorName: "Robert Chen", authorEmail: "r.chen@mfgco.com", rating: 4, body: "Good experience overall. Solid work on our AC motors. Only minor delay on one job but they kept us updated. Would recommend." },
  { authorName: "Lisa Park", authorEmail: "lpark@watertreatment.org", rating: 5, body: "EASA member and it shows. Our pumps were repaired to spec and tested. Professional team and fair pricing." },
  { authorName: "David Miller", authorEmail: "dmiller@mining-equip.com", rating: 4, body: "Used them for medium-voltage motor repair. Knowledgeable and reliable. Metro Atlanta and North Georgia coverage was convenient for us." },
];

const base = {
  shortDescription: "Full-service motor repair and rewinding.",
  yearsInBusiness: "15",
  country: "United States",
  services: ["acMotorRepair", "motorRewinding", "pumpRepair"],
  motorCapabilities: ["lowVoltage", "mediumVoltage"],
  equipmentTesting: ["surge", "vibration"],
  rewindingCapabilities: ["acMotorRewinding", "dcArmatureRewinding"],
  industriesServed: ["manufacturing", "oilGas"],
  pickupDeliveryAvailable: true,
  rushRepairAvailable: true,
  certifications: ["easaMember"],
  shopSizeSqft: "12000",
  numTechnicians: "8",
  numEngineers: "2",
  yearsCombinedExperience: "85",
  status: "approved",
};

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in .env or .env.local");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const docs = SEED_LISTINGS.map((s) => ({
    ...base,
    ...s,
    address: `123 Industrial Blvd, ${s.city}, ${s.state} ${s.zipCode}`,
  }));
  const inserted = await Listing.insertMany(docs);
  console.log("Seeded", inserted.length, "repair shops.");

  const atlanta = await Listing.findOne({ companyName: "Atlanta Southeast Rewinding", status: "approved" });
  if (atlanta) {
    await Review.deleteMany({ listingId: atlanta._id });
    const reviewDocs = SEED_REVIEWS.map((r) => ({ ...r, listingId: atlanta._id }));
    await Review.insertMany(reviewDocs);
    console.log("Seeded", reviewDocs.length, "reviews for Atlanta Southeast Rewinding.");
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
