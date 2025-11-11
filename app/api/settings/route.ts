import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 全設定取得
export async function GET() {
  try {
    const settings = await prisma.settings.findMany({
      orderBy: {
        key: "asc",
      },
    });

    // key-valueオブジェクトに変換
    const settingsObj = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>
    );

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 });
  }
}

// PUT: 設定更新（複数のkey-valueを一括更新）
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    // bodyはkey-valueオブジェクト形式を想定
    const updates = Object.entries(body).map(([key, value]) => {
      return prisma.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 });
  }
}
