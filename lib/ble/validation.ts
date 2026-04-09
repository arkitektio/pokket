import { z } from "zod";

// ---------- Device Manifest Schema ----------

export const DeviceRequirementSchema = z.object({
  key: z.string().min(1, "Requirement key must not be empty"),
  service: z.string().min(1, "Requirement service must not be empty"),
  description: z.string(),
  optional: z.boolean(),
});

export const DeviceManifestSchema = z.object({
  identifier: z
    .string()
    .min(1, "Manifest identifier must not be empty")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Manifest identifier must only contain alphanumeric characters, dots, hyphens, and underscores",
    ),
  version: z
    .string()
    .min(1, "Manifest version must not be empty")
    .regex(
      /^\d+\.\d+\.\d+/,
      "Manifest version must follow semver (e.g. 1.0.0)",
    ),
  scopes: z.array(z.string()).optional(),
  logo: z.string().url("Manifest logo must be a valid URL").optional(),
  device_id: z.string().min(1, "Manifest device_id must not be empty"),
  requirements: z.array(DeviceRequirementSchema),
});

export type ValidatedDeviceManifest = z.infer<typeof DeviceManifestSchema>;

// ---------- WiFi Profile Validation ----------

const BaseWifiFields = z.object({
  ssid: z
    .string()
    .min(1, "SSID must not be empty")
    .max(32, "SSID must not exceed 32 characters"),
});

export const StandardWifiProfileSchema = BaseWifiFields.extend({
  type: z.literal("standard"),
  password: z
    .string()
    .min(8, "WPA password must be at least 8 characters")
    .max(63, "WPA password must not exceed 63 characters"),
});

export const EduroamWifiProfileSchema = BaseWifiFields.extend({
  type: z.literal("eduroam"),
  password: z.string().min(1, "Eduroam password must not be empty"),
  identity: z
    .string()
    .min(1, "Eduroam identity must not be empty")
    .regex(
      /^[^@]+@[^@]+\.[^@]+$/,
      "Eduroam identity must be a valid user@domain format",
    ),
  anonymousIdentity: z.string().optional(),
  pemCertificate: z
    .string()
    .min(1, "PEM certificate must not be empty")
    .refine(
      (pem) =>
        pem.includes("-----BEGIN CERTIFICATE-----") &&
        pem.includes("-----END CERTIFICATE-----"),
      "PEM certificate must contain valid BEGIN/END CERTIFICATE markers",
    ),
  universityId: z.string().optional(),
  universityName: z.string().optional(),
  universityCountry: z.string().optional(),
});

export const WifiProfileSchema = z.discriminatedUnion("type", [
  StandardWifiProfileSchema,
  EduroamWifiProfileSchema,
]);

export type ValidatedWifiProfile = z.infer<typeof WifiProfileSchema>;

// ---------- Provisioning Config Validation ----------

export const ProvisioningConfigSchema = z
  .object({
    ssid: z
      .string()
      .min(1, "SSID must not be empty")
      .max(32, "SSID must not exceed 32 characters"),
    password: z.string().min(1, "Password must not be empty"),
    identity: z.string().optional(),
    anonymousIdentity: z.string().optional(),
    pemCertificate: z.string().optional(),
    arkitektToken: z.string().optional(),
    displayName: z.string().optional(),
    baseUrl: z.string().url("Base URL must be a valid URL").optional(),
  })
  .refine(
    (config) => {
      // If identity is set (Eduroam), pemCertificate must also be set
      if (config.identity && !config.pemCertificate) {
        return false;
      }
      return true;
    },
    {
      message:
        "Eduroam configuration requires a PEM certificate when identity is provided",
    },
  );

export type ValidatedProvisioningConfig = z.infer<
  typeof ProvisioningConfigSchema
>;

// ---------- Validation helpers ----------

export class ManifestValidationError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = "ManifestValidationError";
  }
}

export class WifiProfileValidationError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = "WifiProfileValidationError";
  }
}

export class ProvisioningConfigValidationError extends Error {
  constructor(
    message: string,
    public issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = "ProvisioningConfigValidationError";
  }
}

/**
 * Validate a raw manifest object from BLE.
 * Throws ManifestValidationError if the manifest does not match the expected schema.
 */
export function validateManifest(raw: unknown): ValidatedDeviceManifest {
  const result = DeviceManifestSchema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ManifestValidationError(
      `Invalid device manifest: ${messages}`,
      result.error.issues,
    );
  }
  return result.data;
}

/**
 * Validate a WiFi profile before provisioning.
 * Ensures standard profiles have SSID+password, eduroam profiles have
 * identity+pemCertificate in addition.
 * Throws WifiProfileValidationError on failure.
 */
export function validateWifiProfile(profile: unknown): ValidatedWifiProfile {
  const result = WifiProfileSchema.safeParse(profile);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new WifiProfileValidationError(
      `Invalid Wi-Fi profile: ${messages}`,
      result.error.issues,
    );
  }
  return result.data;
}

/**
 * Validate the full provisioning config before sending to device.
 * Throws ProvisioningConfigValidationError on failure.
 */
export function validateProvisioningConfig(
  config: unknown,
): ValidatedProvisioningConfig {
  const result = ProvisioningConfigSchema.safeParse(config);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new ProvisioningConfigValidationError(
      `Invalid provisioning config: ${messages}`,
      result.error.issues,
    );
  }
  return result.data;
}
