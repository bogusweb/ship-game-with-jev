import type { Handler } from "@netlify/functions";
import { sessionHandler } from "./jev-shot";

export const handler: Handler = sessionHandler;
