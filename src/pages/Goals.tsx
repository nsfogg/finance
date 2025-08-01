import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Goals.css';

interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  description: string;
}

type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

const Goals: React.FC = () => {
  const [income, setIncome] = useState<number>(0);
  const [budgetPeriod, setBudgetPeriod] = useState<BudgetPeriod>('monthly');
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([
    { id: '1', name: 'Housing', amount: 0, color: '#4299e1' },
    { id: '2', name: 'Food & Dining', amount: 0, color: '#38a169' },
    { id: '3', name: 'Transportation', amount: 0, color: '#ed8936' },
    { id: '4', name: 'Entertainment', amount: 0, color: '#9f7aea' },
    { id: '5', name: 'Shopping', amount: 0, color: '#e53e3e' },
    { id: '6', name: 'Utilities', amount: 0, color: '#00b3e6' },
    { id: '7', name: 'Healthcare', amount: 0, color: '#48bb78' },
    { id: '8', name: 'Savings', amount: 0, color: '#38b2ac' },
  ]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([
    {
      id: '1',
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 2500,
      targetDate: '2025-12-31',
      description: '6 months of expenses'
    },
    {
      id: '2',
      name: 'Vacation to Europe',
      targetAmount: 5000,
      currentAmount: 800,
      targetDate: '2025-08-15',
      description: 'Summer trip to Europe'
    },
    {
      id: '3',
      name: 'New Car',
      targetAmount: 25000,
      currentAmount: 5000,
      targetDate: '2026-06-01',
      description: 'Down payment for new car'
    }
  ]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    description: ''
  });

  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleFinances = () => {
    navigate('/');
  };

  const handleConnect = () => {
    navigate('/connect');
  };

  const updateBudgetCategory = (id: string, amount: number) => {
    setBudgetCategories(prev => 
      prev.map(cat => cat.id === id ? { ...cat, amount } : cat)
    );
  };

  const getTotalBudget = () => {
    return budgetCategories.reduce((sum, cat) => sum + cat.amount, 0);
  };

  const getRemainingIncome = () => {
    return income - getTotalBudget();
  };

  const getBudgetPercentage = (amount: number) => {
    return income > 0 ? (amount / income) * 100 : 0;
  };

  const addSavingsGoal = () => {
    if (newGoal.name && newGoal.targetAmount && newGoal.targetDate) {
      const goal: SavingsGoal = {
        id: Date.now().toString(),
        name: newGoal.name,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: 0,
        targetDate: newGoal.targetDate,
        description: newGoal.description
      };
      setSavingsGoals(prev => [...prev, goal]);
      setNewGoal({ name: '', targetAmount: '', targetDate: '', description: '' });
      setShowAddGoal(false);
    }
  };

  const updateSavingsGoal = (id: string, currentAmount: number) => {
    setSavingsGoals(prev =>
      prev.map(goal => goal.id === id ? { ...goal, currentAmount } : goal)
    );
  };

  const getGoalProgress = (goal: SavingsGoal) => {
    return (goal.currentAmount / goal.targetAmount) * 100;
  };

  const getDaysUntilTarget = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="goals-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Budget</h1>
        </div>
        <div className="navbar-actions">
          <button onClick={handleFinances} className="nav-btn">
            Finances
          </button>
          <button onClick={handleConnect} className="nav-btn">
            Connect
          </button>
          <button onClick={logout} className="nav-btn logout-btn">
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        <div className="goals-header">
          <h2>Financial Goals & Budget Planning</h2>
          <p>Set your income, create budgets, and track your savings goals</p>
        </div>

        {/* Income Section */}
        <div className="section-card">
          <div className="section-header">
            <h3>💰 Income Setup</h3>
            <div className="period-selector">
              <button 
                className={budgetPeriod === 'weekly' ? 'active' : ''}
                onClick={() => setBudgetPeriod('weekly')}
              >
                Weekly
              </button>
              <button 
                className={budgetPeriod === 'monthly' ? 'active' : ''}
                onClick={() => setBudgetPeriod('monthly')}
              >
                Monthly
              </button>
              <button 
                className={budgetPeriod === 'yearly' ? 'active' : ''}
                onClick={() => setBudgetPeriod('yearly')}
              >
                Yearly
              </button>
            </div>
          </div>
          <div className="income-input">
            <label>Your {budgetPeriod} income:</label>
            <div className="input-group">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="income-field"
              />
            </div>
          </div>
        </div>

        {/* Budget Categories */}
        <div className="section-card">
          <div className="section-header">
            <h3>📊 Budget Categories</h3>
            <div className="budget-summary">
              <span className={`remaining ${getRemainingIncome() < 0 ? 'negative' : ''}`}>
                Remaining: ${getRemainingIncome().toFixed(2)}
              </span>
            </div>
          </div>
          
          <div className="budget-categories">
            {budgetCategories.map(category => (
              <div key={category.id} className="budget-item">
                <div className="budget-info">
                  <div 
                    className="category-color" 
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <div className="category-details">
                    <span className="category-name">{category.name}</span>
                    <span className="category-percentage">
                      {getBudgetPercentage(category.amount).toFixed(1)}% of income
                    </span>
                  </div>
                </div>
                <div className="budget-controls">
                  <div className="input-group">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      value={category.amount}
                      onChange={(e) => updateBudgetCategory(category.id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="budget-input"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Budget Visualization */}
          {income > 0 && (
            <div className="budget-chart">
              <h4>Budget Breakdown</h4>
              <div className="chart-container">
                {budgetCategories.filter(cat => cat.amount > 0).map(category => (
                  <div
                    key={category.id}
                    className="chart-segment"
                    style={{
                      width: `${getBudgetPercentage(category.amount)}%`,
                      backgroundColor: category.color,
                    }}
                    title={`${category.name}: $${category.amount} (${getBudgetPercentage(category.amount).toFixed(1)}%)`}
                  ></div>
                ))}
                {getRemainingIncome() > 0 && (
                  <div
                    className="chart-segment remaining"
                    style={{
                      width: `${getBudgetPercentage(getRemainingIncome())}%`,
                      backgroundColor: '#4a5568',
                    }}
                    title={`Unallocated: $${getRemainingIncome().toFixed(2)} (${getBudgetPercentage(getRemainingIncome()).toFixed(1)}%)`}
                  ></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Savings Goals */}
        <div className="section-card">
          <div className="section-header">
            <h3>🎯 Savings Goals</h3>
            <button 
              className="add-goal-btn"
              onClick={() => setShowAddGoal(true)}
            >
              + Add Goal
            </button>
          </div>

          {showAddGoal && (
            <div className="add-goal-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Goal name"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                />
                <input
                  type="number"
                  placeholder="Target amount"
                  value={newGoal.targetAmount}
                  onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                />
              </div>
              <div className="form-row">
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button onClick={addSavingsGoal} className="save-btn">Save Goal</button>
                <button onClick={() => setShowAddGoal(false)} className="cancel-btn">Cancel</button>
              </div>
            </div>
          )}

          <div className="savings-goals">
            {savingsGoals.map(goal => (
              <div key={goal.id} className="goal-card">
                <div className="goal-header">
                  <div className="goal-info">
                    <h4>{goal.name}</h4>
                    <p>{goal.description}</p>
                  </div>
                  <div className="goal-amount">
                    <span className="current">${goal.currentAmount.toLocaleString()}</span>
                    <span className="target">/ ${goal.targetAmount.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${Math.min(getGoalProgress(goal), 100)}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {getGoalProgress(goal).toFixed(1)}% complete
                  </span>
                </div>

                <div className="goal-details">
                  <div className="detail-item">
                    <span className="label">Target Date:</span>
                    <span className="value">{new Date(goal.targetDate).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Days Remaining:</span>
                    <span className={`value ${getDaysUntilTarget(goal.targetDate) < 30 ? 'urgent' : ''}`}>
                      {getDaysUntilTarget(goal.targetDate)} days
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Remaining:</span>
                    <span className="value">${(goal.targetAmount - goal.currentAmount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="goal-actions">
                  <div className="update-amount">
                    <input
                      type="number"
                      placeholder="Update saved amount"
                      onBlur={(e) => {
                        const amount = parseFloat(e.target.value) || 0;
                        if (amount >= 0) {
                          updateSavingsGoal(goal.id, amount);
                          e.target.value = '';
                        }
                      }}
                      className="amount-input"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Goals;