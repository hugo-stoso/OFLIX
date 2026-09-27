import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptServiceCall } from "@/lib/db";

const acceptSchema = z.object({ workerProfileId: z.string().min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const parsed = acceptSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Perfil do autônomo inválido." }, { status: 400 });
  try {
    const { id } = await context.params;
    const result = acceptServiceCall({ callId: id, workerProfileId: parsed.data.workerProfileId });
    if (result.accepted) return NextResponse.json(result);
    return NextResponse.json(result, { status: result.reason === "not_found" ? 404 : result.reason === "worker_required" ? 403 : 409 });
  } catch {
    return NextResponse.json({ error: "Não foi possível aceitar o chamado." }, { status: 500 });
  }
}
