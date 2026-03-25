import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, action } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    let systemPrompt: string;
    let userPrompt: string;

    switch (action) {
      case "structure":
        systemPrompt = `You are an expert note organizer. Analyze the given note content and structure it.

Respond with a JSON object in this exact format:
{
  "summary": "A 1-2 sentence summary of the note",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedTitle": "A clear, descriptive title",
  "category": "work" | "personal" | "learning" | "ideas" | "other"
}`;
        userPrompt = `Analyze and structure this note:\n\n${content}`;
        break;

      case "summarize":
        systemPrompt = `You are an expert at summarizing content. Create a clear, concise summary.

Respond with a JSON object:
{
  "summary": "A concise summary (2-3 sentences max)",
  "mainTheme": "The main theme or topic",
  "actionItems": ["Action item 1", "Action item 2"] // if any, otherwise empty array
}`;
        userPrompt = `Summarize this content:\n\n${content}`;
        break;

      case "expand":
        systemPrompt = `You are an expert at expanding ideas. Take the given content and expand it with more details, examples, and context while keeping the original meaning.

Respond with plain text that expands on the given content.`;
        userPrompt = `Expand on this content:\n\n${content}`;
        break;

      case "extract-tasks":
        systemPrompt = `You are an expert at identifying action items. Extract all tasks and action items from the given content.

Respond with a JSON object:
{
  "tasks": [
    {
      "title": "Task title",
      "priority": "high" | "medium" | "low",
      "context": "Why this task is relevant"
    }
  ]
}`;
        userPrompt = `Extract tasks from this content:\n\n${content}`;
        break;

      default:
        systemPrompt = `You are an expert note organizer. Analyze and structure the given content.
        
Respond with a JSON object:
{
  "summary": "A brief summary",
  "keyPoints": ["Key point 1", "Key point 2"],
  "suggestedTags": ["tag1", "tag2"],
  "suggestedTitle": "Suggested title"
}`;
        userPrompt = `Analyze this content:\n\n${content}`;
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      thinking: { type: "disabled" }
    });

    const response = completion.choices[0]?.message?.content;

    if (!response) {
      throw new Error("Empty response from AI");
    }

    // Try to parse as JSON for structured actions
    let result;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { content: response };
      }
    } catch {
      result = { content: response };
    }

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error("Notes API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to process note" 
      },
      { status: 500 }
    );
  }
}
