/**
 * House rule for the staff / trainee sheet:
 *   - 6 digit ID starting with 1  -> TRAINEE
 *   - 5 digit ID                  -> EMPLOYEE
 *   - 6 digit ID starting with 2  -> EMPLOYEE
 * Anything else falls back to employee, but `classifyId` reports it as unknown
 * so the UI can flag it.
 */
export type PersonKind = "employee" | "trainee";

export function normalizeId(value: string): string {
  return (value ?? "").replace(/[^0-9]/g, "");
}

export function classifyId(value: string): {
  kind: PersonKind;
  confident: boolean;
  reason: string;
} {
  const id = normalizeId(value);
  if (id.length === 6 && id.startsWith("1")) {
    return { kind: "trainee", confident: true, reason: "6 digits starting with 1 → trainee" };
  }
  if (id.length === 5) {
    return { kind: "employee", confident: true, reason: "5 digits → employee" };
  }
  if (id.length === 6 && id.startsWith("2")) {
    return { kind: "employee", confident: true, reason: "6 digits starting with 2 → employee" };
  }
  return {
    kind: "employee",
    confident: false,
    reason: id
      ? `${id.length} digit ID — outside the rule, saved as employee`
      : "No ID number given",
  };
}

export function kindOf(value: string): PersonKind {
  return classifyId(value).kind;
}
