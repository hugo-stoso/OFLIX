import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db";

export async function GET() {
  const opportunities = listOpportunities();
  return NextResponse.json({ formal: opportunities.formal, services: opportunities.service, volunteer: opportunities.volunteer });
}
