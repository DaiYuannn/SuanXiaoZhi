

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './styles.module.css';
import { startRiskAssessment, submitRiskAssessment } from '../../api/endpoints';

interface RiskAssessmentAnswers {
  age?: string;
  experience?: string;
  income?: string;
  goal?: string;
  loss?: string;
  timeframe?: string;
  knowledge?: string;
  burden?: string;
  proportion?: string;
  style?: string;
}

const RiskAssessmentPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);
  const [answers, setAnswers] = useState<RiskAssessmentAnswers>({});
  const [serverMode, setServerMode] = useState(false);
  const [serverAssessmentId, setServerAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '金智通 - 风险测评';
    return () => { 
      document.title = originalTitle; 
    };
  }, []);

  // 获取问题名称（本地回退）
  const getQuestionName = (questionNumber: number): keyof RiskAssessmentAnswers => {
    if (serverMode) return (`q_${questionNumber}` as unknown) as keyof RiskAssessmentAnswers;
    const questionNames: Record<number, keyof RiskAssessmentAnswers> = {
      1: 'age',
      2: 'experience',
      3: 'income',
      4: 'goal',
      5: 'loss',
      6: 'timeframe',
      7: 'knowledge',
      8: 'burden',
      9: 'proportion',
      10: 'style'
    };
    return questionNames[questionNumber];
  };

  // 处理选项选择
  const handleOptionSelect = (questionNumber: number, value: string) => {
    const questionName = getQuestionName(questionNumber);
    setAnswers(prev => ({
      ...prev,
      [questionName]: value
    }));
  };

  // 上一题
  const handlePreviousQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  // 下一题
  const handleNextQuestion = () => {
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    navigate(-1);
  };

  // 提交测评
  const handleSubmitAssessment = async () => {
    // 检查是否所有问题都已回答
    const allAnswered = Object.keys(answers).length === totalQuestions;
    
    if (!allAnswered) {
      alert('请完成所有问题后再提交');
      return;
    }

    if (serverMode && serverAssessmentId) {
      try {
        // 将答案映射到后端格式（基于动态题目）
        const mapped: Array<{ qid: string; optionId: string }> = [];
        for (const q of questions) {
          const v = (answers as any)[q.name];
          if (!v) continue;
          const opt = q.options.find((o: any) => o.value === v) || q.options[0];
          mapped.push({ qid: q.id, optionId: opt.id });
        }
        const r = await submitRiskAssessment(serverAssessmentId, mapped);
        alert(`测评完成！后端计算风险等级：${r.data.level}`);
        handleCloseModal();
        return;
      } catch (e: any) {
        // 失败则回退本地计算
      }
    }

    const riskLevel = calculateRiskLevel(answers);
    alert(`测评完成！您的风险等级为：${riskLevel}`);
    handleCloseModal();
  };

  // 计算风险等级
  const calculateRiskLevel = (answers: RiskAssessmentAnswers): string => {
    let score = 0;

    // 年龄评分
    const ageScores: Record<string, number> = {
      '18-25': 5,
      '26-35': 4, 
      '36-45': 3,
      '46-55': 2,
      '56+': 1
    };
    score += ageScores[answers.age || ''] || 0;

    // 投资经验评分
    const experienceScores: Record<string, number> = {
      'none': 1,
      'beginner': 2,
      'intermediate': 3,
      'advanced': 4,
      'expert': 5
    };
    score += experienceScores[answers.experience || ''] || 0;

    // 收入评分
    const incomeScores: Record<string, number> = {
      '5k-below': 1,
      '5k-10k': 2,
      '10k-20k': 3,
      '20k-50k': 4,
      '50k-above': 5
    };
    score += incomeScores[answers.income || ''] || 0;

    // 投资目标评分
    const goalScores: Record<string, number> = {
      'preserve': 1,
      'growth': 3,
      'wealth': 4,
      'speculate': 5
    };
    score += goalScores[answers.goal || ''] || 0;

    // 亏损承受能力评分
    const lossScores: Record<string, number> = {
      '0': 1,
      '5%': 2,
      '10%': 3,
      '20%': 4,
      '30%+': 5
    };
    score += lossScores[answers.loss || ''] || 0;

    // 投资期限评分
    const timeframeScores: Record<string, number> = {
      'short': 1,
      'medium-short': 2,
      'medium': 3,
      'medium-long': 4,
      'long': 5
    };
    score += timeframeScores[answers.timeframe || ''] || 0;

    // 投资知识评分
    const knowledgeScores: Record<string, number> = {
      'basic': 1,
      'intermediate': 3,
      'advanced': 4,
      'expert': 5
    };
    score += knowledgeScores[answers.knowledge || ''] || 0;

    // 家庭负担评分
    const burdenScores: Record<string, number> = {
      'heavy': 1,
      'medium': 2,
      'light': 4,
      'none': 5
    };
    score += burdenScores[answers.burden || ''] || 0;

    // 投资比例评分
    const proportionScores: Record<string, number> = {
      '10%below': 1,
      '10-30%': 2,
      '30-50%': 3,
      '50-70%': 4,
      '70%above': 5
    };
    score += proportionScores[answers.proportion || ''] || 0;

    // 投资风格评分
    const styleScores: Record<string, number> = {
      'conservative': 1,
      'stable': 2,
      'growth': 4,
      'aggressive': 5
    };
    score += styleScores[answers.style || ''] || 0;

    // 确定风险等级
    if (score <= 15) {
      return '保守型';
    } else if (score <= 25) {
      return '稳健型';
    } else if (score <= 35) {
      return '成长型';
    } else {
      return '积极型';
    }
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      } else if (e.key === 'ArrowLeft' && currentQuestion > 1) {
        handlePreviousQuestion();
      } else if (e.key === 'ArrowRight' && currentQuestion < totalQuestions) {
        const currentQuestionName = getQuestionName(currentQuestion);
        if (answers[currentQuestionName] !== undefined) {
          handleNextQuestion();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentQuestion, answers]);

  // 检查当前问题是否已回答
  const isCurrentQuestionAnswered = () => {
    const currentQuestionName = getQuestionName(currentQuestion);
    return answers[currentQuestionName] !== undefined;
  };

  // 渲染选项
  const renderOptions = (questionNumber: number, options: Array<{ value: string; label: string }>) => {
    const questionName = getQuestionName(questionNumber);
    const selectedValue = answers[questionName];

    return options.map((option) => (
      <label 
        key={option.value}
        className={`${styles.optionCard} ${selectedValue === option.value ? styles.selected : ''} block p-4 rounded-lg cursor-pointer`}
      >
        <input 
          type="radio" 
          name={questionName} 
          value={option.value} 
          className="hidden"
          checked={selectedValue === option.value}
          onChange={() => handleOptionSelect(questionNumber, option.value)}
        />
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full flex items-center justify-center">
            <div className={`w-3 h-3 bg-primary rounded-full ${selectedValue === option.value ? '' : 'hidden'}`}></div>
          </div>
          <span className="text-text-primary">{option.label}</span>
        </div>
      </label>
    ));
  };

  // 默认问题配置（本地回退）
  const defaultQuestions = [
    {
      number: 1,
      title: '1. 您的年龄范围是？',
      options: [
        { value: '18-25', label: '18-25岁' },
        { value: '26-35', label: '26-35岁' },
        { value: '36-45', label: '36-45岁' },
        { value: '46-55', label: '46-55岁' },
        { value: '56+', label: '56岁以上' }
      ]
    },
    {
      number: 2,
      title: '2. 您的投资经验如何？',
      options: [
        { value: 'none', label: '无投资经验' },
        { value: 'beginner', label: '1年以内投资经验' },
        { value: 'intermediate', label: '1-3年投资经验' },
        { value: 'advanced', label: '3-5年投资经验' },
        { value: 'expert', label: '5年以上投资经验' }
      ]
    },
    {
      number: 3,
      title: '3. 您的月收入水平是？',
      options: [
        { value: '5k-below', label: '5000元以下' },
        { value: '5k-10k', label: '5000-10000元' },
        { value: '10k-20k', label: '10000-20000元' },
        { value: '20k-50k', label: '20000-50000元' },
        { value: '50k-above', label: '50000元以上' }
      ]
    },
    {
      number: 4,
      title: '4. 您的投资目标是什么？',
      options: [
        { value: 'preserve', label: '保值增值，稳健收益' },
        { value: 'growth', label: '资产增值，追求较高收益' },
        { value: 'wealth', label: '财富快速增长，追求高收益' },
        { value: 'speculate', label: '短期投机，追求最大收益' }
      ]
    },
    {
      number: 5,
      title: '5. 您能接受的最大亏损是多少？',
      options: [
        { value: '0', label: '不能承受任何亏损' },
        { value: '5%', label: '5%以内的亏损' },
        { value: '10%', label: '10%以内的亏损' },
        { value: '20%', label: '20%以内的亏损' },
        { value: '30%+', label: '30%以上的亏损也能接受' }
      ]
    },
    {
      number: 6,
      title: '6. 您的投资期限是多久？',
      options: [
        { value: 'short', label: '3个月以内' },
        { value: 'medium-short', label: '3-12个月' },
        { value: 'medium', label: '1-3年' },
        { value: 'medium-long', label: '3-5年' },
        { value: 'long', label: '5年以上' }
      ]
    },
    {
      number: 7,
      title: '7. 您的投资知识水平如何？',
      options: [
        { value: 'basic', label: '基础了解' },
        { value: 'intermediate', label: '一般了解' },
        { value: 'advanced', label: '比较了解' },
        { value: 'expert', label: '非常了解' }
      ]
    },
    {
      number: 8,
      title: '8. 您的家庭负担情况如何？',
      options: [
        { value: 'heavy', label: '家庭负担较重' },
        { value: 'medium', label: '家庭负担一般' },
        { value: 'light', label: '家庭负担较轻' },
        { value: 'none', label: '无家庭负担' }
      ]
    },
    {
      number: 9,
      title: '9. 您的投资金额占总资产的比例？',
      options: [
        { value: '10%below', label: '10%以下' },
        { value: '10-30%', label: '10-30%' },
        { value: '30-50%', label: '30-50%' },
        { value: '50-70%', label: '50-70%' },
        { value: '70%above', label: '70%以上' }
      ]
    },
    {
      number: 10,
      title: '10. 您更倾向于哪种投资风格？',
      options: [
        { value: 'conservative', label: '保守型：追求稳定，厌恶风险' },
        { value: 'stable', label: '稳健型：平衡风险与收益' },
        { value: 'growth', label: '成长型：适度承担风险获取收益' },
        { value: 'aggressive', label: '积极型：愿意承担高风险追求高收益' }
      ]
    }
  ];

  const progress = (currentQuestion / totalQuestions) * 100;

  // 初始化：尝试加载后端题目
  useEffect(() => {
    (async () => {
      try {
        const r = await startRiskAssessment();
        const data = r.data;
        setServerAssessmentId(data.assessmentId);
        // 将后端题目映射到当前渲染结构
        const mapped = (data.questions || []).map((q: any, idx: number) => ({
          id: q.id,
          number: idx + 1,
          name: `q_${idx+1}`,
          title: `${idx+1}. ${q.text}`,
          options: (q.options || []).map((o: any) => ({ id: o.id, value: o.id, label: o.text }))
        }));
        if (mapped.length) {
          setQuestions(mapped);
          setTotalQuestions(mapped.length);
          setServerMode(true);
        } else {
          setQuestions(defaultQuestions);
          setTotalQuestions(defaultQuestions.length);
        }
      } catch {
        setQuestions(defaultQuestions);
        setTotalQuestions(defaultQuestions.length);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* 模态弹窗背景 */}
      <div 
        className={`fixed inset-0 ${styles.modalBackdrop} flex items-center justify-center z-50 p-4`}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseModal();
          }
        }}
      >
        {/* 风险测评弹窗 */}
        <div className={`${styles.gradientCard} rounded-2xl shadow-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto ${styles.fadeIn}`}>
          {/* 弹窗头部 */}
          <div className="flex items-center justify-between p-6 border-b border-border-light">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 ${styles.gradientBg} rounded-lg flex items-center justify-center`}>
                <i className="fas fa-shield-alt text-white text-lg"></i>
              </div>
              <h2 className="text-xl font-bold text-text-primary">风险测评</h2>
            </div>
            <button 
              onClick={handleCloseModal}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-all"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>

          {/* 弹窗内容区 */}
          <div className="p-6">
            {/* 进度条 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary">测评进度</span>
                <span className="text-sm font-medium text-primary">{currentQuestion}/{totalQuestions}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`${styles.progressBar} h-2 rounded-full`} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* 测评问卷 */}
            <form className="space-y-6">
              {questions.map((question) => (
                <div 
                  key={question.number}
                  className={`${styles.questionContainer} ${currentQuestion !== question.number ? styles.questionHidden : ''}`}
                >
                  <h3 className="text-lg font-semibold text-text-primary mb-4">{question.title}</h3>
                  <div className="space-y-3">
                    {renderOptions(question.number, question.options)}
                  </div>
                </div>
              ))}
            </form>

            {/* 操作按钮区 */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border-light">
              <button 
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 1}
                className="px-6 py-2 text-text-secondary border border-border-light rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-chevron-left mr-2"></i>
                上一题
              </button>
              {currentQuestion < totalQuestions ? (
                <button 
                  onClick={handleNextQuestion}
                  disabled={!isCurrentQuestionAnswered()}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一题
                  <i className="fas fa-chevron-right ml-2"></i>
                </button>
              ) : (
                <button 
                  onClick={handleSubmitAssessment}
                  className={`px-6 py-2 ${styles.gradientBg} text-white rounded-lg hover:shadow-lg transition-all`}
                >
                  <i className="fas fa-check mr-2"></i>
                  提交测评
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAssessmentPage;

