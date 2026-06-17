import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/admin";
import { mutate } from "@/lib/store";

export const dynamic = "force-dynamic";

type Action =
  | { action: "releaseSolo"; projectId: string }
  | { action: "deleteGroup"; groupId: string }
  | { action: "resetGroupProject"; groupId: string }
  | { action: "updateTicker"; items: string[] }
  | {
      action: "createAssignment";
      title: string;
      description: string;
      expectedFormat: string;
    }
  | {
      action: "updateAssignment";
      assignmentId: string;
      title: string;
      description: string;
      expectedFormat: string;
      isOpen: boolean;
    }
  | { action: "deleteAssignment"; assignmentId: string }
  | { action: "resetAll" };

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  let body: Action;
  try {
    body = (await req.json()) as Action;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    await mutate(async (data) => {
      switch (body.action) {
        case "releaseSolo":
          delete data.soloClaims[body.projectId];
          break;
        case "deleteGroup":
          data.groups = data.groups.filter((g) => g.id !== body.groupId);
          break;
        case "resetGroupProject": {
          const g = data.groups.find((x) => x.id === body.groupId);
          if (g) g.projectId = null;
          break;
        }
        case "updateTicker":
          data.uiSettings.boardTickerItems = body.items
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 12);
          break;
        case "createAssignment":
          data.assignments.unshift({
            id: `asg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            title: body.title.trim(),
            description: body.description.trim(),
            expectedFormat: body.expectedFormat.trim(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            isOpen: true,
          });
          break;
        case "updateAssignment": {
          const assignment = data.assignments.find((item) => item.id === body.assignmentId);
          if (assignment) {
            assignment.title = body.title.trim();
            assignment.description = body.description.trim();
            assignment.expectedFormat = body.expectedFormat.trim();
            assignment.isOpen = body.isOpen;
            assignment.updatedAt = Date.now();
          }
          break;
        }
        case "deleteAssignment":
          data.assignments = data.assignments.filter((item) => item.id !== body.assignmentId);
          data.submissions = data.submissions.filter(
            (item) => item.assignmentId !== body.assignmentId
          );
          break;
        case "resetAll":
          data.soloClaims = {};
          data.groups = [];
          data.notes = {};
          data.assignments = [];
          data.submissions = [];
          data.uiSettings.boardTickerItems = [];
          break;
      }
      return { data, result: null };
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
