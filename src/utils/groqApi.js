const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function getCodeSuggestions(fullCode, selectedLine) {
  const prompt = `Given this code context:
    
${fullCode}

And specifically focusing on this line:
${selectedLine}

Provide exactly 4 code suggestions in the following format:

1. Title: [Short action title]
   Description: [Code snippet or detailed implementation steps]

2. Title: [Short action title]
   Description: [Code snippet or detailed implementation steps]

3. Title: [Short action title]
   Description: [Code snippet or detailed implementation steps]

4. Title: [Short action title]
   Description: [Code snippet or detailed implementation steps]

Consider refactoring, debugging, extending functionality, and improving performance.
Return ONLY the numbered list with titles and descriptions as shown above.
Do not include any additional explanations or comments.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    const lines = data.choices[0].message.content
      .split('\n')
      .filter(line => line.trim());

    const suggestions = [];
    for (let i = 0; i < lines.length; i += 2) {
      if (lines[i] && lines[i + 1]) {
        suggestions.push({
          text: lines[i].replace(/^\d+\.\s+/, ''), // Remove number prefix
          preview: lines[i + 1].replace(/^\s*Description:\s*/, '') // Remove Description: prefix
        });
      }
    }

    return suggestions;
  } catch (error) {
    console.error('Error calling GROQ API:', error);
    return [{ text: 'Error fetching suggestions', preview: 'Error generating preview' }];
  }
}

export async function generateCode(fullCode, title, description) {
  console.log('Generating code with:', { title, description });
  
  const prompt = `You are an IDE code generator. Given this code:

${fullCode}

Apply this change:
${title}
${description}

Rules:
1. Return ONLY valid, runnable code
2. Include ONLY:
   - Code
   - Necessary imports
   - Inline comments (if needed)
3. NO explanations, documentation blocks, or markdown
4. NO text before or after the code
5. Make meaningful improvements to the implementation
6. Keep the code structure clean and professional

The response should start directly with the code (e.g. 'class Counter {' or 'import ...')`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a code generator in an IDE. Output only clean, valid code without explanations or documentation blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.95,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    const generatedCode = data.choices[0].message.content.trim();
    
    // Validate the generated code
    if (generatedCode === fullCode) {
      throw new Error('Generated code is identical to input');
    }
    
    if (!generatedCode.match(/^(import|class|const|let|var|function)/)) {
      throw new Error('Generated content does not appear to be valid code');
    }

    return generatedCode;
  } catch (error) {
    console.error('Error generating code:', error);
    throw error;
  }
}
