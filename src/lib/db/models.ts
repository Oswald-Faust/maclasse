import mongoose, { Schema, type Model, type Types } from "mongoose";

/** Récupère un modèle déjà compilé ou le crée (hot-reload safe). */
function model<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);
}

/* ---------------- Types ---------------- */

export type Snippet = { id: string; label: string; language: string; code: string };
export type Member = { firstName: string; lastName: string };

export interface UserDoc {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: "student" | "teacher";
  classId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassRoomDoc {
  _id: Types.ObjectId;
  name: string;
  description: string;
  school: string;
  logo: string; // data URL (base64) ou URL d'image
  accessCode: string;
  teacherId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  content: string;
  snippets: Snippet[];
  createdAt: Date;
  updatedAt: Date;
}

export type WorkKind = "code" | "redaction" | "autre";

export interface AssignmentDoc {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  title: string;
  description: string;
  expectedFormat: string;
  kind: WorkKind;
  dueDate: number | null; // timestamp ms, ou null = pas de date limite
  isOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterrogationDoc {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  title: string;
  instructions: string;
  kind: WorkKind;
  durationMinutes: number;
  status: "draft" | "running" | "ended";
  startedAt: number | null;
  endsAt: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterroSubmissionDoc {
  _id: Types.ObjectId;
  interroId: Types.ObjectId;
  userId: Types.ObjectId;
  firstName: string;
  lastName: string;
  content: string;
  language: string;
  submittedAt: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionDoc {
  _id: Types.ObjectId;
  assignmentId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  content: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupDoc {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  name: string;
  members: Member[];
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoloClaimDoc {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  projectId: string;
  userId: Types.ObjectId | null;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingDoc {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  boardTickerItems: string[];
  teacherReminders: {
    id: string;
    text: string;
    dueAt: number | null;
    createdAt: number;
  }[];
}

export interface CourseSessionDoc {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  date: number; // timestamp ms du jour de cours
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CourseKind = "pdf" | "resume" | "lien";

export interface CourseDoc {
  _id: Types.ObjectId;
  classId: Types.ObjectId;
  sessionId: Types.ObjectId | null;
  title: string;
  kind: CourseKind;
  summary: string; // contenu texte (résumé)
  fileData: string; // data URL base64 (PDF)
  fileName: string;
  url: string; // lien externe éventuel
  createdAt: Date;
  updatedAt: Date;
}

/* ---------------- Schemas ---------------- */

const SnippetSchema = new Schema<Snippet>(
  {
    id: { type: String, required: true },
    label: { type: String, default: "Snippet" },
    language: { type: String, default: "txt" },
    code: { type: String, default: "" },
  },
  { _id: false }
);

const MemberSchema = new Schema<Member>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const UserSchema = new Schema<UserDoc>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher"], default: "student" },
    classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", default: null, index: true },
  },
  { timestamps: true }
);

const ClassRoomSchema = new Schema<ClassRoomDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    school: { type: String, default: "" },
    logo: { type: String, default: "" },
    accessCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

const NoteSchema = new Schema<NoteDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Nouvelle note" },
    content: { type: String, default: "" },
    snippets: { type: [SnippetSchema], default: [] },
  },
  { timestamps: true }
);

const AssignmentSchema = new Schema<AssignmentDoc>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    expectedFormat: { type: String, default: "" },
    kind: { type: String, enum: ["code", "redaction", "autre"], default: "code" },
    dueDate: { type: Number, default: null },
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const InterrogationSchema = new Schema<InterrogationDoc>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", required: true, index: true },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, default: "" },
    kind: { type: String, enum: ["code", "redaction", "autre"], default: "code" },
    durationMinutes: { type: Number, default: 30, min: 1, max: 600 },
    status: { type: String, enum: ["draft", "running", "ended"], default: "draft" },
    startedAt: { type: Number, default: null },
    endsAt: { type: Number, default: null },
  },
  { timestamps: true }
);

const InterroSubmissionSchema = new Schema<InterroSubmissionDoc>(
  {
    interroId: { type: Schema.Types.ObjectId, ref: "Interrogation", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    content: { type: String, default: "" },
    language: { type: String, default: "text" },
    submittedAt: { type: Number, default: null },
  },
  { timestamps: true }
);
InterroSubmissionSchema.index({ interroId: 1, userId: 1 }, { unique: true });

const SubmissionSchema = new Schema<SubmissionDoc>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    language: { type: String, default: "text" },
  },
  { timestamps: true }
);
SubmissionSchema.index({ assignmentId: 1, userId: 1 }, { unique: true });

const GroupSchema = new Schema<GroupDoc>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", required: true, index: true },
    name: { type: String, required: true, trim: true },
    members: { type: [MemberSchema], default: [] },
    projectId: { type: String, default: null },
  },
  { timestamps: true }
);
// Nom de groupe unique au sein d'une promo (insensible à la casse).
GroupSchema.index(
  { classId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
// Premier arrivé premier servi sur les projets de groupe, par promo.
GroupSchema.index(
  { classId: 1, projectId: 1 },
  { unique: true, partialFilterExpression: { projectId: { $type: "string" } } }
);

const SoloClaimSchema = new Schema<SoloClaimDoc>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", required: true, index: true },
    projectId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },
  { timestamps: true }
);
// Premier arrivé premier servi sur les projets perso, par promo.
SoloClaimSchema.index({ classId: 1, projectId: 1 }, { unique: true });

const SettingSchema = new Schema<SettingDoc>({
  classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", required: true, unique: true },
  boardTickerItems: { type: [String], default: [] },
  teacherReminders: {
    type: [
      new Schema(
        {
          id: { type: String, required: true },
          text: { type: String, required: true, trim: true },
          dueAt: { type: Number, default: null },
          createdAt: { type: Number, required: true },
        },
        { _id: false }
      ),
    ],
    default: [],
  },
});

const CourseSessionSchema = new Schema<CourseSessionDoc>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", required: true, index: true },
    date: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

const CourseSchema = new Schema<CourseDoc>(
  {
    classId: { type: Schema.Types.ObjectId, ref: "ClassRoom", required: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "CourseSession", default: null, index: true },
    title: { type: String, required: true, trim: true },
    kind: { type: String, enum: ["pdf", "resume", "lien"], default: "resume" },
    summary: { type: String, default: "" },
    fileData: { type: String, default: "" },
    fileName: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { timestamps: true }
);

/* ---------------- Models ---------------- */

export const User = model<UserDoc>("User", UserSchema);
export const ClassRoom = model<ClassRoomDoc>("ClassRoom", ClassRoomSchema);
export const Note = model<NoteDoc>("Note", NoteSchema);
export const Assignment = model<AssignmentDoc>("Assignment", AssignmentSchema);
export const Submission = model<SubmissionDoc>("Submission", SubmissionSchema);
export const Interrogation = model<InterrogationDoc>("Interrogation", InterrogationSchema);
export const InterroSubmission = model<InterroSubmissionDoc>(
  "InterroSubmission",
  InterroSubmissionSchema
);
export const CourseSession = model<CourseSessionDoc>("CourseSession", CourseSessionSchema);
export const Course = model<CourseDoc>("Course", CourseSchema);
export const Group = model<GroupDoc>("Group", GroupSchema);
export const SoloClaim = model<SoloClaimDoc>("SoloClaim", SoloClaimSchema);
export const Setting = model<SettingDoc>("Setting", SettingSchema);
