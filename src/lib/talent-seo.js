import {
  TALENT_AVAILABILITY_LABELS,
  TALENT_ROLES,
  TALENT_SKILLS,
} from "@/lib/talent-constants";

const SKILL_LABEL = Object.fromEntries(TALENT_SKILLS.map((s) => [s.value, s.label]));
const ROLE_LABEL = Object.fromEntries(TALENT_ROLES.map((s) => [s.value, s.label]));

export function talentSkillLabel(value) {
  return SKILL_LABEL[value] || value;
}

export function talentRoleLabel(value) {
  return ROLE_LABEL[value] || value;
}

export function talentAvailabilityLabel(value) {
  return TALENT_AVAILABILITY_LABELS[value] || value || "Open to opportunities";
}

export function buildTalentMetaDescription(profile) {
  const name = profile.fullName || "Motor shop professional";
  const loc = [profile.city, profile.state].filter(Boolean).join(", ");
  const avail = talentAvailabilityLabel(profile.availability);
  const skills = (profile.skills || []).slice(0, 3).map(talentSkillLabel).join(", ");
  let out = `${name}${loc ? ` in ${loc}` : ""}. ${avail}.`;
  if (skills) out += ` Skills: ${skills}.`;
  out += " Free talent profile on IQMotorBase.";
  if (out.length <= 160) return out;
  return `${out.slice(0, 157).trim()}...`;
}

export function buildTalentPersonJsonLd(profile, canonicalUrl) {
  const skills = (profile.skills || []).map(talentSkillLabel);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.fullName || undefined,
    description: profile.headline || profile.bio || undefined,
    url: canonicalUrl,
    jobTitle: profile.headline || (profile.roles || []).map(talentRoleLabel).join(", ") || undefined,
    address:
      profile.city || profile.state
        ? {
            "@type": "PostalAddress",
            addressLocality: profile.city || undefined,
            addressRegion: profile.state || undefined,
            addressCountry: "US",
          }
        : undefined,
    knowsAbout: skills.length ? skills : undefined,
  };
}
