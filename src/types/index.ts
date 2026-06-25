// DailyReminder 类型定义

export interface Task {
  id: string;
  name: string;
  time: string;
  repeat: '每天' | '工作日' | '仅一次';
  done: boolean;
  status: '未进行' | '进行中' | '已完成';
  note: string;
  priority: 'urgent_important' | 'important' | 'urgent' | 'normal';
  group: string;
  deadline: string;
  start_date: string;
  created: string;
  completed_at: string | null;
  parent_id: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'normal' | 'low';
  category: string;
  created_at: string;
  completed_at: string | null;
  subtasks: SubTask[];
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'fill_blank' | 'short_answer';
  content: string;
  options?: string[];
  correct_answer: string;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;
  tags?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  source_date: string;
  questions: QuizQuestion[];
  question_count: number;
  created_at: string;
  status: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  answers: { question_id: string; answer: string }[];
  total_score: number;
  max_score: number;
  earned_score: number;
  time_spent_seconds: number;
  completed_at: string;
  scores: QuestionScore[];
}

export interface QuestionScore {
  question_id: string;
  question_type: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
  ai_feedback?: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  difficulty: string;
  expected_points: string[];
  reference_links: { title: string; url: string }[];
  tags?: string[];
}

export interface InterviewSession {
  id: string;
  questions: InterviewQuestion[];
  current_index: number;
  answers: InterviewAnswer[];
  scores: InterviewScore[];
  started_at: string;
  completed_at?: string;
  status: string;
  summary?: InterviewSummary;
}

export interface InterviewAnswer {
  question_id: string;
  question: string;
  answer: string;
  score: InterviewScore;
  answered_at: string;
}

export interface InterviewScore {
  accuracy: number;
  completeness: number;
  depth: number;
  total: number;
  feedback: string;
  key_points_missed: string[];
}

export interface InterviewSummary {
  overall_score: number;
  grade: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
}

export interface FeynmanSession {
  id: string;
  notes_content: string;
  phase: 'retelling' | 'quiz' | 'completed';
  retelling: string;
  retelling_feedback?: FeynmanFeedback;
  questions: FeynmanQuestion[];
  answers: FeynmanAnswer[];
  scores: FeynmanScore[];
  current_index: number;
  started_at: string;
  completed_at?: string;
  status: string;
}

export interface FeynmanQuestion {
  id: string;
  content: string;
  type: string;
  correct_answer: string;
  explanation: string;
  tags?: string[];
}

export interface FeynmanAnswer {
  question_id: string;
  question: string;
  answer: string;
  score: FeynmanScore;
  answered_at: string;
}

export interface FeynmanScore {
  correct: boolean;
  score: number;
  feedback: string;
  key_point: string;
}

export interface FeynmanFeedback {
  clarity: number;
  accuracy: number;
  completeness: number;
  total: number;
  strengths: string[];
  weaknesses: string[];
  missing_points: string[];
}

export interface ReviewItem {
  key: string;
  question: QuizQuestion;
  stage: number;
  due_date: string;
  wrong_count: number;
  right_count: number;
  first_seen_at: string;
  last_wrong_at: string;
  last_review_at?: string;
  source_title: string;
}

export interface RecordItem {
  id: string;
  type: string;
  value: number;
  date: string;
  note: string;
  created: string;
}

export interface RecordType {
  name: string;
  unit: string;
  category: string;
}

export interface AppConfig {
  claude_api_key: string;
  claude_base_url: string;
  claude_sonnet_model: string;
  claude_haiku_model: string;
  feishu_app_id: string;
  feishu_app_secret: string;
  feishu_wiki_node_token: string;
  feishu_sync_enabled: boolean;
  feishu_doc_daily: string;
  feishu_doc_quiz: string;
  feishu_doc_interview: string;
  feishu_doc_feynman: string;
  feishu_doc_review: string;
  sound_enabled: boolean;
  remind_interval_minutes: number;
  tongyi_url: string;
  external_app_path: string;
}

export type RootTabParamList = {
  home: undefined;
  learn: undefined;
  records: undefined;
  settings: undefined;
};
