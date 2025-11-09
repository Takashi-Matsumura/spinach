import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: セッション詳細取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.chatSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    // messagesをJSONパース
    return NextResponse.json({
      ...session,
      messages: JSON.parse(session.messages),
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "セッションの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT: セッション更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, messages } = body;

    const data: {
      title?: string;
      messages?: string;
    } = {};

    if (title) data.title = title;
    if (messages) data.messages = JSON.stringify(messages);

    const session = await prisma.chatSession.update({
      where: { id },
      data,
    });

    // レスポンスでJSONパース
    return NextResponse.json({
      ...session,
      messages: JSON.parse(session.messages),
    });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "セッションの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE: セッション削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.chatSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "セッションの削除に失敗しました" },
      { status: 500 }
    );
  }
}
