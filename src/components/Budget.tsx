import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/Budget.css';

// Update the interface to be simpler
interface CategoryBudget {
  custom_category: string;
  weeklyAllocation: number;
  allocationThisPeriod: number; // Just for display - allocation for current period
  transactionsThisPeriod: number; // Just for display - spending in current period
  balance: number; // Total allocations since first transaction - Total transactions (cumulative available money)
  goalCreatedAt: string;
}

// Update the props if needed
interface BudgetProps {
  // You can add props here if needed to pass data from parent
}

type TimePeriod = 'weekly' | 'monthly' | 'yearly';

const Budget: React.FC<BudgetProps> = () => {
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startPeriod, setStartPeriod] = useState(new Date());
  const [endPeriod, setEndPeriod] = useState(new Date());

  // Calculate date range whenever timePeriod or currentDate changes
  useEffect(() => {
    const now = new Date(currentDate);
    let startDate: Date;
    let endDate: Date;

    switch (timePeriod) {
      case 'weekly':
        // Get start of week (Sunday)
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        startDate = new Date();
        endDate = new Date();
    }

    setStartPeriod(startDate);
    setEndPeriod(endDate);
    console.log("Date range calculated:", startDate, "to", endDate);
  }, [timePeriod, currentDate]);

  // Load budget data whenever the date period changes
  useEffect(() => {
    // Only load data if we have valid start and end periods
    if (startPeriod && endPeriod) {
      loadBudgetData();
    }
  }, [startPeriod, endPeriod]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (timePeriod) {
      case 'weekly':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'monthly':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'yearly':
        newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  // Update the getWeeksBetweenDates function to be more accurate
  const getWeeksBetweenDates = (startDate: Date, endDate: Date): number => {
    // Calculate the difference in milliseconds
    const diffTime = endDate.getTime() - startDate.getTime();
    
    // Convert to days and then to weeks
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const diffWeeks = diffDays / 7;
    
    // Round up to include partial weeks (since we want to count the week we're in)
    return Math.ceil(diffWeeks);
  };

  // Update the loadBudgetData function to calculate totalTransactions up to the period end date
  const loadBudgetData = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      console.error("No user found");
      return;
    }

    try {
      // Use the state variables for current period
      const currentEndDate = endPeriod;
      const currentStartDate = startPeriod;

      console.log("=== BUDGET DATA LOADING ===");
      console.log("Current period:", currentStartDate, "to", currentEndDate);
      console.log("Time period:", timePeriod);

      // Get budget allocations from goals table
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('category, amount, income, created_at')
        .eq('user_id', userId);

      if (goalsError) {
        console.error('Error loading budget data:', goalsError);
        return;
      }

      console.log("Goals data:", goalsData);

      // Get all categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('custom_category')
        .eq('user_id', userId);

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
      }

      console.log("Categories data:", categoriesData);

      // Get ALL transactions up to the END of the current period (not all time)
      const { data: allTransactionsUpToPeriod, error: allTransactionsError } = await supabase
        .from('transactions')
        .select('custom_category, amount, date')
        .eq('user_id', userId)
        .lte('date', currentEndDate.toISOString()) // Only transactions up to period end
        .gte('amount', 0) // Only expenses (positive amounts)
        .order('date', { ascending: true });

      if (allTransactionsError) {
        console.error('Error loading transactions up to period:', allTransactionsError);
      }

      console.log("=== TRANSACTIONS UP TO PERIOD END ===");
      console.log("Transactions loaded up to", currentEndDate, ":", allTransactionsUpToPeriod?.length || 0);
      console.log("Transactions up to period:", allTransactionsUpToPeriod);

      // Get transactions for the current period only (for display purposes)
      const { data: periodTransactionsData, error: periodTransactionsError } = await supabase
        .from('transactions')
        .select('custom_category, amount, date')
        .eq('user_id', userId)
        .gte('date', currentStartDate.toISOString())
        .lte('date', currentEndDate.toISOString())
        .gte('amount', 0); // Only expenses (positive amounts)

      if (periodTransactionsError) {
        console.error('Error loading period transaction data:', periodTransactionsError);
      }

      console.log("=== PERIOD TRANSACTIONS DATA ===");
      console.log("Period transactions loaded:", periodTransactionsData?.length || 0);
      console.log("Period transactions:", periodTransactionsData);

      // Process the data
      const budgets: CategoryBudget[] = [];

      // Get unique categories
      const allCategories = new Set<string>();
      categoriesData?.forEach(cat => allCategories.add(cat.custom_category));
      goalsData?.filter(item => item.category).forEach(item => allCategories.add(item.category));

      console.log("=== UNIQUE CATEGORIES ===");
      console.log("All categories found:", Array.from(allCategories));

      // Calculate spending by category for THIS PERIOD ONLY (for display)
      const periodSpendingByCategory: Record<string, number> = {};
      periodTransactionsData?.forEach(tx => {
        if (tx.custom_category) {
          periodSpendingByCategory[tx.custom_category] = (periodSpendingByCategory[tx.custom_category] || 0) + tx.amount;
        }
      });

      console.log("=== PERIOD SPENDING BY CATEGORY ===");
      console.log("Period spending breakdown:", periodSpendingByCategory);

      // Calculate total spending by category UP TO THE PERIOD END DATE
      const totalSpendingByCategory: Record<string, number> = {};
      allTransactionsUpToPeriod?.forEach(tx => {
        if (tx.custom_category) {
          totalSpendingByCategory[tx.custom_category] = (totalSpendingByCategory[tx.custom_category] || 0) + tx.amount;
        }
      });

      console.log("=== TOTAL SPENDING BY CATEGORY (UP TO PERIOD END) ===");
      console.log("Total spending breakdown up to", currentEndDate, ":", totalSpendingByCategory);

      // Find the earliest transaction date for each category (from all transactions up to period)
      const earliestTransactionByCategory: Record<string, Date> = {};
      allTransactionsUpToPeriod?.forEach(tx => {
        if (tx.custom_category) {
          const txDate = new Date(tx.date);
          if (!earliestTransactionByCategory[tx.custom_category] || txDate < earliestTransactionByCategory[tx.custom_category]) {
            earliestTransactionByCategory[tx.custom_category] = txDate;
          }
        }
      });

      console.log("=== EARLIEST TRANSACTIONS BY CATEGORY (UP TO PERIOD) ===");
      console.log("Earliest transaction dates up to period:", earliestTransactionByCategory);

      // Find the earliest transaction date across ALL categories (global start date)
      let globalEarliestTransaction: Date | null = null;
      allTransactionsUpToPeriod?.forEach(tx => {
        if (tx.custom_category) {
          const txDate = new Date(tx.date);
          if (!globalEarliestTransaction || txDate < globalEarliestTransaction) {
            globalEarliestTransaction = txDate;
          }
        }
      });

      console.log("=== GLOBAL EARLIEST TRANSACTION ===");
      console.log("Earliest transaction across all categories:", globalEarliestTransaction);

      // Process each category
      allCategories.forEach(categoryName => {
        console.log(`\n=== PROCESSING CATEGORY: ${categoryName} ===`);
        
        // Get all transactions for this specific category up to period end
        const categoryTransactions = allTransactionsUpToPeriod?.filter(tx => tx.custom_category === categoryName) || [];
        console.log(`Transactions for ${categoryName} up to ${currentEndDate}:`, categoryTransactions);
        console.log(`Transaction count for ${categoryName}:`, categoryTransactions.length);
        
        const goalRecord = goalsData?.find(item => item.category === categoryName);
        const weeklyAllocation = goalRecord?.amount || 0;
        const goalCreatedAt = goalRecord?.created_at || new Date().toISOString();
        
        console.log(`Weekly allocation for ${categoryName}:`, weeklyAllocation);
        console.log(`Goal created at for ${categoryName}:`, goalCreatedAt);
        
        // Calculate period allocation based on time period type (for display)
        let allocationThisPeriod = 0;
        
        // Only allocate if the goal was created before or during this period
        const goalCreatedDate = new Date(goalCreatedAt);
        if (goalCreatedDate <= currentEndDate) {
          switch (timePeriod) {
            case 'weekly':
              allocationThisPeriod = weeklyAllocation;
              break;
            case 'monthly':
              allocationThisPeriod = weeklyAllocation * 4.33;
              break;
            case 'yearly':
              allocationThisPeriod = weeklyAllocation * 52;
              break;
          }
        }

        console.log(`Period allocation for ${categoryName}:`, allocationThisPeriod);

        // Calculate balance using global earliest transaction date for ALL categories
        let totalAllocationsValue = 0;
        let numberOfAllocations = 0;
        
        if (globalEarliestTransaction && weeklyAllocation > 0) {
          // Use the GLOBAL earliest transaction date as the allocation start date for ALL categories
          const allocationStartDate = globalEarliestTransaction;
          console.log(`Allocation start date for ${categoryName}:`, allocationStartDate);
          console.log(`(Using GLOBAL earliest transaction date across all categories)`);
          
          // Calculate number of allocations (weeks) from global earliest transaction to current end period
          numberOfAllocations = getWeeksBetweenDates(allocationStartDate, currentEndDate);
          
          // Total allocations value = number of allocations * weekly allocation amount
          totalAllocationsValue = numberOfAllocations * weeklyAllocation;
          
          console.log(`Number of allocations for ${categoryName}:`, numberOfAllocations);
          console.log(`Weekly allocation amount for ${categoryName}:`, weeklyAllocation);
          console.log(`Total allocations value for ${categoryName}:`, totalAllocationsValue);
        }

        const transactionsThisPeriod = periodSpendingByCategory[categoryName] || 0;
        const totalTransactions = totalSpendingByCategory[categoryName] || 0; // Now calculated up to period end
        
        console.log(`Period transactions for ${categoryName}:`, transactionsThisPeriod);
        console.log(`Total transactions for ${categoryName} (up to ${currentEndDate}):`, totalTransactions);
        
        // Balance = (number of allocations * allocation amount) - total transactions up to period end
        const balance = totalAllocationsValue - totalTransactions;
        
        console.log(`FINAL BALANCE for ${categoryName}:`, balance);
        console.log(`Calculation: (${numberOfAllocations} allocations × $${weeklyAllocation}) - $${totalTransactions} = $${totalAllocationsValue} - $${totalTransactions} = $${balance}`);

        budgets.push({
          custom_category: categoryName,
          weeklyAllocation,
          allocationThisPeriod,
          transactionsThisPeriod,
          balance,
          goalCreatedAt
        });
      });

      console.log("\n=== FINAL BUDGET RESULTS ===");
      console.log("Budgets loaded for period:", currentStartDate, "to", currentEndDate);
      console.log("Time-based balance budgets:", budgets);

      // Sort by category name for consistent display
      budgets.sort((a, b) => a.custom_category.localeCompare(b.custom_category));

      setCategoryBudgets(budgets);

    } catch (error) {
      console.error('Error in loadBudgetData:', error);
    }
  };

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: timePeriod === 'yearly' ? 'numeric' : undefined
    };

    if (timePeriod === 'yearly') {
      return startPeriod.getFullYear().toString();
    } else if (timePeriod === 'monthly') {
      return startPeriod.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return `${startPeriod.toLocaleDateString('en-US', options)} - ${endPeriod.toLocaleDateString('en-US', options)}`;
    }
  };

  // Add these interfaces and state at the top of your Budget component

interface TransactionDetail {
  id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
}

interface CategoryDetailModal {
  show: boolean;
  category: CategoryBudget | null;
  transactions: TransactionDetail[];
  startingBalance: number;
}

// Add this state variable with your other useState declarations
const [categoryDetail, setCategoryDetail] = useState<CategoryDetailModal>({
  show: false,
  category: null,
  transactions: [],
  startingBalance: 0
});

// Add this function to load transaction details
const loadCategoryDetails = async (category: CategoryBudget) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  if (!userId) return;

  try {
    // Get transactions for this category in the current period
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('id, amount, date, name, merchant_name')
      .eq('user_id', userId)
      .eq('custom_category', category.custom_category)
      .gte('date', startPeriod.toISOString())
      .lte('date', endPeriod.toISOString())
      .gte('amount', 0) // Only expenses
      .order('date', { ascending: true });

    if (error) {
      console.error('Error loading category transactions:', error);
      return;
    }

    // Calculate starting balance (balance at start of period)
    const startingBalance = category.balance + category.transactionsThisPeriod - category.allocationThisPeriod;

    setCategoryDetail({
      show: true,
      category,
      transactions: transactions || [],
      startingBalance
    });

  } catch (error) {
    console.error('Error loading category details:', error);
  }
};

  // Replace your return statement with this updated JSX:
  return (
    <div className="budget-container">
      {/* Time Period Controls */}
      <div className="budget-time-controls">
        <div className="budget-period-selector">
          {(['weekly', 'monthly', 'yearly'] as TimePeriod[]).map(period => (
            <button
              key={period}
              className={`budget-period-btn ${timePeriod === period ? 'active' : ''}`}
              onClick={() => setTimePeriod(period)}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="budget-date-navigation">
          <button className="budget-nav-btn" onClick={() => navigatePeriod('prev')}>
            ←
          </button>
          <span className="budget-current-period">{formatDateRange()}</span>
          <button className="budget-nav-btn" onClick={() => navigatePeriod('next')}>
            →
          </button>
        </div>
      </div>

      {/* Category Detail Modal */}
      {categoryDetail.show && (
        <div className="delete-overlay" onClick={() => setCategoryDetail({ show: false, category: null, transactions: [], startingBalance: 0 })}>
          <div className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="delete-header">
              <h4>
                📊 {categoryDetail.category?.custom_category} Details
              </h4>
            </div>
            
            <div className="delete-content">
              <div className="category-detail-summary">
                <div className="balance-section">
                  <h5>💰 Balance at Start of Period</h5>
                  <div className="balance-amount">
                    ${categoryDetail.startingBalance.toFixed(2)}
                  </div>
                </div>
                
                <div className="allocation-section">
                  <h5>📈 Period Allocation</h5>
                  <div className="allocation-amount positive">
                    +${categoryDetail.category?.allocationThisPeriod.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="transactions-section">
                <h5>🛒 Transactions This Period ({categoryDetail.transactions.length})</h5>
                {categoryDetail.transactions.length === 0 ? (
                  <div className="no-transactions">
                    <p>No transactions found for this period.</p>
                  </div>
                ) : (
                  <div className="transactions-list">
                    {categoryDetail.transactions.map((transaction) => (
                      <div key={transaction.id} className="transaction-item">
                        <div className="transaction-info">
                          <div className="transaction-merchant">
                            {transaction.merchant_name || transaction.name}
                          </div>
                          <div className="transaction-date">
                            {new Date(transaction.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="transaction-amount negative">
                          -${transaction.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {categoryDetail.transactions.length > 0 && (
                  <div className="transactions-total">
                    <strong>
                      Total Spent: -${categoryDetail.transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)}
                    </strong>
                  </div>
                )}
              </div>

              <div className="current-balance-section">
                <h5>🎯 Current Balance</h5>
                <div className={`current-balance ${categoryDetail.category?.balance && categoryDetail.category.balance < 0 ? 'negative' : 'positive'}`}>
                  ${categoryDetail.category?.balance.toFixed(2)}
                </div>
                <div className="balance-calculation">
                  ${categoryDetail.startingBalance.toFixed(2)} + ${categoryDetail.category?.allocationThisPeriod.toFixed(2)} - ${categoryDetail.transactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)} = ${categoryDetail.category?.balance.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="delete-actions">
              <button 
                className="delete-cancel-btn"
                onClick={() => setCategoryDetail({ show: false, category: null, transactions: [], startingBalance: 0 })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Categories */}
      {categoryBudgets.length === 0 ? (
        <div className="budget-empty">
          <div className="budget-empty-icon">💰</div>
          <h3>No Budget Categories Found</h3>
          <p>Set up your budget categories in the Goals page to track your spending.</p>
          <a href="/goals" className="budget-setup-btn">
            Set Up Budget
          </a>
        </div>
      ) : (
        <div className="budget-categories">
          {categoryBudgets.map((category) => (
            <div 
              key={category.custom_category} 
              className="budget-category clickable"
              onClick={() => loadCategoryDetails(category)}
            >
              <div className="budget-category-header">
                <h3>{category.custom_category}</h3>
                <div className="budget-category-amounts">
                  <span className={`budget-balance-amount ${category.balance < 0 ? 'expense' : 'income'}`}>
                    Current Balance: ${category.balance.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="budget-bar">
                <div 
                  className={`budget-used ${category.balance < 0 ? 'over-budget' : ''}`}
                  style={{ 
                    width: `${Math.min(Math.max((category.balance / category.allocationThisPeriod) * 100, 0), 100)}%`
                  }}
                ></div>
              </div>
              
              <div className="budget-category-details">
                <span className="budget-weekly-rate">
                  ${category.weeklyAllocation.toFixed(2)}/week
                </span>
                
              </div>
              
              {/* Click indicator */}
              <div className="click-indicator">
                Click to view details →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Budget;