import type { Handler, HandlerEvent } from "@netlify/functions";
import { chooseJevShot, type JevShotRequest } from "../../lib/jev/shot";

declare const Netlify: {
  env: {
    get(key: string): string | undefined;
  };
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const body = JSON.parse(event.body ?? "{}") as JevShotRequest;

    if (!body.legalMoves?.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No legal moves provided" }),
      };
    }

    const apiKey = Netlify.env.get("SHIP_GAME_TYPESAFE_API_KEY");
    const response = await chooseJevShot(apiKey, body);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Jev shot failed";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message }),
    };
  }
};
