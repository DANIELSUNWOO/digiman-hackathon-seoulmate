// EAS standard build hook only. Do not print environment values or connect to services.
const net = require("node:net");

const blocked = new net.BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["192.0.2.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
])
  blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["2001:db8::", 32],
  ["::ffff:0:0", 96],
])
  blocked.addSubnet(network, prefix, "ipv6");

function publicHttps(value) {
  if (typeof value !== "string" || value !== value.trim() || !value)
    return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    return false;
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  const family = net.isIP(host);
  if (family) return !blocked.check(host, family === 4 ? "ipv4" : "ipv6");
  if (!host.includes(".")) return false;
  if (
    /(^|\.)(localhost|local|lan|internal|invalid|test|example)(\.|$)/.test(host)
  )
    return false;
  if (/(^|[.-])(your|sample|placeholder|replace|changeme)([.-]|$)/.test(host))
    return false;
  if (/(^|\.)example\.(com|org|net)$/.test(host)) return false;
  if (/[<>]|%3c|%3e/i.test(value)) return false;
  return true;
}

function publicSupabaseKey(value) {
  if (typeof value !== "string" || value !== value.trim()) return false;
  if (/placeholder|replace|example|sample|your[_-]/i.test(value)) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(value)) return true;
  const parts = value.split(".");
  if (
    parts.length !== 3 ||
    !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
  )
    return false;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    return payload && typeof payload === "object" && payload.role === "anon";
  } catch {
    return false;
  }
}

function validate(env) {
  if (!["preview", "production"].includes(env.EAS_BUILD_PROFILE)) return [];
  const errors = [];
  if (!publicHttps(env.EXPO_PUBLIC_API_BASE_URL))
    errors.push("EXPO_PUBLIC_API_BASE_URL must be a nonlocal HTTPS URL.");
  if (!publicHttps(env.EXPO_PUBLIC_SUPABASE_URL))
    errors.push("EXPO_PUBLIC_SUPABASE_URL must be a nonlocal HTTPS URL.");
  if (!publicSupabaseKey(env.EXPO_PUBLIC_SUPABASE_ANON_KEY))
    errors.push(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY must be a publishable or legacy anon key.",
    );
  return errors;
}

if (require.main === module) {
  const errors = validate(process.env);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else
    console.log(
      "Distribution environment format check passed or is not applicable to this profile.",
    );
}
module.exports = { publicHttps, publicSupabaseKey, validate };
