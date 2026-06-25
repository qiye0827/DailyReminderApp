import { callAI, extractJSON } from './ai';
import { loadJSON, saveJSON } from './storage';
import { InterviewSession, InterviewQuestion, InterviewScore } from '../types';

const SESSIONS_KEY = 'interview_sessions';

export async function loadSessions(): Promise<InterviewSession[]> {
  const data = await loadJSON<{ sessions: InterviewSession[] }>(SESSIONS_KEY, { sessions: [] });
  return data.sessions || [];
}

export async function saveSessions(sessions: InterviewSession[]): Promise<void> {
  await saveJSON(SESSIONS_KEY, { sessions });
}

export async function getSession(sessionId: string): Promise<InterviewSession | null> {
  const sessions = await loadSessions();
  return sessions.find(s => s.id === sessionId) || null;
}

export async function startSession(notesContent: string): Promise<{ session: InterviewSession; question: InterviewQuestion }> {
  const prompt = `请生成1个PISI信号完整性面试问题。\n笔记：\n${(notesContent || '').slice(0, 3000)}`;
  const systemPrompt = `你是PISI面试官。返回JSON：{"question":{"id":"q1","question":"问题","difficulty":"easy","expected_points":["要点"],"reference_links":[],"tags":[]}}`;

  const text = await callAI(systemPrompt, prompt, 1500);
  const data = extractJSON<{ question: InterviewQuestion }>(text);
  if (!data?.question) throw new Error('AI 返回格式错误');

  const session: InterviewSession = {
    id: Math.random().toString(36).slice(2, 10),
    questions: [data.question],
    current_index: 0,
    answers: [],
    scores: [],
    started_at: new Date().toISOString(),
    status: 'generating',
    _total: 5,
    _notes: notesContent?.slice(0, 5000) || '',
  } as any;

  const sessions = await loadSessions();
  sessions.unshift(session);
  await saveSessions(sessions);

  return { session, question: data.question };
}

export async function generateNextQuestion(sessionId: string): Promise<InterviewQuestion | null> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;

  const existing = session.questions.length;
  const total = (session as any)._total || 5;
  if (existing >= total) {
    session.status = 'in_progress';
    await saveSessions(sessions);
    return null;
  }

  const notes = (session as any)._notes || '';
  const difficulties = ['easy', 'easy', 'medium', 'medium', 'hard'];
  const diff = difficulties[existing] || 'medium';

  const prompt = `生成1个${diff}难度的PISI面试问题。\n笔记：\n${notes.slice(0, 3000)}`;
  const systemPrompt = `你是PISI面试官。返回JSON：{"question":{"id":"q${existing + 1}","question":"问题","difficulty":"${diff}","expected_points":["要点"],"reference_links":[],"tags":[]}}`;

  const text = await callAI(systemPrompt, prompt, 1500);
  const data = extractJSON<{ question: InterviewQuestion }>(text);
  if (!data?.question) return null;

  data.question.id = `q${existing + 1}`;
  session.questions.push(data.question);
  if (session.questions.length >= total) {
    session.status = 'in_progress';
  }
  await saveSessions(sessions);
  return data.question;
}

export async function submitAnswer(sessionId: string, questionId: string, answer: string): Promise<{ score: InterviewScore; is_finished: boolean; next_question: InterviewQuestion | null }> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) throw new Error('面试会话不存在');

  const question = session.questions.find(q => q.id === questionId);
  if (!question) throw new Error('问题不存在');

  const evalPrompt = `评估候选人回答。问题：${question.question}\n参考要点：${JSON.stringify(question.expected_points || [])}\n回答：${answer}\n返回JSON：{"accuracy":0-10,"completeness":0-10,"depth":0-10,"total":0-30,"feedback":"评语","key_points_missed":["遗漏"]}`;

  const text = await callAI('你是面试评估专家。只返回JSON。', evalPrompt, 1024);
  const scoreData = extractJSON<InterviewScore>(text);
  const score: InterviewScore = scoreData || {
    accuracy: 6, completeness: 6, depth: 5, total: 17,
    feedback: '评分完成', key_points_missed: [],
  };
  score.total = (score.accuracy || 0) + (score.completeness || 0) + (score.depth || 0);

  session.answers.push({
    question_id: questionId,
    question: question.question,
    answer,
    score,
    answered_at: new Date().toISOString(),
  });
  session.scores.push(score);
  session.current_index++;

  const isFinished = session.current_index >= session.questions.length;
  let nextQuestion: InterviewQuestion | null = null;

  if (!isFinished) {
    nextQuestion = session.questions[session.current_index];
  } else {
    session.status = 'completed';
    session.completed_at = new Date().toISOString();
  }

  await saveSessions(sessions);
  return { score, is_finished: isFinished, next_question: nextQuestion };
}

export async function deleteSession(sessionId: string): Promise<void> {
  let sessions = await loadSessions();
  sessions = sessions.filter(s => s.id !== sessionId);
  await saveSessions(sessions);
}
