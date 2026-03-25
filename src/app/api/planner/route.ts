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
    const { goal, deadline, currentTasks } = body;

    if (!goal) {
      return NextResponse.json(
        { error: "Goal is required" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    const today = new Date();
    const deadlineDate = deadline ? new Date(deadline) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const systemPrompt = `You are an expert productivity planner. Generate a realistic, actionable plan to help the user achieve their goal.

Guidelines:
- Break down the goal into specific, actionable tasks
- Each task should be completable in 30-120 minutes
- Distribute tasks across the available days
- Include buffer time and review sessions
- Consider dependencies between tasks
- Be realistic about what can be accomplished

Respond with a JSON object in this exact format:
{
  "summary": "Brief summary of the plan",
  "totalTasks": number,
  "estimatedHours": number,
  "tasks": [
    {
      "title": "Task title",
      "description": "Optional description",
      "estimatedMinutes": number,
      "scheduledDate": "YYYY-MM-DD",
      "priority": "high" | "medium" | "low"
    }
  ]
}`;

    const userPrompt = `Create a plan for this goal:

Goal: ${goal}
Deadline: ${deadlineDate.toISOString().split('T')[0]} (${daysUntilDeadline} days from now)
Today's date: ${today.toISOString().split('T')[0]}
${currentTasks ? `Current tasks to consider: ${JSON.stringify(currentTasks)}` : ""}

Generate a realistic plan with tasks distributed across the available time.`;

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

    // Parse the JSON response
    let plan;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No valid JSON found in response");
      }
    } catch {
      // If parsing fails, create a basic plan
      plan = {
        summary: `Plan to achieve: ${goal}`,
        totalTasks: 1,
        estimatedHours: 2,
        tasks: [{
          title: goal,
          description: "Start working on your goal",
          estimatedMinutes: 120,
          scheduledDate: today.toISOString().split('T')[0],
          priority: "high"
        }]
      };
    }

    return NextResponse.json({
      success: true,
      plan
    });

  } catch (error) {
    console.error("Planner API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate plan" 
      },
      { status: 500 }
    );
  }
}
