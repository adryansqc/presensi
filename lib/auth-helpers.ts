import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { getRolePermissions } from "./permission-store";

export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}

export async function requireRole(allowedRoles: string[]) {
  const { error, session } = await requireAuth();

  if (error) return { error, session: null };

  const userRole = (session!.user as unknown as { role?: string }).role ?? "";
  if (!allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}

export async function requirePermission(permission: string) {
  const { error, session } = await requireAuth();

  if (error) return { error, session: null };

  const userRole = (session!.user as unknown as { role?: string }).role ?? "";
  const permissions = await getRolePermissions(userRole);

  if (!permissions.includes(permission)) {
    return {
      error: NextResponse.json(
        { error: "Anda tidak memiliki izin untuk tindakan ini." },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { error: null, session };
}
