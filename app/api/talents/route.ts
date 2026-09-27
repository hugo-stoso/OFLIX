import { NextResponse } from "next/server";
import { listTalentInterests } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listTalentInterests());
}
