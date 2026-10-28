import { NextResponse } from "next/server";
import { fetchTrainingSources } from "@/lib/connectors/training";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await fetchTrainingSources());
}
