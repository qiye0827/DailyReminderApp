import { loadConfig } from './storage';

let _tokenCache = { token: '', expires: 0 };

async function getToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache.token && now < _tokenCache.expires) {
    return _tokenCache.token;
  }

  const config = await loadConfig();
  if (!config.feishu_app_id || !config.feishu_app_secret) {
    throw new Error('飞书 App ID/Secret 未配置');
  }

  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: config.feishu_app_id,
      app_secret: config.feishu_app_secret,
    }),
  });

  const data = await resp.json();
  if (data.code !== 0) throw new Error(`飞书认证失败: ${data.msg}`);

  _tokenCache = {
    token: data.tenant_access_token,
    expires: now + (data.expire || 7200) * 1000 - 300000,
  };

  return _tokenCache.token;
}

export async function readDocument(docToken: string): Promise<string> {
  const token = await getToken();
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/raw_content`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await resp.json();
  if (data.code !== 0) throw new Error(`读取文档失败: ${data.msg}`);
  return data.data?.content || '';
}

export async function writeDocument(docToken: string, content: string): Promise<void> {
  const token = await getToken();

  // Get existing blocks
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const blocksData = await resp.json();
  const items = blocksData.data?.items || [];
  const childBlocks = items.filter((b: any) => b.block_type !== 1);

  if (childBlocks.length === 0) {
    // Append content
    await appendContent(docToken, token, content);
    return;
  }

  // Patch first block with new content
  await patchBlock(docToken, token, childBlocks[0].block_id, content);

  // Clear remaining blocks
  for (const b of childBlocks.slice(1)) {
    await patchBlock(docToken, token, b.block_id, ' ');
  }
}

async function patchBlock(docToken: string, token: string, blockId: string, content: string) {
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks/${blockId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        update_text_elements: {
          elements: [{ text_run: { content } }],
        },
      }),
    }
  );
  return resp.json();
}

async function appendContent(docToken: string, token: string, content: string) {
  const resp = await fetch(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/children`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        children: [{
          block_type: 2,
          text: {
            elements: [{ text_run: { content } }],
            style: {},
          },
        }],
        index: -1,
      }),
    }
  );
  return resp.json();
}

export async function uploadAll(data: Record<string, any>): Promise<Record<string, any>> {
  const config = await loadConfig();
  const results: Record<string, any> = {};

  for (const [key, docKey] of Object.entries({
    daily: 'feishu_doc_daily',
    quiz: 'feishu_doc_quiz',
    interview: 'feishu_doc_interview',
    feynman: 'feishu_doc_feynman',
    review: 'feishu_doc_review',
  })) {
    const docToken = config[docKey as keyof typeof config];
    if (!docToken) { results[key] = 'no doc token'; continue; }
    if (!data[key]) { results[key] = 'no data'; continue; }

    try {
      const content = JSON.stringify(data[key], null, 2);
      await writeDocument(docToken, content);
      results[key] = true;
    } catch (e: any) {
      results[key] = e.message;
    }
  }

  return results;
}
