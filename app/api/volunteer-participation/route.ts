import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createVolunteerParticipation, listVolunteerParticipations, updateVolunteerParticipation } from "@/lib/db";

const createSchema = z.object({ opportunityId: z.string().min(1), personProfileId: z.string().min(1) });
const updateSchema = z.object({ participationId: z.string().min(1), organizerProfileId: z.string().min(1), action: z.enum(["confirm", "participate"]) });

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 401 });
  return NextResponse.json(listVolunteerParticipations(profileId));
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados da participação inválidos." }, { status: 400 });
  try {
    const result = createVolunteerParticipation(parsed.data);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "opportunity_not_found" ? 404 : 400 });
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch { return NextResponse.json({ error: "Não foi possível registrar o interesse." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados da atualização inválidos." }, { status: 400 });
  const result = updateVolunteerParticipation(parsed.data);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "participation_not_owned" ? 403 : 400 });
  return NextResponse.json(result);
}
