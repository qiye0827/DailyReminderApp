import { callAI, extractJSON } from './ai';
import { loadJSON, saveJSON } from './storage';
import { FeynmanSession, FeynmanQuestion, FeynmanFeedback, FeynmanScore } from '../types';

const SESSIONS_KEY = 'feynman_sessions';

export async function loadSessions(): Promise<FeynmanSession[]> {
  const data = await loadJSON<{ sessions: FeynmanSession[] }>(SESSIONS_KEY, { sessions: [] });
  return data.sessions || [];
}

export async function saveSessions(sessions: FeynmanSession[]): Promise<void> {
  await saveJSON(SESSIONS_KEY, { sessions });
}

export async function startSession(notesContent: string): Promise<{ session: FeynmanSession; phase: string }> {
  const session: FeynmanSession = {
    id: Math.random().toString(36).slice(2, 10),
    notes_content: notesContent.slice(0, 8000),
    phase: 'retelling',
    retelling: '',
    questions: [],
    answers: [],
    scores: [],
    current_index: 0,
    started_at: new Date().toISOString(),
    status: 'in_progress',
  };

  const sessions = await loadSessions();
  sessions.unshift(session);
  await saveSessions(sessions);
  return { session, phase: 'retelling' };
}

export async function submitRetelling(sessionId: string, retelling: string): Promise<{ feedback: FeynmanFeedback; questions: FeynmanQuestion[]; first_question: FeynmanQuestion | null }> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) throw new Error('学习会话不存在');

  const notes = session.notes_content || '';
  const prompt = `原始笔记：\n${notes.slice(0, 5000)}\n\n用户复述：\n${retelling.slice(0, 3000)}`;

  const systemPrompt = `你是费曼学习法教练。评估复述并生成考察题目。
返回JSON：
{
  "retelling_feedback": {"clarity":0-10,"accuracy":0-10,"completeness":0-10,"total":0-30,"strengths":["优点"],"weaknesses":["不足"],"missing_points":["遗漏"]},
  "questions": [
    {"id":"q1","content":"题目","type":"fill_blank","correct_answer":"答案","explanation":"解析","tags":[]},
    {"id":"q2","content":"题目","type":"short_answer","correct_answer":"答案","explanation":"解析","tags":[]}
  ]
}`;

  const text = await callAI(systemPrompt, prompt, 4096);
  const data = extractJSON<any>(text);
  if (!data) throw new Error('AI 返回格式错误');

  session.retelling = retelling;
  session.retelling_feedback = data.retelling_feedback || {};
  session.questions = data.questions || [];
  session.phase = 'quiz';
  session.current_index = 0;
  await saveSessions(sessions);

  return {
    feedback: session.retelling_feedback!,
    questions: session.questions,
    first_question: session.questions[0] || null,
  };
}

export async function submitAnswer(sessionId: string, questionId: string, answer: string): Promise<{ score: FeynmanScore; is_finished: boolean; next_question: FeynmanQuestion | null }> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) throw new Error('学习会话不存在');

  const question = session.questions.find(q => q.id === questionId);
  if (!question) throw new Error('题目不存在');

  const prompt = `题目：${question.content}\n参考答案：${question.correct_answer || ''}\n用户回答：${answer}`;
  const text = await callAI('评估答题是否正确。返回JSON：{"correct":true/false,"score":0-10,"feedback":"评语","key_point":"正确答案要点"}', prompt, 512);
  const scoreData = extractJSON<FeynmanScore>(text);
  const score: FeynmanScore = scoreData || { correct: false, score: 3, feedback: '评分完成', key_point: '' };

  session.answers.push({
    question_id: questionId,
    question: question.content,
    answer,
    score,
    answered_at: new Date().toISOString(),
  });
  session.scores.push(score);
  session.current_index++;

  const isFinished = session.current_index >= session.questions.length;
  let nextQuestion: FeynmanQuestion | null = null;

  if (!isFinished) {
    nextQuestion = session.questions[session.current_index];
  } else {
    session.status = 'completed';
    session.completed_at = new Date().toISOString();
  }

  await saveSessions(sessions);
  return { score, is_finished: isFinished, next_question: nextQuestion };
}

export async function generateNextQuestion(sessionId: string): Promise<FeynmanQuestion | null> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return null;

  const existing = session.questions.length;
  if (existing >= 8) return null;

  const notes = session.notes_content || '';
  const retelling = session.retelling || '';
  const prompt = `笔记：\n${notes.slice(0, 3000)}\n\n用户复述：\n${retelling.slice(0, 2000)}`;
  const systemPrompt = `根据笔记和用户复述，生成1道考察题目（重点考察遗漏内容）。返回JSON：{"question":{"id":"q${existing + 1}","content":"题目","type":"fill_blank","correct_answer":"答案","explanation":"解析","tags":[]}}`;

  const text = await callAI(systemPrompt, prompt, 1500);
  const data = extractJSON<{ question: FeynmanQuestion }>(text);
  if (!data?.question) return null;

  data.question.id = `q${existing + 1}`;
  session.questions.push(data.question);
  await saveSessions(sessions);
  return data.question;
}

export async function deleteSession(sessionId: string): Promise<void> {
  let sessions = await loadSessions();
  sessions = sessions.filter(s => s.id !== sessionId);
  await saveSessions(sessions);
}
