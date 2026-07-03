export function stripEnvQuotes(value?: string) {
  const trimmed = value?.trim() || "";

  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];

    if ((first === `"` && last === `"`) || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim();
    }
  }

  return trimmed;
}

export function getEnv(name: string, fallback = "") {
  const value = stripEnvQuotes(process.env[name]);
  return value || fallback;
}
