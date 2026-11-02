import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { computeListingDirectoryScore } from "@/lib/listing-directory-score";

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

export async function POST(request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
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
      isSeed: true,
    };
    const inserted = await Listing.insertMany(
      SEED_LISTINGS.map((s) => ({ ...base, ...s, address: `123 Industrial Blvd, ${s.city}, ${s.state} ${s.zipCode}` }))
    );
    if (inserted.length) {
      const ops = inserted.map((doc) => {
        const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
        return {
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: { directoryScore: computeListingDirectoryScore(plain) } },
          },
        };
      });
      await Listing.bulkWrite(ops, { ordered: false });
    }
    return NextResponse.json({ ok: true, count: inserted.length });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json(
      { error: err.message || "Seed failed" },
      { status: 500 }
    );
  }
}
