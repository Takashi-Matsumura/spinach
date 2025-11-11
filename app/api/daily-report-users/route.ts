import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 全ユーザー取得
export async function GET() {
  try {
    const users = await prisma.dailyReportUser.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "ユーザーの取得に失敗しました" }, { status: 500 });
  }
}

// POST: 新規ユーザー作成
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, department } = body;

    if (!name || !department) {
      return NextResponse.json({ error: "社員名と部署名は必須です" }, { status: 400 });
    }

    const user = await prisma.dailyReportUser.create({
      data: {
        name,
        department,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "ユーザーの作成に失敗しました" }, { status: 500 });
  }
}
