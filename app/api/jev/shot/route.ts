import {
  chooseJevShot,
  choosePlayerNextShot,
  type JevShotRequest,
} from "@/lib/jev/shot";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JevShotRequest;
    const wantsShot = Boolean(body.legalMoves?.length);
    const wantsPrediction = Boolean(body.playerLegalTargets?.length);

    if (!wantsShot && !wantsPrediction) {
      return NextResponse.json(
        { error: "No legal moves provided" },
        { status: 400 },
      );
    }

    const apiKey = process.env.SHIP_GAME_TYPESAFE_API_KEY;
    if (wantsShot) {
      const response = await chooseJevShot(apiKey, body);
      return NextResponse.json(response);
    }

    const response = await choosePlayerNextShot(apiKey, body);
    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Jev shot failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
