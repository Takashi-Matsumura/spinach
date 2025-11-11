import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT: ユーザー更新
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, department } = body;

    if (!name || !department) {
      return NextResponse.json({ error: "社員名と部署名は必須です" }, { status: 400 });
    }

    const user = await prisma.dailyReportUser.update({
      where: { id },
      data: {
        name,
        department,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "ユーザーの更新に失敗しました" }, { status: 500 });
  }
}

// DELETE: ユーザー削除
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.dailyReportUser.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "ユーザーの削除に失敗しました" }, { status: 500 });
  }
}
