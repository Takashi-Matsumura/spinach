import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: 日報取得（オプションでuserIdとreportDateでフィルタ）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const reportDate = searchParams.get("reportDate");

    const where: {
      userId?: string;
      reportDate?: string;
    } = {};

    if (userId) where.userId = userId;
    if (reportDate) where.reportDate = reportDate;

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: {
        reportDate: "desc",
      },
    });

    // messagesとextractedDataをJSONパース
    const parsedReports = reports.map((report) => ({
      ...report,
      messages: JSON.parse(report.messages),
      extractedData: report.extractedData ? JSON.parse(report.extractedData) : null,
    }));

    return NextResponse.json(parsedReports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "日報の取得に失敗しました" }, { status: 500 });
  }
}

// POST: 日報作成または更新（upsert）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userName, userDepartment, reportDate, messages, extractedData } = body;

    if (!userId || !userName || !userDepartment || !reportDate || !messages) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    // messagesとextractedDataをJSON文字列化
    const messagesJson = JSON.stringify(messages);
    const extractedDataJson = extractedData ? JSON.stringify(extractedData) : null;

    const report = await prisma.dailyReport.upsert({
      where: {
        userId_reportDate: {
          userId,
          reportDate,
        },
      },
      update: {
        userName,
        userDepartment,
        messages: messagesJson,
        extractedData: extractedDataJson,
      },
      create: {
        userId,
        userName,
        userDepartment,
        reportDate,
        messages: messagesJson,
        extractedData: extractedDataJson,
      },
    });

    // レスポンスでJSONパース
    return NextResponse.json(
      {
        ...report,
        messages: JSON.parse(report.messages),
        extractedData: report.extractedData ? JSON.parse(report.extractedData) : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating/updating report:", error);
    return NextResponse.json({ error: "日報の作成/更新に失敗しました" }, { status: 500 });
  }
}
