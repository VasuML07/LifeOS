import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// Store conversations in memory (in production, use database)
const conversations = new Map<string, Array<{ role: string; content: string }>>();

// Initialize ZAI instance
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
    const { sessionId, message, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    // Build system prompt with context
    const systemPrompt = `You are LifeOS Assistant, an intelligent personal assistant that helps users organize their life. You are calm, helpful, and focused on productivity.

${context ? `Current user context:
- Goals: ${context.goalsCount || 0} active goals
- Tasks: ${context.activeTasks || 0} active tasks  
- Habits: ${context.todayHabits || 0} habits to complete today

User's goals: ${context.goalsSummary || "No goals set"}
User's recent tasks: ${context.tasksSummary || "No recent tasks"}
` : ""}

Your capabilities:
- Help plan and organize tasks
- Provide productivity insights
- Suggest next actions based on goals and tasks
- Help structure notes and ideas
- Motivate and encourage the user

Guidelines:
- Be concise but helpful
- Focus on actionable advice
- Use markdown formatting when appropriate
- Be encouraging and positive
- If asked about planning, break things down into actionable steps`;

    // Get or create conversation history
    let history = conversations.get(sessionId) || [];
    
    // Add system prompt at the start if new conversation
    if (history.length === 0) {
      history.push({ role: "assistant", content: systemPrompt });
    }

    // Add user message
    history.push({ role: "user", content: message });

    // Limit conversation history to prevent token limits
    if (history.length > 20) {
      history = [history[0], ...history.slice(-19)];
    }

    // Get completion
    const completion = await zai.chat.completions.create({
      messages: history.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      })),
      thinking: { type: "disabled" }
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("Empty response from AI");
    }

    // Add AI response to history
    history.push({ role: "assistant", content: aiResponse });

    // Save updated history
    conversations.set(sessionId, history);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      messageCount: history.length - 1
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to process message" 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      conversations.delete(sessionId);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Conversation cleared" 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to clear conversation" },
      { status: 500 }
    );
  }
}
