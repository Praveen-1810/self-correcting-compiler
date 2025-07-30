async function handler({ code, language }) {
  if (!code) {
    return { error: "Code is required" };
  }

  const languageMap = {
    javascript: 63,
    python: 71,
    java: 62,
    cpp: 54,
    c: 50,
    ruby: 72,
    go: 60,
    rust: 73,
    typescript: 74,
  };

  const langId = languageMap[language?.toLowerCase()] || 63;

  try {
    const response = await fetch("https://judge0-ce.p.rapidapi.com/highlight", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": process.env.RAPID_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
      }),
    });

    if (!response.ok) {
      return { error: "Failed to highlight code" };
    }

    const data = await response.json();

    if (data.error) {
      return { error: data.error };
    }

    return {
      html: data.html,
      language: language,
      success: true,
    };
  } catch (error) {
    return {
      error: "Failed to process syntax highlighting",
      details: error.message,
    };
  }
}
export async function POST(request) {
  return handler(await request.json());
}