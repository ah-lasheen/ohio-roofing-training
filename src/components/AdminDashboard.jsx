import React, { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import logo from '../assets/images/logo/Logo.PNG'
import './Dashboard.css'

export default function AdminDashboard() {
  const { user, userRole, signOut, getDisplayName } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, role, created_at')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch all quiz attempts to calculate highest scores
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_attempts')
        .select('user_id, score')

      if (quizError) {
        console.error('Error fetching quiz attempts:', quizError)
      }

      // Create a map of user_id to highest score
      const highestScores = {}
      if (quizData) {
        quizData.forEach(attempt => {
          const userId = attempt.user_id
          if (!highestScores[userId] || attempt.score > highestScores[userId]) {
            highestScores[userId] = attempt.score
          }
        })
      }

      // Add highest score to each user
      const usersWithScores = (usersData || []).map(user => ({
        ...user,
        highestScore: highestScores[user.id] !== undefined ? highestScores[user.id] : null
      }))

      setUsers(usersWithScores)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserDisplayName = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user.first_name) {
      return user.first_name
    }
    return user.email || 'N/A'
  }

  const filteredUsers = users.filter((usr) => {
    if (!searchQuery.trim()) return true
    const searchLower = searchQuery.toLowerCase()
    const displayName = getUserDisplayName(usr).toLowerCase()
    const email = (usr.email || '').toLowerCase()
    return displayName.includes(searchLower) || email.includes(searchLower)
  })

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


  return (
    <div className="dashboard-container">
      <header className="dashboard-header admin-dashboard-header">
        <div className="dashboard-header-left">
          <Link to="/dashboard" className="dashboard-logo-link admin-logo-link">
            <img src={logo} alt="Company Logo" className="dashboard-logo-img" />
          </Link>
        </div>
        <div className="dashboard-header-center"></div>
        <div className="header-actions">
          <span>Welcome, {getDisplayName()}</span>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      
      <main className="dashboard-content">
        <h1 className="page-title">Admin Dashboard</h1>
        <div className="dashboard-card">
          <h2>Admin Panel</h2>
          <p><strong>Your Role:</strong> {userRole ? (userRole === 'admin' ? 'Admin' : 'Trainee') : 'Loading...'}</p>
        </div>
        
        <div className="dashboard-card">
          <h2>User Management</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <>
              <div className="user-search-container">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="user-search-input"
                />
              </div>
              <div className="users-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Highest Score</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((usr) => (
                      <tr key={usr.id}>
                        <td>{getUserDisplayName(usr)}</td>
                        <td>{usr.email}</td>
                        <td>
                          <span className={`role-badge ${usr.role}`}>
                            {usr.role}
                          </span>
                        </td>
                        <td>
                          {usr.highestScore !== null && usr.highestScore !== undefined ? (
                            <span className="quiz-score-badge">{usr.highestScore}%</span>
                          ) : (
                            <span className="quiz-score-incomplete">Incomplete</span>
                          )}
                        </td>
                        <td>{new Date(usr.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p>{searchQuery ? 'No users found matching your search.' : 'No users found.'}</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

