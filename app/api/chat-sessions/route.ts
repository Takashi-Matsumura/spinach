import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// GET: 全セッション取得
export async function GET() {
  try {
    const sessions = await prisma.chatSession.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    // messagesをJSONパース
    const parsedSessions = sessions.map((session: typeof sessions[number]) => ({
      ...session,
      messages: JSON.parse(session.messages),
    }));

    return NextResponse.json(parsedSessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "セッションの取得に失敗しました" }, { status: 500 });
  }
}

// POST: セッション作成または更新（upsert）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, messages } = body;

    if (!title || !messages) {
      return NextResponse.json({ error: "タイトルとメッセージは必須です" }, { status: 400 });
    }

    // messagesをJSON文字列化
    const messagesJson = JSON.stringify(messages);

    // idが指定されている場合はupsert、なければ新規作成
    const session = id
      ? await prisma.chatSession.upsert({
          where: { id },
          update: {
            title,
            messages: messagesJson,
          },
          create: {
            id,
            title,
            messages: messagesJson,
          },
        })
      : await prisma.chatSession.create({
          data: {
            title,
            messages: messagesJson,
          },
        });

    // レスポンスでJSONパース
    return NextResponse.json(
      {
        ...session,
        messages: JSON.parse(session.messages),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating/updating session:", error);
    return NextResponse.json({ error: "セッションの作成/更新に失敗しました" }, { status: 500 });
  }
}
