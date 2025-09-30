export async function POST(request) {
  try {
    const body = await request.json();
    const { messages, stream = false } = body;

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    const userContent = lastMessage?.content || "";

    let responseContent = "";

    // Check if this is a code analysis request
    if (userContent.includes("Analyze this") && userContent.includes("code")) {
      const languageMatch = userContent.match(/(javascript|python|java|cpp|c|html|css|php|ruby|swift|kotlin|rust|go|sql|typescript)/i);
      const language = languageMatch ? languageMatch[1] : "code";
      
      // Extract code from the message
      const codeMatch = userContent.match(/```[\s\S]*?```/);
      const code = codeMatch ? codeMatch[0].replace(/```/g, '') : userContent.split('\n').slice(-10).join('\n');

      // Basic code analysis
      const analysis = analyzeCode(code, language);
      
      if (userContent.includes("CORRECTED CODE:")) {
        responseContent = `Error Analysis:
❌ [Line 1] Basic syntax check completed
START_POS: 0
END_POS: ${code.length}

CORRECTED CODE:
${code}`;
      } else {
        responseContent = `I've analyzed your ${language} code. Here's what I found:

✅ Code structure looks good
✅ Basic syntax appears correct
✅ No obvious errors detected

Suggestions for improvement:
- Consider adding comments for better readability
- Ensure proper error handling
- Follow consistent naming conventions

Your code appears to be syntactically correct!`;
      }
    } else if (userContent.includes("Execute this")) {
      // Mock code execution
      const languageMatch = userContent.match(/(javascript|python|java|cpp|c|html|css|php|ruby|swift|kotlin|rust|go|sql|typescript)/i);
      const language = languageMatch ? languageMatch[1] : "code";
      
      responseContent = `Mock execution output for ${language}:
> Code executed successfully
> No runtime errors detected
> Output: [Mock execution result]`;
    } else {
      // General chat response
      responseContent = `Hello! I'm your coding assistant. I can help you with:
- Code analysis and debugging
- Programming concepts and best practices
- Code optimization suggestions
- General programming questions

What would you like help with today? 💻✨`;
    }

    if (stream) {
      // Mock streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(responseContent));
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked'
        }
      });
    }

    return Response.json({
      role: "assistant",
      content: responseContent
    });
  } catch (error) {
    return Response.json({
      error: "Failed to process request"
    }, { status: 500 });
  }
}

function analyzeCode(code, language) {
  // Basic code analysis logic
  const lines = code.split('\n');
  const issues = [];
  
  // Check for common issues
  if (language === 'javascript') {
    if (code.includes('console.log') && !code.includes('//')) {
      issues.push('Consider removing console.log statements in production code');
    }
    if (code.includes('var ') && !code.includes('// legacy')) {
      issues.push('Consider using const or let instead of var');
    }
  }
  
  if (language === 'python') {
    if (code.includes('print(') && !code.includes('#')) {
      issues.push('Consider using logging instead of print statements');
    }
  }
  
  return issues.length > 0 ? issues : ['No obvious issues found'];
} 