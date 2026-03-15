import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { filterListingsByLocation } from "@/lib/location-filter";

export async function getPublicListings() {
  await connectDB();
  const list = await Listing.find({ status: "approved" })
    .sort({ companyName: 1 })
    .lean();
  return list.map((l) => ({
    ...l,
    id: l._id.toString(),
    _id: undefined,
  }));
}

export async function getListingsFilteredByLocation({ state, city, zip }) {
  const listings = await getPublicListings();
  return filterListingsByLocation(listings, { state, city, zip });
}

export async function getPublicListingById(id) {
  if (!id) return null;
  await connectDB();
  const doc = await Listing.findOne({ _id: id, status: "approved" }).lean();
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined,
  };
}
