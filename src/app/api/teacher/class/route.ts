import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/connect";
import { ClassRoom, User } from "@/lib/db/models";
import { getStudentFromRequest } from "@/lib/auth-server";
import { genUniqueAccessCode } from "@/lib/class-helpers";

export const dynamic = "force-dynamic";

function classOut(c: {
  _id: { toString(): string };
  name: string;
  description: string;
  school: string;
  logo: string;
  accessCode: string;
  createdAt?: Date;
}) {
  return {
    id: c._id.toString(),
    name: c.name,
    description: c.description,
    school: c.school,
    logo: c.logo,
    accessCode: c.accessCode,
    createdAt: c.createdAt?.getTime?.() ?? Date.now(),
  };
}

export async function GET(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || me.role !== "teacher") {
    return NextResponse.json({ error: "Accès enseignant requis." }, { status: 403 });
  }
  await connectDB();
  const classes = await ClassRoom.find({ teacherId: me.id }).sort({ createdAt: -1 }).lean();
  const withCounts = await Promise.all(
    classes.map(async (c) => ({
      ...classOut(c),
      studentCount: await User.countDocuments({ classId: c._id, role: "student" }),
    }))
  );
  return NextResponse.json({ ok: true, classes: withCounts });
}

export async function POST(req: NextRequest) {
  const me = await getStudentFromRequest(req);
  if (!me || me.role !== "teacher") {
    return NextResponse.json({ error: "Accès enseignant requis." }, { status: 403 });
  }

  let body: { name?: string; description?: string; school?: string; logo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Donne un nom à ta promo." }, { status: 400 });
  }
  // Logo : on borne la taille du data URL pour éviter de gonfler la base.
  const logo = (body.logo ?? "").slice(0, 600000);

  try {
    await connectDB();
    const accessCode = await genUniqueAccessCode();
    const created = await ClassRoom.create({
      name,
      description: (body.description ?? "").trim(),
      school: (body.school ?? "").trim(),
      logo,
      accessCode,
      teacherId: me.id,
    });
    return NextResponse.json({ ok: true, class: classOut(created) });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
