import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/images/logo/Logo.PNG'
import roofPreviewVideo from '../assets/videos/roofpreview.MOV'
import highestEarnerImage from '../assets/images/general/HighestEarner1.jpeg'
import claimFormPdf from '../assets/media/Claim Form.pdf'
import './Dashboard.css'

export default function UserDashboard() {
  const { user, userRole, userProfile, signOut, getDisplayName } = useAuth()
  const navigate = useNavigate()
  // Initialize activeTab from localStorage or default to 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('userDashboardActiveTab')
    return savedTab || 'dashboard'
  })
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(null)
  const [lastQuizAttempt, setLastQuizAttempt] = useState(null)
  const [loadingQuizData, setLoadingQuizData] = useState(false)
  const [highestQuizScore, setHighestQuizScore] = useState(null)
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [userEarnings, setUserEarnings] = useState(null)

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('userDashboardActiveTab', activeTab)
  }, [activeTab])

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
      // Fetch last quiz attempt - use maybeSingle() to avoid 404 errors when no rows exist
      const { data: lastAttempt, error: lastError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastError) {
        // Only log if it's not a "not found" error
        if (lastError.code !== 'PGRST116' && lastError.code !== 'NOT_FOUND' && lastError.status !== 404) {
          console.error('Error fetching quiz attempt:', lastError)
        }
      } else if (lastAttempt) {
        setLastQuizAttempt(lastAttempt)
      }

      // Fetch highest quiz score - use maybeSingle() to avoid 404 errors when no rows exist
      const { data: allAttempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('score')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (attemptsError) {
        // Only log if it's not a "not found" error
        if (attemptsError.code !== 'PGRST116' && attemptsError.code !== 'NOT_FOUND' && attemptsError.status !== 404) {
          console.error('Error fetching highest score:', attemptsError)
        }
      } else if (allAttempts) {
        setHighestQuizScore(allAttempts.score)
      } else {
        setHighestQuizScore(null)
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

  const fetchLeaderboard = async () => {
    if (!user) return
    try {
      setLoadingLeaderboard(true)
      const currentMonth = new Date().toISOString().slice(0, 7) // Format: YYYY-MM
      
      // Fetch leaderboard for current month
      const { data: earningsData, error: earningsError } = await supabase
        .from('leaderboard_earnings')
        .select('amount, user_id')
        .eq('month_year', currentMonth)
        .order('amount', { ascending: false })

      if (earningsError) throw earningsError

      if (!earningsData || earningsData.length === 0) {
        setLeaderboardData([])
        setUserEarnings(0)
        return
      }

      // Fetch user profiles for all users in leaderboard
      const userIds = earningsData.map(entry => entry.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError)
      }

      // Create a map of user_id to profile
      const profilesMap = {}
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap[profile.id] = profile
        })
      }

      // Format leaderboard data
      const formatted = earningsData.map((entry, index) => {
        const profile = profilesMap[entry.user_id]
        return {
          rank: index + 1,
          userId: entry.user_id,
          name: profile?.first_name && profile?.last_name
            ? `${profile.first_name} ${profile.last_name}`
            : profile?.first_name || profile?.email || 'Unknown',
          amount: parseFloat(entry.amount) || 0,
          isCurrentUser: entry.user_id === user.id
        }
      })

      setLeaderboardData(formatted)

      // Get current user's earnings
      const userEntry = formatted.find(entry => entry.isCurrentUser)
      setUserEarnings(userEntry ? userEntry.amount : 0)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  // Fetch leaderboard when switching to leaderboard tab or dashboard tab
  useEffect(() => {
    if ((activeTab === 'leaderboard' || activeTab === 'dashboard') && user) {
      fetchLeaderboard()
    }
  }, [activeTab, user])

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
      question: 'What is the FIRST step when getting onto a roof for inspection?',
      options: [
        'A) Start marking hail hits on shingles',
        'B) Identify and document what the entire roof looks like',
        'C) Remove a damaged shingle',
        'D) Measure roof slope'
      ],
      correctAnswer: 'B'
    },
    {
      id: 2,
      question: 'Why should inspectors take photos from the rear, front, left, and right sides of the roof?',
      options: [
        'A) To meet marketing requirements',
        'B) To show how steep the roof is',
        'C) To clearly document roof layout and elevations',
        'D) To estimate roof age'
      ],
      correctAnswer: 'C'
    },
    {
      id: 3,
      question: 'Why is extensive photo documentation important during an inspection?',
      options: [
        'A) It speeds up production scheduling only',
        'B) It allows office staff and adjusters to understand what was observed',
        'C) It replaces the need for measurements',
        'D) It avoids having to meet an adjuster'
      ],
      correctAnswer: 'B'
    },
    {
      id: 4,
      question: 'Which roof components usually show hail damage most clearly?',
      options: [
        'A) Ridge shingles',
        'B) Underlayment',
        'C) Soft metals (vents, flashing, stacks)',
        'D) Attic insulation'
      ],
      correctAnswer: 'C'
    },
    {
      id: 5,
      question: 'Why might an inspector use chalk on a metal vent?',
      options: [
        'A) To clean dirt off',
        'B) To seal the vent',
        'C) To highlight hail impacts for photos',
        'D) To mark installation date'
      ],
      correctAnswer: 'C'
    },
    {
      id: 6,
      question: 'When documenting a dent in a vent, why is a tape measure used in the photo?',
      options: [
        'A) To confirm vent type',
        'B) To show the scale and size of hail damage',
        'C) To determine roof square count',
        'D) To measure roof pitch'
      ],
      correctAnswer: 'B'
    },
    {
      id: 7,
      question: 'Why should the LARGEST hail dent often be used as the main point of reference?',
      options: [
        'A) It looks better in photos',
        'B) It simplifies pricing',
        'C) It clearly demonstrates storm severity',
        'D) It determines roof age'
      ],
      correctAnswer: 'C'
    },
    {
      id: 8,
      question: 'Why is the way turtle vents are nailed important during inspection?',
      options: [
        'A) It affects attic airflow',
        'B) Replacing vents can damage shingles underneath due to nail holes',
        'C) It changes manufacturer warranties',
        'D) It improves wind resistance'
      ],
      correctAnswer: 'B'
    },
    {
      id: 9,
      question: 'When multiple vents exist on a roof, the best documentation practice is to:',
      options: [
        'A) Photograph only one vent',
        'B) Count and label the total number of vents',
        'C) Remove one vent for testing',
        'D) Estimate the number visually'
      ],
      correctAnswer: 'B'
    },
    {
      id: 10,
      question: 'What is the purpose of identifying the size and type of pipe stacks on a roof?',
      options: [
        'A) To calculate labor rates',
        'B) To document materials that may need replacement',
        'C) To determine insulation type',
        'D) To confirm code compliance only'
      ],
      correctAnswer: 'B'
    },
    {
      id: 11,
      question: 'Why do neoprene stacks often fail sooner than lead stacks?',
      options: [
        'A) They are thinner and degrade faster',
        'B) They attract more hail',
        'C) They are installed incorrectly by default',
        'D) They are decorative'
      ],
      correctAnswer: 'A'
    },
    {
      id: 12,
      question: 'If tar is present on roof components, why must it be addressed during repairs?',
      options: [
        'A) It improves sealing',
        'B) It prevents inspection photos',
        'C) It must be removed to properly replace or reset components',
        'D) It voids insurance coverage'
      ],
      correctAnswer: 'C'
    },
    {
      id: 13,
      question: 'What is a "square" in roof inspection terminology?',
      options: [
        'A) A single shingle',
        'B) A roof slope',
        'C) A 10 ft × 10 ft (100 sq ft) test area',
        'D) A bundle of shingles'
      ],
      correctAnswer: 'C'
    },
    {
      id: 14,
      question: 'Why is a square marked during hail inspection?',
      options: [
        'A) To estimate roof pitch',
        'B) To create a representative sample of damage on an elevation',
        'C) To identify installation errors',
        'D) To locate leaks'
      ],
      correctAnswer: 'B'
    },
    {
      id: 15,
      question: 'Why do inspectors often mark hail hits with dots instead of circles?',
      options: [
        'A) Dots are easier to see',
        'B) It saves chalk',
        'C) Some adjusters prefer not to have the roof fully circled',
        'D) Circles are inaccurate'
      ],
      correctAnswer: 'C'
    },
    {
      id: 16,
      question: 'What causes long-term functional damage when hail removes shingle granules?',
      options: [
        'A) Water immediately penetrates the roof',
        'B) UV exposure degrades the asphalt over time',
        'C) Wind resistance increases',
        'D) Shingles become heavier'
      ],
      correctAnswer: 'B'
    },
    {
      id: 17,
      question: 'Why is hail damage considered BOTH cosmetic and functional?',
      options: [
        'A) It changes roof color and slope',
        'B) It looks bad and shortens shingle lifespan',
        'C) It affects attic temperature and noise',
        'D) It causes instant leaks'
      ],
      correctAnswer: 'B'
    },
    {
      id: 18,
      question: 'What is the correct chronological order for determining repairability?',
      options: [
        'A) Repairability test → brilliance test → visual inspection',
        'B) Visual inspection → brilliance test → repairability test',
        'C) Brilliance test → repairability test → visual inspection',
        'D) Only a repairability test is needed'
      ],
      correctAnswer: 'B'
    },
    {
      id: 19,
      question: 'Why does the repairability test require lifting shingles multiple times?',
      options: [
        'A) To speed up installation',
        'B) To simulate a real repair process',
        'C) To increase roof damage intentionally',
        'D) To meet manufacturer requirements'
      ],
      correctAnswer: 'B'
    },
    {
      id: 20,
      question: 'What does tearing or creasing during a repairability test demonstrate?',
      options: [
        'A) Poor workmanship only',
        'B) The roof is repairable',
        'C) The roof is not genuinely repairable',
        'D) The roof needs cleaning'
      ],
      correctAnswer: 'C'
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
        .maybeSingle()

      if (error) throw error

      // Update last quiz attempt
      setLastQuizAttempt(data)
      // Update highest score if this is a new record
      if (!highestQuizScore || score > highestQuizScore) {
        setHighestQuizScore(score)
      }
      // Clear reset flag since user has submitted a new quiz
      localStorage.removeItem('quizResetFlag')
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
    setLastQuizAttempt(null) // Clear last attempt display so form starts fresh
    // Set flag to prevent auto-restoring answers on page refresh
    localStorage.setItem('quizResetFlag', 'true')
    // Note: All quiz attempts remain in the database - nothing is deleted
    // The highest score is calculated from all attempts in the database, so it's preserved
  }

  // Fetch quiz data when switching to quiz tab
  useEffect(() => {
    if (activeTab === 'quizzes' && user) {
      fetchLastQuizAttempt()
    }
  }, [activeTab, user])

  // Load last quiz attempt display when switching to quiz tab
  useEffect(() => {
    if (activeTab === 'quizzes') {
      const quizResetFlag = localStorage.getItem('quizResetFlag')
      
      // Only restore last attempt if user hasn't reset the quiz
      if (lastQuizAttempt && !quizSubmitted && !quizResetFlag) {
        // Show last attempt results
        setQuizSubmitted(true)
        setQuizScore(lastQuizAttempt.score)
        setQuizAnswers(lastQuizAttempt.answers || {})
      } else if (!lastQuizAttempt && !loadingQuizData) {
        // Reset if no previous attempt and data is loaded
        setQuizSubmitted(false)
        setQuizScore(null)
        setQuizAnswers({})
      } else if (quizResetFlag) {
        // User has reset the quiz - keep it fresh
        setQuizSubmitted(false)
        setQuizScore(null)
        setQuizAnswers({})
      }
    }
  }, [activeTab, lastQuizAttempt, loadingQuizData, quizSubmitted])

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
              <p className="welcome-instruction">
                If you haven't yet, watch the videos in the Video Library and take the quiz to test your knowledge.
              </p>
              <div className="dashboard-welcome-content">
                {/* Top 3 Leaderboard Snippet */}
                <div className="leaderboard-snippet">
                  <h3>Top 3 Leaderboard</h3>
                  {loadingLeaderboard ? (
                    <p>Loading...</p>
                  ) : leaderboardData.length > 0 ? (
                    <div className="leaderboard-snippet-list">
                      {leaderboardData.slice(0, 3).map((entry) => (
                        <div key={entry.userId} className="leaderboard-snippet-item">
                          <span className="snippet-rank">
                            {entry.rank === 1 && '🥇'}
                            {entry.rank === 2 && '🥈'}
                            {entry.rank === 3 && '🥉'}
                          </span>
                          <span className="snippet-name">{entry.name}</span>
                          <span className="snippet-amount">${entry.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No leaderboard data available.</p>
                  )}
                </div>

                {/* Roof Preview Video */}
                <div className="dashboard-video-container">
                  <h3>Roof Preview</h3>
                  <video
                    className="dashboard-preview-video"
                    controls
                    src={roofPreviewVideo}
                    type="video/quicktime"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>

                {/* Highest Earner Image */}
                <div className="dashboard-image-container">
                  <h3>Last Month's Highest Earner</h3>
                  <img
                    src={highestEarnerImage}
                    alt="Last Month's Highest Earner"
                    className="dashboard-featured-image"
                  />
                </div>
              </div>
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
        const MIN_PASS_SCORE = 75
        const hasPassed = highestQuizScore !== null && highestQuizScore >= MIN_PASS_SCORE
        
        return (
          <div className="dashboard-card">
            <h2 className="quiz-title">Training Quiz</h2>
            <p className="quiz-description">
              Answer all questions below. Once you've completed all questions, click "Submit Quiz" at the bottom to see your score.
            </p>
            
            {/* Highest Score Display */}
            <div className={`quiz-highest-score-display ${hasPassed ? 'passed' : 'not-passed'}`}>
              <div className="highest-score-content">
                <div className="highest-score-info">
                  <h3>Your Highest Score</h3>
                  {highestQuizScore !== null ? (
                    <div className="score-status">
                      <span className="highest-score-value">{highestQuizScore}%</span>
                      <span className={`pass-status ${hasPassed ? 'passed' : 'not-passed'}`}>
                        {hasPassed ? '✓ Passed' : '✗ Not Passed'}
                      </span>
                    </div>
                  ) : (
                    <p className="no-attempts">No quiz attempts yet</p>
                  )}
                </div>
                <div className="pass-requirement">
                  <p className="requirement-text">Minimum score to pass: <strong>{MIN_PASS_SCORE}%</strong></p>
                </div>
              </div>
            </div>

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
            <h2>Monthly Leaderboard</h2>
            <p className="leaderboard-month">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            {loadingLeaderboard ? (
              <p>Loading leaderboard...</p>
            ) : (
              <>
                {userEarnings !== null && (
                  <div className="user-earnings-display">
                    <h3>Your Earnings: ${userEarnings.toFixed(2)}</h3>
                  </div>
                )}
                {leaderboardData.length > 0 ? (
                  <div className="leaderboard-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Name</th>
                          <th>Earnings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.map((entry) => (
                          <tr
                            key={entry.userId}
                            className={entry.isCurrentUser ? 'current-user-row' : ''}
                          >
                            <td className="rank-cell">
                              {entry.rank === 1 && '🥇'}
                              {entry.rank === 2 && '🥈'}
                              {entry.rank === 3 && '🥉'}
                              {entry.rank > 3 && entry.rank}
                            </td>
                            <td>{entry.name}</td>
                            <td className="earnings-cell">${entry.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No leaderboard data available for this month.</p>
                )}
              </>
            )}
          </div>
        )
      case 'downloads':
        return (
          <div className="dashboard-card">
            <h2>Downloads</h2>
            <div className="downloads-list">
              <div className="download-item">
                <div className="download-info">
                  <h3>Sample claim form</h3>
                  <p className="download-description">Download the sample claim form PDF</p>
                </div>
                <a
                  href={claimFormPdf}
                  download="Sample Claim Form.pdf"
                  className="download-button"
                >
                  Download
                </a>
              </div>
            </div>
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

