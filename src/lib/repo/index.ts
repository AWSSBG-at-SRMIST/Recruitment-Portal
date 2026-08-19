import type { Repo } from "./types";
import { awsRepo } from "./aws";

export const repo: Repo = awsRepo;

export type { Repo, NewApplication, ApplicationFilter, OTPVerifyResult } from "./types";
