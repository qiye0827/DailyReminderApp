import { callAI, extractJSON } from './ai';
import { loadJSON, saveJSON } from './storage';
import { Quiz, QuizQuestion, QuizAttempt } from '../types';

const QUIZZES_KEY = 'quizzes';
const ATTEMPTS_KEY = 'attempts';

// ============ 数据操作 ============

export async function loadQuizzes(): Promise<Quiz[]> {
  const data = await loadJSON<{ quizzes: Quiz[] }>(QUIZZES_KEY, { quizzes: [] });
  return data.quizzes || [];
}

export async function saveQuizzes(quizzes: Quiz[]): Promise<void> {
  await saveJSON(QUIZZES_KEY, { quizzes });
}

export async function loadAttempts(): Promise<QuizAttempt[]> {
  const data = await loadJSON<{ attempts: QuizAttempt[] }>(ATTEMPTS_KEY, { attempts: [] });
  return data.attempts || [];
}

export async function saveAttempts(attempts: QuizAttempt[]): Promise<void> {
  await saveJSON(ATTEMPTS_KEY, { attempts });
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
  const quizzes = await loadQuizzes();
  return quizzes.find(q => q.id === quizId) || null;
}

// ============ 出题 ============

const QUIZ_SYSTEM_PROMPT = `你是一位教育测评专家。请生成测验题目。

规则：
1. 选择题（4个选项，考察理解而非死记硬背）
2. 填空题（关键术语，答案精确）
3. 解析题（综合分析）

请直接返回 JSON：
{
  "title": "测验标题",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "content": "题目内容",
      "options": ["A) 选项1", "B) 选项2", "C) 选项3", "D) 选项4"],
      "correct_answer": "A",
      "points": 5,
      "difficulty": "easy",
      "explanation": "解析",
      "tags": ["标签1"]
    }
  ]
}`;

export async function generateFirstQuestion(notesContent: string, dateStr: string): Promise<Quiz> {
  const prompt = `请基于以下笔记生成 1 道选择题。日期：${dateStr}\n\n笔记内容：\n${notesContent.slice(0, 3000)}`;

  const text = await callAI(QUIZ_SYSTEM_PROMPT, prompt, 1500);
  const data = extractJSON<{ title: string; questions: QuizQuestion[] }>(text);
  if (!data || !data.questions?.length) throw new Error('AI 返回格式错误');

  const quiz: Quiz = {
    id: Math.random().toString(36).slice(2, 10),
    title: data.title || `每日测验 - ${dateStr}`,
    source_date: dateStr,
    questions: data.questions,
    question_count: 10,
    created_at: new Date().toISOString(),
    status: 'generating',
    _notes: notesContent.slice(0, 5000),
  };

  const quizzes = await loadQuizzes();
  quizzes.unshift(quiz);
  await saveQuizzes(quizzes);
  return quiz;
}

export async function generateNextQuestion(quizId: string): Promise<QuizQuestion | null> {
  const quizzes = await loadQuizzes();
  const quiz = quizzes.find(q => q.id === quizId);
  if (!quiz) return null;

  const existing = quiz.questions.length;
  if (existing >= quiz.question_count) return null;

  const idx = existing + 1;
  let qType: string, points: number;
  if (idx <= 5) { qType = 'multiple_choice'; points = 5; }
  else if (idx <= 9) { qType = 'fill_blank'; points = 5; }
  else { qType = 'short_answer'; points = 10; }

  const notes = (quiz as any)._notes || '';
  const prompt = `基于笔记生成1道${qType === 'multiple_choice' ? '选择题(4选项)' : qType === 'fill_blank' ? '填空题' : '解析题'}。\n笔记：\n${notes.slice(0, 3000)}`;

  const systemPrompt = `你是出题专家。返回JSON：{"question":{"id":"q${idx}","type":"${qType}","content":"题目","options":["A) ...","B) ...","C) ...","D) ..."],"correct_answer":"答案","points":${points},"difficulty":"medium","explanation":"解析","tags":[]}}`;
  const text = await callAI(systemPrompt, prompt, 1500);
  const data = extractJSON<{ question: QuizQuestion }>(text);
  if (!data?.question) return null;

  data.question.id = `q${idx}`;
  quiz.questions.push(data.question);
  if (quiz.questions.length >= quiz.question_count) {
    quiz.status = 'pending';
  }
  await saveQuizzes(quizzes);
  return data.question;
}

// ============ 答题评分 ============

export async function submitAttempt(quizId: string, answers: { question_id: string; answer: string }[], timeSpent: number): Promise<QuizAttempt> {
  const quiz = await getQuiz(quizId);
  if (!quiz) throw new Error('测验不存在');

  const scores = [];
  let earned = 0;
  const maxScore = quiz.questions.reduce((s, q) => s + q.points, 0);

  for (const ans of answers) {
    const q = quiz.questions.find(q => q.id === ans.question_id);
    if (!q) continue;

    let isCorrect = false;
    let pointsEarned = 0;
    let feedback = '';

    if (q.type === 'multiple_choice') {
      isCorrect = ans.answer.trim().toUpperCase() === q.correct_answer.trim().toUpperCase();
      pointsEarned = isCorrect ? q.points : 0;
    } else if (q.type === 'fill_blank') {
      isCorrect = ans.answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      pointsEarned = isCorrect ? q.points : 0;
    } else {
      // Short answer - AI evaluation
      try {
        const evalPrompt = `评估答案正确性。题目：${q.content}\n参考答案：${q.correct_answer}\n用户答案：${ans.answer}\n返回JSON：{"score":0-10,"feedback":"评语"}`;
        const evalText = await callAI('你是评分专家。只返回JSON。', evalPrompt, 512);
        const evalData = extractJSON<{ score: number; feedback: string }>(evalText);
        if (evalData) {
          pointsEarned = Math.round((evalData.score / 10) * q.points);
          feedback = evalData.feedback || '';
          isCorrect = pointsEarned >= q.points * 0.6;
        }
      } catch {
        pointsEarned = Math.round(q.points * 0.5);
      }
    }

    earned += pointsEarned;
    scores.push({
      question_id: ans.question_id,
      question_type: q.type,
      user_answer: ans.answer,
      correct_answer: q.correct_answer,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      points_possible: q.points,
      ai_feedback: feedback,
    });
  }

  const attempt: QuizAttempt = {
    id: Math.random().toString(36).slice(2, 10),
    quiz_id: quizId,
    answers,
    scores,
    total_score: Math.round((earned / maxScore) * 100),
    max_score: maxScore,
    earned_score: earned,
    time_spent_seconds: timeSpent,
    completed_at: new Date().toISOString(),
  };

  const attempts = await loadAttempts();
  attempts.unshift(attempt);
  await saveAttempts(attempts);

  // Update quiz status
  quiz.status = 'completed';
  const quizzes = await loadQuizzes();
  const qi = quizzes.findIndex(q => q.id === quizId);
  if (qi >= 0) quizzes[qi] = quiz;
  await saveQuizzes(quizzes);

  return attempt;
}

export async function getQuizStats(): Promise<{ total: number; avgScore: number; streak: number }> {
  const attempts = await loadAttempts();
  const total = attempts.length;
  const avgScore = total > 0 ? Math.round(attempts.reduce((s, a) => s + a.total_score, 0) / total) : 0;

  // Calculate streak
  const dates = new Set(attempts.map(a => a.completed_at?.slice(0, 10)).filter(Boolean));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (dates.has(ds)) streak++;
    else break;
  }

  return { total, avgScore, streak };
}
