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
  const [leaderboardData, setLeaderboardData] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)
  const [editingEarnings, setEditingEarnings] = useState({}) // { userId: amount }
  const [activeSection, setActiveSection] = useState('users') // 'users' or 'leaderboard'
  const [addingAmounts, setAddingAmounts] = useState({}) // { userId: amountToAdd }
  const [deletingUserId, setDeletingUserId] = useState(null) // userId being deleted

  useEffect(() => {
    fetchUsers()
    fetchLeaderboard()
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

      // Fetch current month earnings for each user
      const currentMonth = new Date().toISOString().slice(0, 7)
      const { data: earningsData, error: earningsError } = await supabase
        .from('leaderboard_earnings')
        .select('user_id, amount')
        .eq('month_year', currentMonth)

      if (earningsError) {
        console.error('Error fetching earnings:', earningsError)
      }

      // Create a map of user_id to earnings
      const userEarnings = {}
      if (earningsData) {
        earningsData.forEach(entry => {
          userEarnings[entry.user_id] = parseFloat(entry.amount) || 0
        })
      }

      // Add highest score and earnings to each user
      const usersWithScores = (usersData || []).map(user => ({
        ...user,
        highestScore: highestScores[user.id] !== undefined ? highestScores[user.id] : null,
        earnings: userEarnings[user.id] !== undefined ? userEarnings[user.id] : 0
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

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true)
      const currentMonth = new Date().toISOString().slice(0, 7)
      
      const { data: earningsData, error: earningsError } = await supabase
        .from('leaderboard_earnings')
        .select('amount, user_id')
        .eq('month_year', currentMonth)
        .order('amount', { ascending: false })

      if (earningsError) throw earningsError

      if (!earningsData || earningsData.length === 0) {
        setLeaderboardData([])
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
          amount: parseFloat(entry.amount) || 0
        }
      })

      setLeaderboardData(formatted)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  const handleUpdateEarnings = async (userId, amount) => {
    if (!user) return
    
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const amountNum = parseFloat(amount) || 0

      // Use upsert to insert or update
      const { error } = await supabase
        .from('leaderboard_earnings')
        .upsert({
          user_id: userId,
          amount: amountNum,
          month_year: currentMonth,
          updated_by: user.id
        }, {
          onConflict: 'user_id,month_year'
        })

      if (error) throw error

      // Refresh data
      await fetchUsers()
      await fetchLeaderboard()
      setEditingEarnings(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    } catch (error) {
      console.error('Error updating earnings:', error)
      alert('Failed to update earnings. Please try again.')
    }
  }

  const handleAddToEarnings = async (userId, currentAmount, amountToAdd) => {
    if (!user) return
    
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const addAmount = parseFloat(amountToAdd) || 0
      
      if (addAmount <= 0) {
        alert('Please enter a positive amount to add.')
        return
      }

      const newAmount = (currentAmount || 0) + addAmount

      // Use upsert to insert or update
      const { error } = await supabase
        .from('leaderboard_earnings')
        .upsert({
          user_id: userId,
          amount: newAmount,
          month_year: currentMonth,
          updated_by: user.id
        }, {
          onConflict: 'user_id,month_year'
        })

      if (error) throw error

      // Refresh data
      await fetchUsers()
      await fetchLeaderboard()
      setAddingAmounts(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    } catch (error) {
      console.error('Error adding to earnings:', error)
      alert('Failed to add earnings. Please try again.')
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!user) return
    
    // Prevent deleting yourself
    if (userId === user.id) {
      alert('You cannot delete your own account.')
      return
    }
    
    const confirmMessage = `Are you sure you want to delete the user "${userEmail}"?\n\nThis action cannot be undone and will permanently delete:\n- User profile\n- All quiz attempts\n- All leaderboard earnings\n- Authentication account`
    
    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      setDeletingUserId(userId)
      
      // Call the database function to delete from both user_profiles and auth.users
      const { error } = await supabase.rpc('delete_user', {
        user_id_to_delete: userId
      })

      if (error) {
        // Check if function doesn't exist (404 error)
        if (error.code === 'NOT_FOUND' || error.status === 404 || error.message?.includes('function') || error.message?.includes('does not exist')) {
          console.error('Delete user function not found. Please run delete-user-function.sql in Supabase.')
          alert('Delete function not found. Please ensure delete-user-function.sql has been run in Supabase SQL Editor.')
          throw error
        }
        throw error
      }

      // Refresh user list
      await fetchUsers()
      await fetchLeaderboard()
      
      alert('User deleted successfully.')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(`Failed to delete user: ${error.message || 'Please try again or delete manually from Supabase dashboard.'}`)
    } finally {
      setDeletingUserId(null)
    }
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

        <div className="admin-section-tabs">
          <button
            className={`section-tab ${activeSection === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSection('users')}
          >
            User Management
          </button>
          <button
            className={`section-tab ${activeSection === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('leaderboard')}
          >
            Leaderboard
          </button>
        </div>

        {activeSection === 'users' && (
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
                      <th>Monthly Earnings</th>
                      <th>Created At</th>
                      <th>Actions</th>
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
                        <td>
                          {editingEarnings[usr.id] !== undefined ? (
                            <div className="earnings-edit-container">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingEarnings[usr.id]}
                                onChange={(e) => setEditingEarnings(prev => ({
                                  ...prev,
                                  [usr.id]: e.target.value
                                }))}
                                className="earnings-input"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateEarnings(usr.id, editingEarnings[usr.id])}
                                className="earnings-save-btn"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingEarnings(prev => {
                                  const next = { ...prev }
                                  delete next[usr.id]
                                  return next
                                })}
                                className="earnings-cancel-btn"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="earnings-display-container">
                              <span className="earnings-amount">${(usr.earnings || 0).toFixed(2)}</span>
                              <button
                                onClick={() => setEditingEarnings(prev => ({
                                  ...prev,
                                  [usr.id]: usr.earnings || 0
                                }))}
                                className="earnings-edit-btn"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td>{new Date(usr.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteUser(usr.id, usr.email)}
                            className="delete-user-btn"
                            disabled={deletingUserId === usr.id}
                            title="Delete user"
                          >
                            {deletingUserId === usr.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
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
        )}

        {activeSection === 'leaderboard' && (
          <div className="dashboard-card">
            <h2>Monthly Leaderboard</h2>
            <p className="leaderboard-month">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            {loadingLeaderboard ? (
              <p>Loading leaderboard...</p>
            ) : (
              <>
                {leaderboardData.length > 0 ? (
                  <div className="leaderboard-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Name</th>
                          <th>Earnings</th>
                          <th>Add Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.map((entry) => (
                          <tr key={entry.userId}>
                            <td className="rank-cell">
                              {entry.rank === 1 && '🥇'}
                              {entry.rank === 2 && '🥈'}
                              {entry.rank === 3 && '🥉'}
                              {entry.rank > 3 && entry.rank}
                            </td>
                            <td>{entry.name}</td>
                            <td className="earnings-cell">${entry.amount.toFixed(2)}</td>
                            <td>
                              {addingAmounts[entry.userId] !== undefined ? (
                                <div className="add-earnings-container">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={addingAmounts[entry.userId]}
                                    onChange={(e) => setAddingAmounts(prev => ({
                                      ...prev,
                                      [entry.userId]: e.target.value
                                    }))}
                                    className="add-earnings-input"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleAddToEarnings(
                                      entry.userId,
                                      entry.amount,
                                      addingAmounts[entry.userId]
                                    )}
                                    className="add-earnings-btn"
                                  >
                                    Add
                                  </button>
                                  <button
                                    onClick={() => setAddingAmounts(prev => {
                                      const next = { ...prev }
                                      delete next[entry.userId]
                                      return next
                                    })}
                                    className="add-earnings-cancel-btn"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAddingAmounts(prev => ({
                                    ...prev,
                                    [entry.userId]: ''
                                  }))}
                                  className="add-earnings-toggle-btn"
                                >
                                  + Add
                                </button>
                              )}
                            </td>
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
        )}
      </main>
    </div>
  )
}

