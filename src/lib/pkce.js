import { randomBytes, createHash } from "crypto";

export const generateCodeVerifier = () => {
  return randomBytes(64).toString("hex");
};

export const generateCodeChallenge = (verifier) => {
  return createHash("sha256").update(verifier).digest("base64url");
};

export const generateState = () => {
  return randomBytes(64).toString("hex");
};