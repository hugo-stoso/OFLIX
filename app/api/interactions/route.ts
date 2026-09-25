import { NextResponse } from "next/server";
import { z } from "zod";
import { createInteraction } from "@/lib/db";

const interactionSchema = z.object({
  actorProfileId: z.string().min(1),
  targetType: z.enum(["FORMAL", "SERVICE", "VOLUNTEER"]),
  targetId: z.string().min(1),
  action: z.enum(["APPLY", "CONTACT_REQUEST", "VOLUNTEER_INTEREST"]),
});

export async function POST(request: Request) {
  const parsed = interactionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados de interação inválidos." }, { status: 400 });
  const data = parsed.data;
  try {
    const result = createInteraction(data);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar a interação." }, { status: 500 });
  }
}
