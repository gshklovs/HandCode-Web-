// Get API URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getCodeSuggestions(fullCode, selectedLine) {
  if (!fullCode || !selectedLine) {
    console.error('Missing required parameters:', { fullCode: !!fullCode, selectedLine: !!selectedLine });
    throw new Error('Missing required parameters for code suggestions');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_code: fullCode,
        selected_line: selectedLine
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || JSON.stringify(errorData));
      error.details = errorData;
      throw error;
    }

    const data = await response.json();
    
    // Parse the suggestions text into an array of objects
    const lines = data.suggestions.split('\n').filter(line => line.trim());
    const suggestions = [];
    for (let i = 0; i < lines.length; i += 2) {
      if (lines[i] && lines[i + 1]) {
        suggestions.push({
          text: lines[i].replace(/^\d+\.\s+/, '').replace('Title: ', ''), // Remove number prefix and "Title: "
          preview: lines[i + 1].replace(/^\s*Description:\s*/, '') // Remove Description: prefix
        });
      }
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error getting suggestions:', error);
    throw error;
  }
}

export async function generateCode(fullCode, title, description, signal) {
  if (!fullCode || !title || !description) {
    throw new Error('Missing required parameters for code generation');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        full_code: fullCode,
        title,
        description
      }),
      signal
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(errorData.error?.message || JSON.stringify(errorData));
      error.details = errorData;
      throw error;
    }

    const data = await response.json();
    return data.generated_code;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.error('Error generating code:', error);
    throw error;
  }
}
