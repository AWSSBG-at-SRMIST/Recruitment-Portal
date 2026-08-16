import { randomInt } from "crypto";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A login OTP is a security credential — Math.random() is a non-cryptographic
// PRNG and shouldn't be used to generate one, even with rate limiting and a
// short TTL as additional mitigations.
export function generateOTP(): string {
  return String(randomInt(100000, 1000000));
}
