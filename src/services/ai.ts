import { loadConfig } from './storage';

interface AIResponse {
  text: string;
}

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const config = await loadConfig();
  if (!config.claude_api_key) {
    throw new Error('API Key 未配置，请在设置中填写');
  }

  const baseUrl = config.claude_base_url.replace(/\/+$/, '');
  const url = `${baseUrl}/v1/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.claude_api_key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.claude_sonnet_model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 402) throw new Error('API 余额不足');
    if (response.status === 401) throw new Error('API Key 无效');
    if (response.status === 429) throw new Error('请求过于频繁，请稍后重试');
    throw new Error(`API 请求失败 (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  let text = '';
  for (const block of data.content || []) {
    if (block.type === 'text') {
      text += block.text || '';
    }
  }
  return text;
}

export function extractJSON<T>(text: string, defaultValue: T | null = null): T | null {
  // Try markdown fence
  const fenceMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }

  // Try direct JSON object
  const start = text.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch { break; }
        }
      }
    }
  }

  return defaultValue;
}
