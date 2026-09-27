import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceCall, listServiceCalls } from "@/lib/db";

const createSchema = z.object({
  requesterProfileId: z.string().min(1),
  activity: z.string().min(1),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1000),
  serviceDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeWindow: z.string().min(1).max(80),
});

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 401 });
  const activities = (request.nextUrl.searchParams.get("activities") ?? "").split(",").map((activity) => activity.trim()).filter(Boolean);
  return NextResponse.json(listServiceCalls(profileId, activities, today()));
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados do chamado inválidos." }, { status: 400 });
  try {
    const result = createServiceCall(parsed.data);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.call, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível abrir o chamado." }, { status: 500 });
  }
}
