import { NextResponse } from "next/server";
import { z } from "zod";
import { compensationKindForEmploymentType, validateCompensation } from "@/lib/compensation";
import { createOpportunity, listOpportunities } from "@/lib/db";

const createSchema = z.object({
  ownerProfileId: z.string().min(1),
  kind: z.enum(["formal", "service", "volunteer"]),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  category: z.string().min(1).max(80),
  employmentType: z.enum(["CLT", "INTERNSHIP"]).optional(),
  requiredActivities: z.array(z.string()).max(10).optional(),
  schedule: z.string().max(120).optional(),
  eventDate: z.string().optional(),
  requirements: z.string().max(500).optional(),
  desiredVolunteers: z.number().int().positive().max(1000).optional(),
  institutionalGuidance: z.string().max(700).optional(),
  compensation: z.object({ min: z.union([z.string(), z.number()]).optional(), max: z.union([z.string(), z.number()]).optional() }).optional(),
});

export async function GET() {
  const opportunities = listOpportunities();
  return NextResponse.json({ formal: opportunities.formal, services: opportunities.service, volunteer: opportunities.volunteer });
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados da oportunidade inválidos." }, { status: 400 });
  try {
    const input = parsed.data;
    const employmentType = input.kind === "formal" ? input.employmentType ?? "CLT" : undefined;
    const compensationResult = input.kind === "formal" && input.compensation ? validateCompensation({ ...input.compensation, kind: compensationKindForEmploymentType(employmentType ?? "CLT") }) : { compensation: undefined };
    if (compensationResult.error) return NextResponse.json({ error: compensationResult.error }, { status: 400 });
    const result = createOpportunity({ ...input, employmentType, compensation: compensationResult.compensation });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.error === "owner_not_found" ? 404 : 403 });
    return NextResponse.json(result.opportunity, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível publicar a oportunidade." }, { status: 500 });
  }
}
