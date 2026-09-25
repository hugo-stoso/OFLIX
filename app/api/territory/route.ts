import { NextResponse } from "next/server";
import { territoryData } from "@/lib/db";

export async function GET() {
  return NextResponse.json(territoryData());
}
