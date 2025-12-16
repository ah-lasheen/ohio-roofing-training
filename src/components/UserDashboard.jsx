import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/images/logo/Logo.PNG'
import './Dashboard.css'

export default function UserDashboard() {
  const { user, userRole, userProfile, signOut, getDisplayName } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(null)
  const [lastQuizAttempt, setLastQuizAttempt] = useState(null)
  const [loadingQuizData, setLoadingQuizData] = useState(false)

  // Redirect if role changes to admin
  useEffect(() => {
    if (userRole === 'admin') {
      navigate('/admin', { replace: true })
    }
  }, [userRole, navigate])

  const fetchLastQuizAttempt = async () => {
    if (!user) return
    try {
      setLoadingQuizData(true)
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error fetching quiz attempt:', error)
      } else if (data) {
        setLastQuizAttempt(data)
      }
    } catch (error) {
      console.error('Error fetching quiz attempt:', error)
    } finally {
      setLoadingQuizData(false)
    }
  }

  // Fetch last quiz attempt when user is available
  useEffect(() => {
    if (user) {
      fetchLastQuizAttempt()
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
      // Navigate anyway
      navigate('/login', { replace: true })
    }
  }

  const getRoleDisplay = () => {
    if (!userRole) return 'Loading...'
    return userRole === 'admin' ? 'Admin' : 'Trainee'
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'video-library', label: 'Video Library' },
    { id: 'quizzes', label: 'Quizzes' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'downloads', label: 'Downloads' },
    { id: 'settings', label: 'Settings' },
  ]

  const videos = [
    {
      id: 'IVNK5gkVq2Q',
      title: 'Sales Video',
      caption: 'Sales Video'
    },
    {
      id: 'zXLGnIpa2vA',
      title: 'Inspection',
      caption: 'Inspection'
    },
    {
      id: 'SeGxoy2bazc',
      title: 'Repair Attempt',
      caption: 'Repair Attempt'
    },
    {
      id: 'bx48qPlaGvE',
      title: 'How to Sell',
      caption: 'How to Sell'
    }
  ]

  const quizQuestions = [
    {
      id: 1,
      question: '"Work like someone is trying to take it all away from you" primarily means:',
      options: [
        'A) Avoid competition by switching industries often',
        'B) Outwork others and stay more prepared than competitors',
        'C) Focus only on networking',
        'D) Let your team handle the hard work'
      ],
      correctAnswer: 'B'
    },
    {
      id: 2,
      question: 'The #1 reasons people fail (video 1) are:',
      options: [
        'A) Bad luck and bad timing',
        'B) Lack of money and lack of connections',
        'C) Lack of brains and lack of effort',
        'D) Too much competition and too many rules'
      ],
      correctAnswer: 'C'
    },
    {
      id: 3,
      question: 'In business, you are "never in a vacuum" because:',
      options: [
        'A) Customers always prefer the cheapest option',
        'B) There will almost always be competition',
        'C) Marketing doesn\'t work anymore',
        'D) Employees are the main problem'
      ],
      correctAnswer: 'B'
    },
    {
      id: 4,
      question: 'You\'re likely to lose when:',
      options: [
        'A) Your competitors know less than you do',
        'B) You have a nicer website than others',
        'C) Competitors know more about the business/customers than you do',
        'D) You have too many product options'
      ],
      correctAnswer: 'C'
    },
    {
      id: 5,
      question: 'The questions you ask reveal most about your:',
      options: [
        'A) Personality type',
        'B) Preparation and knowledge',
        'C) Social status',
        'D) Creativity'
      ],
      correctAnswer: 'B'
    },
    {
      id: 6,
      question: 'Asking "basic questions you should\'ve already known" tends to:',
      options: [
        'A) Impress experienced entrepreneurs',
        'B) Disqualify you more than almost anything else',
        'C) Prove you\'re humble',
        'D) Make you seem confident'
      ],
      correctAnswer: 'B'
    },
    {
      id: 7,
      question: 'Cuban says the greatest source of "paranoia" should be:',
      options: [
        'A) New employees',
        'B) Social media',
        'C) Knowledge and learning',
        'D) Customers\' moods'
      ],
      correctAnswer: 'C'
    },
    {
      id: 8,
      question: 'A "healthy dose of paranoia" means you should:',
      options: [
        'A) Ignore competitors to stay focused',
        'B) Assume everyone is cheating',
        'C) Anticipate how others could beat you before they do',
        'D) Only copy what others do'
      ],
      correctAnswer: 'C'
    },
    {
      id: 9,
      question: 'Cuban\'s view on "drop out of school" advice is:',
      options: [
        'A) It\'s always correct',
        'B) It\'s correct for most people',
        'C) People who say that are idiots',
        'D) It depends on your GPA'
      ],
      correctAnswer: 'C'
    },
    {
      id: 10,
      question: 'Understanding accounting/finance matters because:',
      options: [
        'A) It replaces sales skills',
        'B) It\'s the language of business and affects decisions (profit vs cash, etc.)',
        'C) It guarantees funding',
        'D) It makes competition irrelevant'
      ],
      correctAnswer: 'B'
    },
    {
      id: 11,
      question: 'The most important thing Cuban says he learned in college was:',
      options: [
        'A) How to network',
        'B) How to market',
        'C) How to learn',
        'D) How to code'
      ],
      correctAnswer: 'C'
    },
    {
      id: 12,
      question: 'For growing a business faster, the key first step is:',
      options: [
        'A) Perfecting the product before selling',
        'B) Getting the first customer commitment',
        'C) Hiring a big sales team immediately',
        'D) Raising money before testing demand'
      ],
      correctAnswer: 'B'
    },
    {
      id: 13,
      question: 'Before doing a detailed roof damage inspection, you should first:',
      options: [
        'A) Start circling hail hits',
        'B) Identify/document what the roof looks like from multiple sides/angles',
        'C) Remove shingles to check underneath',
        'D) Only inspect the front elevation'
      ],
      correctAnswer: 'B'
    },
    {
      id: 14,
      question: '"Picture, picture, picture" and labeling roof sides (front/rear/left/right) is mainly to:',
      options: [
        'A) Make the roof look worse',
        'B) Ensure anyone reviewing understands what you saw and where it was',
        'C) Avoid needing measurements',
        'D) Replace the need for written notes'
      ],
      correctAnswer: 'B'
    },
    {
      id: 15,
      question: 'Soft metals are checked early because:',
      options: [
        'A) They\'re easiest to replace',
        'B) They show the most visible signs of hail damage',
        'C) They determine the policy type',
        'D) They stop leaks instantly'
      ],
      correctAnswer: 'B'
    },
    {
      id: 16,
      question: 'A good way to visually reveal hail hits on vents is to:',
      options: [
        'A) Spray water and wait',
        'B) Use chalk and rub it across the vent to highlight impacts',
        'C) Paint the vent',
        'D) Kick debris off the vent'
      ],
      correctAnswer: 'B'
    },
    {
      id: 17,
      question: 'Using a tape measure on a dent is mainly to:',
      options: [
        'A) Prove the roofer owns a tape measure',
        'B) Show the size/scale of the damage clearly in photos',
        'C) Determine roof age',
        'D) Count total shingles'
      ],
      correctAnswer: 'B'
    },
    {
      id: 18,
      question: 'The vent nailing detail matters because:',
      options: [
        'A) It changes the roof pitch',
        'B) Replacing the vent can require addressing shingles underneath due to nail holes',
        'C) It voids all warranties automatically',
        'D) It guarantees full roof replacement'
      ],
      correctAnswer: 'B'
    },
    {
      id: 19,
      question: 'The correct order for determining repairability is:',
      options: [
        'A) True repairability test → brilliance test → visual inspection',
        'B) Visual inspection → brilliance test → true repairability test',
        'C) Brilliance test → visual inspection → true repairability test',
        'D) Only the brilliance test is needed'
      ],
      correctAnswer: 'B'
    },
    {
      id: 20,
      question: 'A "ghost product" tactic works mainly because it:',
      options: [
        'A) Adds pressure by raising prices',
        'B) Builds trust by acting in the buyer\'s interest (often giving away low-margin items)',
        'C) Avoids explaining how to use products',
        'D) Confuses the buyer into buying more'
      ],
      correctAnswer: 'B'
    }
  ]

  const handleQuizAnswerChange = (questionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleQuizSubmit = async () => {
    if (!user) return
    
    let correct = 0
    quizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correctAnswer) {
        correct++
      }
    })
    const score = Math.round((correct / quizQuestions.length) * 100)
    
    // Save quiz attempt to database
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: user.id,
          score: score,
          correct_answers: correct,
          total_questions: quizQuestions.length,
          answers: quizAnswers
        })
        .select()
        .single()

      if (error) throw error

      // Update last quiz attempt
      setLastQuizAttempt(data)
    } catch (error) {
      console.error('Error saving quiz attempt:', error)
      // Still show the score even if save fails
    }

    setQuizScore(score)
    setQuizSubmitted(true)
  }

  const handleRetakeQuiz = () => {
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(null)
  }

  // Load last quiz attempt when switching to quiz tab
  useEffect(() => {
    if (activeTab === 'quizzes') {
      if (lastQuizAttempt && !quizSubmitted) {
        // Show last attempt results
        setQuizSubmitted(true)
        setQuizScore(lastQuizAttempt.score)
        setQuizAnswers(lastQuizAttempt.answers || {})
      } else if (!lastQuizAttempt && !loadingQuizData) {
        // Reset if no previous attempt and data is loaded
        setQuizSubmitted(false)
        setQuizScore(null)
        setQuizAnswers({})
      }
    }
  }, [activeTab, lastQuizAttempt, loadingQuizData])

  const getCurrentPageTitle = () => {
    const currentTab = tabs.find(tab => tab.id === activeTab)
    return currentTab ? currentTab.label : 'Dashboard'
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <div className="dashboard-card">
              <h2>Your Profile</h2>
              {userProfile?.first_name && userProfile?.last_name && (
                <p><strong>Name:</strong> {userProfile.first_name} {userProfile.last_name}</p>
              )}
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Role:</strong> {getRoleDisplay()}</p>
            </div>
            
            <div className="dashboard-card">
              <h2>Welcome!</h2>
              <p>This is your user dashboard. You can add more content here based on your application needs.</p>
            </div>
          </>
        )
      case 'video-library':
        return (
          <div className="dashboard-card">
            <p className="video-library-intro">
              Please take notes on each video as there will be a follow-up quiz to test your understanding of the material.
            </p>
            <div className="video-grid">
              {videos.map((video) => (
                <div key={video.id} className="video-item">
                  <div className="video-thumbnail">
                    <iframe
                      src={`https://www.youtube.com/embed/${video.id}`}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <p className="video-caption">{video.caption}</p>
                </div>
              ))}
            </div>
            <div className="video-library-footer">
              <button 
                className="proceed-to-quiz-button"
                onClick={() => setActiveTab('quizzes')}
              >
                Proceed to Quiz
              </button>
            </div>
          </div>
        )
      case 'quizzes':
        return (
          <div className="dashboard-card">
            <h2 className="quiz-title">Training Quiz</h2>
            <p className="quiz-description">
              Answer all questions below. Once you've completed all questions, click "Submit Quiz" at the bottom to see your score.
            </p>
            <div className="quiz-container">
              {quizQuestions.map((q) => (
                <div key={q.id} className="quiz-question">
                  <div className="question-header">
                    <span className="question-number">Question {q.id}</span>
                    {quizSubmitted && (
                      <span className={`answer-indicator ${quizAnswers[q.id] === q.correctAnswer ? 'correct' : 'incorrect'}`}>
                        {quizAnswers[q.id] === q.correctAnswer ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    )}
                  </div>
                  <p className="question-text">{q.question}</p>
                  <div className="quiz-options">
                    {q.options.map((option, index) => {
                      const optionLetter = String.fromCharCode(65 + index) // A, B, C, D
                      const isSelected = quizAnswers[q.id] === optionLetter
                      const isCorrect = optionLetter === q.correctAnswer
                      const showResult = quizSubmitted && isCorrect
                      return (
                        <label
                          key={index}
                          className={`quiz-option ${isSelected ? 'selected' : ''} ${quizSubmitted && isSelected && !isCorrect ? 'wrong' : ''} ${showResult ? 'correct-answer' : ''}`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={optionLetter}
                            checked={isSelected}
                            onChange={() => handleQuizAnswerChange(q.id, optionLetter)}
                            disabled={quizSubmitted}
                          />
                          <span>{option}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {!quizSubmitted ? (
              <div className="quiz-submit-container">
                <button
                  className="submit-quiz-button"
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(quizAnswers).length !== quizQuestions.length}
                >
                  Submit Quiz
                </button>
                {Object.keys(quizAnswers).length !== quizQuestions.length && (
                  <p className="quiz-warning">
                    Please answer all {quizQuestions.length} questions before submitting.
                  </p>
                )}
              </div>
            ) : (
              <div className="quiz-results">
                <div className="score-display">
                  <h3>Your Score: {quizScore}%</h3>
                  <p className="score-detail">
                    You got {Object.values(quizAnswers).filter((ans, idx) => ans === quizQuestions[idx].correctAnswer).length} out of {quizQuestions.length} questions correct.
                  </p>
                  {lastQuizAttempt && (
                    <p className="quiz-attempt-info">
                      Last taken: {new Date(lastQuizAttempt.created_at).toLocaleDateString()} at {new Date(lastQuizAttempt.created_at).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <div className="quiz-retake-container">
                  <button
                    className="retake-quiz-button"
                    onClick={handleRetakeQuiz}
                  >
                    Retake Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      case 'leaderboard':
        return (
          <div className="dashboard-card">
            <p>Leaderboard rankings will appear here.</p>
          </div>
        )
      case 'downloads':
        return (
          <div className="dashboard-card">
            <p>Downloadable resources will appear here.</p>
          </div>
        )
      case 'settings':
        return (
          <div className="dashboard-card">
            <p>Account settings will appear here.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-header-left"></div>
        <div className="dashboard-header-center">
          <Link to="/dashboard" className="dashboard-logo-link">
            <img src={logo} alt="Company Logo" className="dashboard-logo-img" />
          </Link>
        </div>
        <div className="header-actions">
          <span>Welcome, {getDisplayName()}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <nav className="dashboard-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      
      <main className="dashboard-content">
        <h1 className="page-title">{getCurrentPageTitle()}</h1>
        {renderTabContent()}
      </main>
    </div>
  )
}

