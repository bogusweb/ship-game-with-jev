import { chooseJevShot, type JevShotRequest } from "@/lib/jev/shot";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JevShotRequest;

    if (!body.legalMoves?.length) {
      return NextResponse.json(
        { error: "No legal moves provided" },
        { status: 400 },
      );
    }

    const apiKey = process.env.SHIP_GAME_TYPESAFE_API_KEY;
    const response = await chooseJevShot(apiKey, body);

    return NextResponse.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Jev shot failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
