import type { Repo } from "./types";
import { localRepo } from "./local";
import { awsRepo } from "./aws";

// Flip STORAGE_BACKEND=aws once the AWS S3 bucket/IAM sign-off comes through
// (see plan) — lib/repo/aws.ts already implements the same Repo interface,
// so no other application code needs to change.
export const repo: Repo = process.env.STORAGE_BACKEND === "aws" ? awsRepo : localRepo;

export type { Repo, NewApplication, ApplicationFilter, OTPVerifyResult } from "./types";
