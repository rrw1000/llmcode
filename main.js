let config = null;

async function loadConfig() {
  const response = await fetch('config.json');
  config = await response.json();
}

function checkAuth() {
  const apiKey = localStorage.getItem('gcApiKey');
  if (!apiKey) {
    window.location.href = 'index.html';
    return null;
  }
  return apiKey;
}

function getStoredCode() {
  return localStorage.getItem('codeEditorContent') || getDefaultCode();
}

function getDefaultCode() {
  return `// Write your JavaScript code here
// It will be evaluated and shown in the preview pane

document.body.innerHTML = \`
  <div style="padding: 20px; font-family: sans-serif;">
    <h1>Hello, World!</h1>
    <p>Start coding or ask the AI assistant for help.</p>
  </div>
\`;`;
}

function saveCode(code) {
  localStorage.setItem('codeEditorContent', code);
}

function runCode() {
  const code = document.getElementById('codeEditor').value;
  saveCode(code);
  
  const preview = document.getElementById('preview');
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
  </style>
</head>
<body>
  <script>${code}<\/script>
</body>
</html>`;
  
  preview.srcdoc = html;
}

async function sendMessage(userMessage) {
  const apiKey = checkAuth();
  if (!apiKey) return;
  
  const currentCode = document.getElementById('codeEditor').value;
  
  const systemPrompt = `You are a helpful coding assistant that writes JavaScript code. 
The code you write will be evaluated directly in a browser.
Always respond with complete, runnable JavaScript code.
When modifying existing code, show the complete updated code, not just the changes.
Format your response as code inside \`\`\`javascript code blocks.
Keep the code self-contained without requiring external dependencies unless absolutely necessary.
The current code in the editor is:

\`\`\`javascript
${currentCode}
\`\`\``;

  const loadingOverlay = document.getElementById('loadingOverlay');
  loadingOverlay.classList.add('active');
  
  try {
    const url = `https://${config.endpoint}/v1/projects/${config.projectId}/locations/${config.region}/endpoints/openapi/chat/completions?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const message = data.choices[0].message;
    const assistantMessage = message.content;
    const reasoningContent = message.reasoning_content || '';
    
    const codeMatch = assistantMessage.match(/```javascript\n([\s\S]*?)```/);
    
    if (codeMatch) {
      const newCode = codeMatch[1].trim();
      document.getElementById('codeEditor').value = newCode;
      saveCode(newCode);
      runCode();
    }
    
    if (reasoningContent) {
      addChatMessage('assistant', reasoningContent);
    }
  } catch (error) {
    addChatMessage('assistant', `Error: ${error.message}`);
  } finally {
    loadingOverlay.classList.remove('active');
  }
}

function addChatMessage(role, content) {
  const chatHistory = document.getElementById('chatHistory');
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${role}`;
  
  if (role === 'assistant') {
    let formattedContent = formatAssistantMessage(content);
    messageDiv.innerHTML = formattedContent;
  } else {
    messageDiv.textContent = content;
  }
  
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  
  const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  history.push({ role, content });
  localStorage.setItem('chatHistory', JSON.stringify(history));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatAssistantMessage(content) {
  let result = escapeHtml(content);
  result = result.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  result = `<p>${result}</p>`;
  result = result.replace(/<p><\/p>/g, '');
  return result;
}

function loadChatHistory() {
  const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
  const chatHistory = document.getElementById('chatHistory');
  chatHistory.innerHTML = '';
  history.forEach(msg => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${msg.role}`;
    
    if (msg.role === 'assistant') {
      messageDiv.innerHTML = formatAssistantMessage(msg.content);
    } else {
      messageDiv.textContent = msg.content;
    }
    
    chatHistory.appendChild(messageDiv);
  });
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function clearChatHistory() {
  localStorage.removeItem('chatHistory');
  document.getElementById('chatHistory').innerHTML = '';
}

function init() {
  loadConfig().then(() => {
    if (!checkAuth()) return;
    
    const codeEditor = document.getElementById('codeEditor');
    codeEditor.value = getStoredCode();
    
    loadChatHistory();
    
    runCode();
    
    document.getElementById('runBtn').addEventListener('click', runCode);
    
    document.getElementById('sendBtn').addEventListener('click', () => {
      const input = document.getElementById('commandInput');
      const message = input.value.trim();
      if (message) {
        addChatMessage('user', message);
        input.value = '';
        sendMessage(message);
      }
    });
    
    document.getElementById('commandInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('sendBtn').click();
      }
    });
    
    document.getElementById('clearChatBtn').addEventListener('click', clearChatHistory);
    
    document.getElementById('clearPreviewBtn').addEventListener('click', () => {
      const preview = document.getElementById('preview');
      preview.srcdoc = '<html><body></body></html>';
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
      localStorage.removeItem('codeEditorContent');
      localStorage.removeItem('chatHistory');
      document.getElementById('codeEditor').value = getDefaultCode();
      document.getElementById('chatHistory').innerHTML = '';
      runCode();
    });
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('gcApiKey');
      window.location.href = 'index.html';
    });
    
    let saveTimeout;
    codeEditor.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveCode(codeEditor.value);
      }, 500);
    });
    
    document.getElementById('downloadBtn').addEventListener('click', () => {
      const code = document.getElementById('codeEditor').value;
      const blob = new Blob([code], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code.js';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    document.getElementById('downloadSessionBtn').addEventListener('click', () => {
      const session = {
        chatHistory: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
        code: document.getElementById('codeEditor').value
      };
      const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'session.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    document.getElementById('downloadCreationBtn').addEventListener('click', async () => {
      const response = await fetch('session-ses_22a4.md');
      const content = await response.text();
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'session-ses_22a4.md';
      a.click();
      URL.revokeObjectURL(url);
    });
    
    document.getElementById('versionBtn').addEventListener('click', () => {
      document.getElementById('versionDialog').classList.add('active');
    });
    
    document.getElementById('closeDialogBtn').addEventListener('click', () => {
      document.getElementById('versionDialog').classList.remove('active');
    });
    
    document.getElementById('versionDialog').addEventListener('click', (e) => {
      if (e.target.id === 'versionDialog') {
        document.getElementById('versionDialog').classList.remove('active');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
