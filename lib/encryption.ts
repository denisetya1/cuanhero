import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const algorithm = "aes-256-gcm";
const prefix = "enc.v1";

const getEncryptionKey = () => {
  const secret =
    process.env.TRADING_ACCOUNT_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET ||
    "cuanhero-local-encryption-key";

  return createHash("sha256").update(secret).digest();
};

export const encryptText = (plainText: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    prefix,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
};

export const decryptText = (encryptedText: string) => {
  const [version, ivText, authTagText, encryptedPayload] =
    encryptedText.split(":");

  if (version !== prefix || !ivText || !authTagText || !encryptedPayload) {
    throw new Error("Invalid encrypted text format.");
  }

  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload, "base64url")),
    decipher.final(),
  ]).toString("utf8");
};
