#!/usr/bin/env node
/**
 * Ensure platform Tenant row exists for cemotor (admin password-reset / open-shop).
 */
import { config } from "dotenv";
import { join } from "path";
import mongoose from "mongoose";
import { randomBytes } from "crypto";
import { repoRoot } from "./_paths.mjs";

config({ path: join(repoRoot, ".env") });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI required");
  process.exit(1);
}

const tenantSchema = new mongoose.Schema(
  {
    slug: String,
    host: String,
    companyName: String,
    ownerEmail: String,
    mongoDbName: String,
    codePath: String,
    status: String,
    platformTenantKeyHash: String,
    supportHandoffSecret: String,
    webhookUrl: String,
    dnsStatus: String,
    port: Number,
  },
  { timestamps: true }
);

const conn = await mongoose.createConnection(uri).asPromise();
const Tenant = conn.models.Tenant || conn.model("Tenant", tenantSchema);

const slug = "cemotor";
let row = await Tenant.findOne({ slug });
if (!row) {
  row = await Tenant.create({
    slug,
    host: "cemotor.3phaseflow.com",
    companyName: "Clearwater Electric Motor Repair LLC",
    ownerEmail: "cemotorrepair@gmail.com",
    mongoDbName: "3pf_cemotor",
    codePath: "clients/cemotor",
    status: "active",
    supportHandoffSecret: randomBytes(24).toString("base64url"),
    dnsStatus: "active",
    port: 5100,
  });
  console.log("Created Tenant", slug);
} else {
  const patch = {};
  if (!row.mongoDbName) patch.mongoDbName = "3pf_cemotor";
  if (!row.host) patch.host = "cemotor.3phaseflow.com";
  if (!row.ownerEmail) patch.ownerEmail = "cemotorrepair@gmail.com";
  if (!row.supportHandoffSecret) patch.supportHandoffSecret = randomBytes(24).toString("base64url");
  if (row.status !== "active") patch.status = "active";
  if (Object.keys(patch).length) {
    await Tenant.updateOne({ _id: row._id }, { $set: patch });
    console.log("Updated Tenant", slug, patch);
  } else {
    console.log("Tenant already OK", slug);
  }
}

const latest = await Tenant.findOne({ slug }).lean();
console.log({
  slug: latest.slug,
  host: latest.host,
  mongoDbName: latest.mongoDbName,
  ownerEmail: latest.ownerEmail,
  status: latest.status,
});
await conn.close();
