import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 日報詳細取得
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const report = await prisma.dailyReport.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: "日報が見つかりません" }, { status: 404 });
    }

    // messagesとextractedDataをJSONパース
    return NextResponse.json({
      ...report,
      messages: JSON.parse(report.messages),
      extractedData: report.extractedData ? JSON.parse(report.extractedData) : null,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json({ error: "日報の取得に失敗しました" }, { status: 500 });
  }
}

// PUT: 日報更新
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userName, userDepartment, messages, extractedData } = body;

    // messagesとextractedDataをJSON文字列化
    const data: {
      userName?: string;
      userDepartment?: string;
      messages?: string;
      extractedData?: string | null;
    } = {};

    if (userName) data.userName = userName;
    if (userDepartment) data.userDepartment = userDepartment;
    if (messages) data.messages = JSON.stringify(messages);
    if (extractedData !== undefined) {
      data.extractedData = extractedData ? JSON.stringify(extractedData) : null;
    }

    const report = await prisma.dailyReport.update({
      where: { id },
      data,
    });

    // レスポンスでJSONパース
    return NextResponse.json({
      ...report,
      messages: JSON.parse(report.messages),
      extractedData: report.extractedData ? JSON.parse(report.extractedData) : null,
    });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "日報の更新に失敗しました" }, { status: 500 });
  }
}

// DELETE: 日報削除
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.dailyReport.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json({ error: "日報の削除に失敗しました" }, { status: 500 });
  }
}
