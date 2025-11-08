import { type NextRequest, NextResponse } from "next/server";

const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = `${RAG_BACKEND_URL}/api/${pathString}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("RAG proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch from RAG backend" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = `${RAG_BACKEND_URL}/api/${pathString}`;

  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle file uploads (multipart/form-data)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    // Handle JSON requests
    const body = await request.json();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // For streaming responses
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("RAG proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch from RAG backend" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path.join("/");
  const url = `${RAG_BACKEND_URL}/api/${pathString}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("RAG proxy error:", error);
    return NextResponse.json({ error: "Failed to fetch from RAG backend" }, { status: 500 });
  }
}
