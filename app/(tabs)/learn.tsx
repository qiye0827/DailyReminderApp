import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as QuizService from '../../src/services/quiz';
import * as InterviewService from '../../src/services/interview';
import * as FeynmanService from '../../src/services/feynman';
import { Quiz, QuizQuestion, QuizAttempt, InterviewSession, InterviewQuestion, InterviewScore, FeynmanSession, FeynmanQuestion, FeynmanFeedback } from '../../src/types';

type TabType = 'quiz' | 'interview' | 'feynman';

export default function LearnScreen() {
  const [tab, setTab] = useState<TabType>('quiz');

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>学习中心</Text>
      </View>
      <View style={s.tabs}>
        {([['quiz', '📖 测验'], ['interview', '🎤 面试'], ['feynman', '🧠 费曼']] as [TabType, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'quiz' && <QuizSection />}
      {tab === 'interview' && <InterviewSection />}
      {tab === 'feynman' && <FeynmanSection />}
    </View>
  );
}

// ============ Quiz Section ============

function QuizSection() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);

  useFocusEffect(useCallback(() => { QuizService.loadQuizzes().then(setQuizzes); }, []));

  const startNewQuiz = async () => {
    setLoading(true);
    try {
      const quiz = await QuizService.generateFirstQuestion('', new Date().toISOString().slice(0, 10));
      setCurrentQuiz(quiz);
      setQIdx(0);
      setAnswers({});
      setResult(null);
    } catch (e: any) {
      Alert.alert('生成失败', e.message);
    }
    setLoading(false);
  };

  const selectAnswer = (qId: string, ans: string) => {
    setAnswers(prev => ({ ...prev, [qId]: ans }));
  };

  const nextQuestion = async () => {
    if (!currentQuiz) return;
    if (qIdx < currentQuiz.questions.length - 1) {
      setQIdx(qIdx + 1);
    } else {
      // Try generate next
      setLoading(true);
      try {
        const next = await QuizService.generateNextQuestion(currentQuiz.id);
        if (next) {
          currentQuiz.questions.push(next);
          setQIdx(qIdx + 1);
        } else {
          // Submit
          const ansArr = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }));
          const attempt = await QuizService.submitAttempt(currentQuiz.id, ansArr, 0);
          setResult(attempt);
        }
      } catch (e: any) {
        Alert.alert('错误', e.message);
      }
      setLoading(false);
    }
  };

  if (result) {
    return (
      <ScrollView style={s.content}>
        <View style={s.resultCard}>
          <Text style={s.resultScore}>{result.total_score}</Text>
          <Text style={s.resultLabel}>分</Text>
          <Text style={s.resultDetail}>得分 {result.earned_score}/{result.max_score}</Text>
        </View>
        <TouchableOpacity style={s.btn} onPress={() => { setCurrentQuiz(null); setResult(null); QuizService.loadQuizzes().then(setQuizzes); }}>
          <Text style={s.btnText}>返回列表</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (currentQuiz) {
    const q = currentQuiz.questions[qIdx];
    if (!q) return null;
    return (
      <ScrollView style={s.content}>
        <Text style={s.progress}>问题 {qIdx + 1}/{currentQuiz.question_count}</Text>
        <View style={s.questionCard}>
          <Text style={s.questionText}>{q.content}</Text>
          {q.options?.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[s.optionBtn, answers[q.id] === opt.charAt(0) && s.optionSelected]}
              onPress={() => selectAnswer(q.id, opt.charAt(0))}
            >
              <Text style={s.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
          {q.type === 'fill_blank' || q.type === 'short_answer' ? (
            <TextInput
              style={s.textInput}
              placeholder="输入答案..."
              placeholderTextColor="#94a3b8"
              value={answers[q.id] || ''}
              onChangeText={v => selectAnswer(q.id, v)}
              multiline
            />
          ) : null}
        </View>
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={nextQuestion} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{qIdx < currentQuiz.question_count - 1 ? '下一题 →' : '提交'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.content}>
      {quizzes.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📝</Text>
          <Text style={s.emptyText}>还没有测验记录</Text>
        </View>
      ) : (
        quizzes.slice(0, 10).map(q => (
          <TouchableOpacity key={q.id} style={s.listItem} onPress={() => { setCurrentQuiz(q); setQIdx(0); setAnswers({}); setResult(null); }}>
            <Text style={s.listTitle}>{q.title}</Text>
            <Text style={s.listMeta}>{q.questions?.length || 0} 题 · {q.status === 'completed' ? '✅ 已完成' : '⏳ 进行中'}</Text>
          </TouchableOpacity>
        ))
      )}
      <TouchableOpacity style={s.btn} onPress={startNewQuiz} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>📝 生成新测验</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============ Interview Section ============

function InterviewSection() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [current, setCurrent] = useState<InterviewSession | null>(null);
  const [currentQ, setCurrentQ] = useState<InterviewQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<InterviewScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [qIdx, setQIdx] = useState(0);

  useFocusEffect(useCallback(() => { InterviewService.loadSessions().then(setSessions); }, []));

  const startNew = async () => {
    setLoading(true);
    try {
      const { session, question } = await InterviewService.startSession('');
      setCurrent(session);
      setCurrentQ(question);
      setQIdx(0);
      setAnswer('');
      setFeedback(null);
    } catch (e: any) {
      Alert.alert('失败', e.message);
    }
    setLoading(false);
  };

  const submitAnswer = async () => {
    if (!current || !currentQ || !answer.trim()) return;
    setLoading(true);
    try {
      const result = await InterviewService.submitAnswer(current.id, currentQ.id, answer.trim());
      setFeedback(result.score);
      setAnswer('');
      setTimeout(async () => {
        if (result.next_question) {
          setCurrentQ(result.next_question);
          setQIdx(prev => prev + 1);
          setFeedback(null);
        } else {
          // Try generate next
          const next = await InterviewService.generateNextQuestion(current.id);
          if (next) {
            setCurrentQ(next);
            setQIdx(prev => prev + 1);
            setFeedback(null);
          } else {
            setCurrent(null);
            setCurrentQ(null);
            InterviewService.loadSessions().then(setSessions);
          }
        }
        setLoading(false);
      }, 2000);
    } catch (e: any) {
      Alert.alert('失败', e.message);
      setLoading(false);
    }
  };

  if (current && currentQ) {
    return (
      <ScrollView style={s.content}>
        <Text style={s.progress}>问题 {qIdx + 1}/5</Text>
        <View style={s.questionCard}>
          <Text style={s.questionText}>{currentQ.question}</Text>
          <Text style={s.difficultyTag}>
            {currentQ.difficulty === 'easy' ? '简单' : currentQ.difficulty === 'medium' ? '中等' : '困难'}
          </Text>
        </View>
        {feedback ? (
          <View style={s.feedbackCard}>
            <Text style={s.feedbackScore}>{feedback.total}/30</Text>
            <Text style={s.feedbackText}>准确性 {feedback.accuracy} · 完整性 {feedback.completeness} · 深度 {feedback.depth}</Text>
            <Text style={s.feedbackDetail}>{feedback.feedback}</Text>
          </View>
        ) : (
          <View>
            <TextInput
              style={[s.textInput, { minHeight: 100 }]}
              placeholder="输入你的回答..."
              placeholderTextColor="#94a3b8"
              value={answer}
              onChangeText={setAnswer}
              multiline
            />
            <TouchableOpacity style={[s.btn, (!answer.trim() || loading) && s.btnDisabled]} onPress={submitAnswer} disabled={!answer.trim() || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>提交回答</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.content}>
      {sessions.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🎤</Text>
          <Text style={s.emptyText}>还没有面试记录</Text>
        </View>
      ) : (
        sessions.slice(0, 10).map(sess => (
          <TouchableOpacity key={sess.id} style={s.listItem}>
            <Text style={s.listTitle}>模拟面试</Text>
            <Text style={s.listMeta}>{sess.answers?.length || 0}/{sess.questions?.length || 5} 题 · {sess.status === 'completed' ? '✅ 已完成' : '⏳ 进行中'}</Text>
          </TouchableOpacity>
        ))
      )}
      <TouchableOpacity style={s.btn} onPress={startNew} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>🎤 开始面试</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============ Feynman Section ============

function FeynmanSection() {
  const [sessions, setSessions] = useState<FeynmanSession[]>([]);
  const [current, setCurrent] = useState<FeynmanSession | null>(null);
  const [phase, setPhase] = useState<'input' | 'retelling' | 'quiz' | 'results'>('input');
  const [notes, setNotes] = useState('');
  const [retelling, setRetelling] = useState('');
  const [feedback, setFeedback] = useState<FeynmanFeedback | null>(null);
  const [currentQ, setCurrentQ] = useState<FeynmanQuestion | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => { FeynmanService.loadSessions().then(setSessions); }, []));

  const startSession = async () => {
    if (!notes.trim()) { Alert.alert('提示', '请先输入学习笔记'); return; }
    setLoading(true);
    try {
      const { session } = await FeynmanService.startSession(notes);
      setCurrent(session);
      setPhase('retelling');
    } catch (e: any) {
      Alert.alert('失败', e.message);
    }
    setLoading(false);
  };

  const submitRetelling = async () => {
    if (!current || !retelling.trim()) return;
    setLoading(true);
    try {
      const result = await FeynmanService.submitRetelling(current.id, retelling);
      setFeedback(result.feedback);
      if (result.first_question) {
        setCurrentQ(result.first_question);
        setQIdx(0);
        setPhase('quiz');
      } else {
        setPhase('results');
      }
    } catch (e: any) {
      Alert.alert('失败', e.message);
    }
    setLoading(false);
  };

  const submitQuizAnswer = async () => {
    if (!current || !currentQ || !answer.trim()) return;
    setLoading(true);
    try {
      const result = await FeynmanService.submitAnswer(current.id, currentQ.id, answer.trim());
      setAnswer('');
      setTimeout(async () => {
        if (result.next_question) {
          setCurrentQ(result.next_question);
          setQIdx(prev => prev + 1);
        } else {
          const next = await FeynmanService.generateNextQuestion(current.id);
          if (next) {
            setCurrentQ(next);
            setQIdx(prev => prev + 1);
          } else {
            setPhase('results');
          }
        }
        setLoading(false);
      }, 1500);
    } catch (e: any) {
      Alert.alert('失败', e.message);
      setLoading(false);
    }
  };

  // Input phase
  if (phase === 'input') {
    return (
      <ScrollView style={s.content}>
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🧠</Text>
          <Text style={s.emptyTitle}>费曼学习法</Text>
          <Text style={s.emptyText}>输入学习笔记 → 用自己的话复述 → AI 根据复述出题考察</Text>
        </View>
        <TextInput
          style={[s.textInput, { minHeight: 120 }]}
          placeholder="粘贴今天的学习笔记..."
          placeholderTextColor="#94a3b8"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={startSession} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>开始复述</Text>}
        </TouchableOpacity>
        {sessions.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={s.sectionTitle}>历史记录</Text>
            {sessions.slice(0, 5).map(sess => (
              <TouchableOpacity key={sess.id} style={s.listItem}>
                <Text style={s.listTitle}>费曼学习</Text>
                <Text style={s.listMeta}>{sess.answers?.length || 0} 题 · {sess.status === 'completed' ? '✅' : '⏳'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // Retelling phase
  if (phase === 'retelling') {
    return (
      <ScrollView style={s.content}>
        <Text style={s.sectionTitle}>请用自己的话复述以下内容：</Text>
        <View style={s.questionCard}>
          <Text style={s.questionText} numberOfLines={6}>{notes.slice(0, 500)}</Text>
        </View>
        <TextInput
          style={[s.textInput, { minHeight: 120 }]}
          placeholder="用你自己的话复述..."
          placeholderTextColor="#94a3b8"
          value={retelling}
          onChangeText={setRetelling}
          multiline
        />
        <TouchableOpacity style={[s.btn, (!retelling.trim() || loading) && s.btnDisabled]} onPress={submitRetelling} disabled={!retelling.trim() || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>提交复述</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Quiz phase
  if (phase === 'quiz' && currentQ) {
    return (
      <ScrollView style={s.content}>
        {feedback && (
          <View style={s.feedbackCard}>
            <Text style={s.feedbackScore}>{feedback.total}/30</Text>
            <Text style={s.feedbackText}>清晰度 {feedback.clarity} · 准确性 {feedback.accuracy} · 完整性 {feedback.completeness}</Text>
            {feedback.missing_points?.length ? <Text style={s.feedbackDetail}>💡 遗漏：{feedback.missing_points.join('、')}</Text> : null}
          </View>
        )}
        <Text style={s.progress}>概念 {qIdx + 1}/3</Text>
        <View style={s.questionCard}>
          <Text style={s.questionText}>{currentQ.content}</Text>
        </View>
        <TextInput
          style={[s.textInput, { minHeight: 80 }]}
          placeholder="你的回答..."
          placeholderTextColor="#94a3b8"
          value={answer}
          onChangeText={setAnswer}
          multiline
        />
        <TouchableOpacity style={[s.btn, (!answer.trim() || loading) && s.btnDisabled]} onPress={submitQuizAnswer} disabled={!answer.trim() || loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>提交回答</Text>}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Results phase
  return (
    <ScrollView style={s.content}>
      <View style={s.resultCard}>
        <Text style={s.resultScore}>✅</Text>
        <Text style={s.resultLabel}>学习完成</Text>
      </View>
      <TouchableOpacity style={s.btn} onPress={() => { setCurrent(null); setPhase('input'); setFeedback(null); FeynmanService.loadSessions().then(setSessions); }}>
        <Text style={s.btnText}>返回</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============ Styles ============

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  tab: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6C5CE7' },
  tabText: { fontSize: 14, color: '#94a3b8' },
  tabTextActive: { color: '#6C5CE7', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginBottom: 12 },
  progress: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  questionCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 16 },
  questionText: { fontSize: 15, color: '#fff', lineHeight: 24 },
  difficultyTag: { fontSize: 12, color: '#6C5CE7', marginTop: 8 },
  optionBtn: { backgroundColor: '#2a2a4a', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#3a3a5a' },
  optionSelected: { borderColor: '#6C5CE7', backgroundColor: '#6C5CE720' },
  optionText: { fontSize: 14, color: '#fff' },
  textInput: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, color: '#fff',
    fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a4a',
    textAlignVertical: 'top',
  },
  btn: { backgroundColor: '#6C5CE7', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  feedbackCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#6C5CE7' },
  feedbackScore: { fontSize: 32, fontWeight: '700', color: '#6C5CE7' },
  feedbackText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  feedbackDetail: { fontSize: 13, color: '#fdcb6e', marginTop: 8 },
  resultCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 20 },
  resultScore: { fontSize: 64, fontWeight: '700', color: '#6C5CE7' },
  resultLabel: { fontSize: 18, color: '#94a3b8', marginTop: 4 },
  resultDetail: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
  listItem: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  listMeta: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
