import { NextResponse } from "next/server";
import { listProfiles } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listProfiles());
}
