import React, { useEffect, useState } from 'react';
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

interface Category {
  id: number;
  created_at: string;
  user_id: string;
  custom_category: string;
  subcategory: string;
}

interface CategoryGroup {
  weeklyAllocation: number; // Store as weekly rate
  custom_category: string;
  subcategories: string[];
  count: number;
}

type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

const Goals: React.FC = () => {
  const [weeklyIncome, setWeeklyIncome] = useState<number>(0); // Store as weekly rate
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
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    custom_category: '',
    subcategory: ''
  });
  const [addingCategory, setAddingCategory] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    categoryName: string;
    subcategories: string[];
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [categoryAllocations, setCategoryAllocations] = useState<Record<string, number>>({});

  // Add new state for input display values
  const [incomeDisplay, setIncomeDisplay] = useState<string>('0.00');
  const [allocationDisplays, setAllocationDisplays] = useState<Record<string, string>>({});

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

  // Load data from Supabase on component mount
  useEffect(() => {
    const loadData = async () => {
      await loadGoalsData();
      await fetchCategories();
    };
    loadData();
  }, []);

  // Update the loadGoalsData function to get the most recent income
  const loadGoalsData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        console.error('No user found');
        setLoading(false);
        return;
      }

      // Get the most recent income record (stored as weekly rate)
      const { data: incomeData, error: incomeError } = await supabase
        .from('goals')
        .select('income, created_at')
        .eq('user_id', userId)
        .not('income', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (incomeError) {
        console.error('Error loading income data:', incomeError);
      } else if (incomeData && incomeData.length > 0) {
        // Income is stored as weekly rate
        setWeeklyIncome(incomeData[0].income);
      }

      // Get all category allocations (stored as weekly rates)
      const { data: categoryData, error: categoryError } = await supabase
        .from('goals')
        .select('category, amount')
        .eq('user_id', userId)
        .not('category', 'is', null);

      if (categoryError) {
        console.error('Error loading category data:', categoryError);
      } else if (categoryData) {
        // Store weekly allocations
        const weeklyAllocations = categoryData.reduce((acc, item) => {
          if (item.category && item.amount !== null) {
            acc[item.category] = item.amount; // Already stored as weekly
          }
          return acc;
        }, {} as Record<string, number>);

        setCategoryAllocations(weeklyAllocations);
      }

    } catch (error) {
      console.error('Error loading goals data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update fetchCategories to use weekly allocations
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    if (!userId) {
      console.error("No user found");
      setCategoriesLoading(false);
      return;
    }

    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("custom_category", { ascending: true });

      if (categoriesError) {
        console.error("Error fetching categories:", categoriesError);
        setCategories([]);
        setCategoryGroups([]);
        return;
      }

      // Fetch category allocations from goals table (stored as weekly)
      const { data: goalsData, error: goalsError } = await supabase
        .from("goals")
        .select("category, amount")
        .eq("user_id", userId)
        .not("category", "is", null);

      if (goalsError) {
        console.error("Error fetching goals:", goalsError);
      }

      // Create weekly allocations map
      const weeklyAllocations = (goalsData || []).reduce((acc, item) => {
        if (item.category && item.amount !== null) {
          acc[item.category] = item.amount; // Already stored as weekly
        }
        return acc;
      }, {} as Record<string, number>);

      // Update state
      setCategories(categoriesData || []);
      setCategoryAllocations(weeklyAllocations);
      
      // Group categories with weekly allocations
      const grouped = groupCategoriesWithAllocations(categoriesData || [], weeklyAllocations);
      setCategoryGroups(grouped);

    } catch (error) {
      console.error("Error in fetchCategories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const deleteCategory = async (categoryName: string) => {
    setDeleting(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Delete all entries for this custom_category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('user_id', userId)
        .eq('custom_category', categoryName);

      if (error) {
        throw error;
      }

      setCategoryMessage(`Category "${categoryName}" deleted successfully! 🗑️`);
      setDeleteConfirm(null);
      
      // Refresh categories list
      await fetchCategories();
      
      setTimeout(() => setCategoryMessage(null), 3000);

    } catch (error) {
      console.error('Error deleting category:', error);
      setCategoryMessage('Error deleting category. Please try again.');
      setTimeout(() => setCategoryMessage(null), 5000);
    } finally {
      setDeleting(false);
    }
  };

  const groupCategories = (categoriesData: Category[]): CategoryGroup[] => {
    const grouped = categoriesData.reduce((acc, category) => {
      const existing = acc.find(group => group.custom_category === category.custom_category);
      
      if (existing) {
        if (!existing.subcategories.includes(category.subcategory)) {
          existing.subcategories.push(category.subcategory);
        }
        existing.count += 1;
      } else {
        acc.push({
          custom_category: category.custom_category,
          subcategories: [category.subcategory],
          count: 1
        });
      }
      
      return acc;
    }, [] as CategoryGroup[]);

    // Sort subcategories within each group
    grouped.forEach(group => {
      group.subcategories.sort();
    });

    return grouped;
  };

  // Fix the updateTransactionsWithNewCategory function to properly count updated rows
  const updateTransactionsWithNewCategory = async (customCategory: string, subcategory: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // First, count how many transactions match this subcategory
      const { count: matchingCount, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('subcategory', subcategory);

      if (countError) {
        console.error('Error counting matching transactions:', countError);
        return 0;
      }

      // If no matching transactions, return 0
      if (!matchingCount || matchingCount === 0) {
        console.log(`No transactions found with subcategory: ${subcategory}`);
        return 0;
      }

      // Update all transactions for this user that match the subcategory
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          custom_category: customCategory 
        })
        .eq('user_id', userId)
        .eq('subcategory', subcategory);

      if (updateError) {
        throw updateError;
      }

      console.log(`Updated ${matchingCount} transactions for ${customCategory} - ${subcategory}`);
      return matchingCount;

    } catch (error) {
      console.error('Error updating transactions:', error);
      return 0;
    }
  };

  // Add category creation function
  const addCustomCategory = async () => {
    if (!newCategory.custom_category.trim() || !newCategory.subcategory.trim()) {
      setCategoryMessage('Both category and subcategory are required.');
      setTimeout(() => setCategoryMessage(null), 3000);
      return;
    }

    setAddingCategory(true);
    setCategoryMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Check if this exact combination already exists
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .eq('custom_category', newCategory.custom_category.trim())
        .eq('subcategory', newCategory.subcategory.trim())
        .single();

      if (existingCategory) {
        setCategoryMessage('This category and subcategory combination already exists.');
        setTimeout(() => setCategoryMessage(null), 3000);
        return;
      }

      // Insert new category
      const { error } = await supabase
        .from('categories')
        .insert([{
          user_id: userId,
          custom_category: newCategory.custom_category.trim(),
          subcategory: newCategory.subcategory.trim(),
          created_at: new Date().toISOString()
        }]);

      if (error) {
        throw error;
      }

      setCategoryMessage('Category added successfully! 🎉');
      setNewCategory({ custom_category: '', subcategory: '' });
      setShowAddCategory(false);

      // Update existing transactions with the new custom category
      const updatedTransactions = await updateTransactionsWithNewCategory(
        newCategory.custom_category.trim(),
        newCategory.subcategory.trim()
      );
      
      // Refresh categories list
      await fetchCategories();
      
      setTimeout(() => setCategoryMessage(null), 3000);

    } catch (error) {
      console.error('Error adding category:', error);
      setCategoryMessage('Error adding category. Please try again.');
      setTimeout(() => setCategoryMessage(null), 5000);
    } finally {
      setAddingCategory(false);
    }
  };

  // Helper functions for time period conversion
  const getDisplayIncome = (): number => {
    switch (budgetPeriod) {
      case 'weekly':
        return weeklyIncome;
      case 'monthly':
        return weeklyIncome * 4.33;
      case 'yearly':
        return weeklyIncome * 52;
      default:
        return weeklyIncome;
    }
  };

  const getDisplayAllocation = (weeklyAmount: number): number => {
    switch (budgetPeriod) {
      case 'weekly':
        return weeklyAmount;
      case 'monthly':
        return weeklyAmount * 4.33;
      case 'yearly':
        return weeklyAmount * 52;
      default:
        return weeklyAmount;
    }
  };

  const convertDisplayToWeekly = (displayAmount: number): number => {
    switch (budgetPeriod) {
      case 'weekly':
        return displayAmount;
      case 'monthly':
        return displayAmount / 4.33;
      case 'yearly':
        return displayAmount / 52;
      default:
        return displayAmount;
    }
  };

  // Update the useEffect hooks to prevent feedback loops
  useEffect(() => {
    // Only update display if the input is not currently focused
    const activeElement = document.activeElement;
    const isIncomeInputFocused = activeElement?.classList.contains('income-field');
    
    if (!isIncomeInputFocused) {
      setIncomeDisplay(getDisplayIncome().toFixed(2));
    }
  }, [weeklyIncome, budgetPeriod]);

  useEffect(() => {
    // Only update allocation displays if no allocation input is currently focused
    const activeElement = document.activeElement;
    const isAllocationInputFocused = activeElement?.classList.contains('category-budget-input');
    
    if (!isAllocationInputFocused) {
      const newDisplays: Record<string, string> = {};
      categoryGroups.forEach(group => {
        newDisplays[group.custom_category] = getDisplayAllocation(group.weeklyAllocation || 0).toFixed(2);
      });
      setAllocationDisplays(newDisplays);
    }
  }, [categoryGroups, budgetPeriod]);

  // Alternative approach: Use onBlur instead of onChange for better UX
  const handleIncomeBlur = (displayValue: string) => {
    const numericValue = parseFloat(displayValue) || 0;
    const weeklyValue = convertDisplayToWeekly(numericValue);
    setWeeklyIncome(weeklyValue);
    // Update display to show properly formatted value
    setIncomeDisplay(numericValue.toFixed(2));
  };

  const handleAllocationBlur = (custom_category: string, displayValue: string) => {
    const numericValue = parseFloat(displayValue) || 0;
    const weeklyAmount = convertDisplayToWeekly(numericValue);
    
    setCategoryGroups(prevGroups =>
      prevGroups.map(group =>
        group.custom_category === custom_category
          ? { ...group, weeklyAllocation: weeklyAmount }
          : group
      )
    );
    
    setCategoryAllocations(prev => ({
      ...prev,
      [custom_category]: weeklyAmount
    }));

    // Update display to show properly formatted value
    setAllocationDisplays(prev => ({
      ...prev,
      [custom_category]: numericValue.toFixed(2)
    }));
  };

  // Add this function to handle adding default categories
  const addDefaultCategories = async () => {
    setAddingCategory(true);
    setCategoryMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Define the default categories using the exact subcategory strings from the CSV
      const defaultCategories = [
        { custom_category: 'Income', subcategory: 'INCOME_DIVIDENDS' },
        { custom_category: 'Income', subcategory: 'INCOME_INTEREST_EARNED' },
        { custom_category: 'Income', subcategory: 'INCOME_RETIREMENT_PENSION' },
        { custom_category: 'Income', subcategory: 'INCOME_TAX_REFUND' },
        { custom_category: 'Income', subcategory: 'INCOME_UNEMPLOYMENT' },
        { custom_category: 'Income', subcategory: 'INCOME_WAGES' },
        { custom_category: 'Income', subcategory: 'INCOME_OTHER_INCOME' },
        
        { custom_category: 'Transfer In', subcategory: 'TRANSFER_IN_CASH_ADVANCES_AND_LOANS' },
        { custom_category: 'Transfer In', subcategory: 'TRANSFER_IN_DEPOSIT' },
        { custom_category: 'Transfer In', subcategory: 'TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS' },
        { custom_category: 'Transfer In', subcategory: 'TRANSFER_IN_SAVINGS' },
        { custom_category: 'Transfer In', subcategory: 'TRANSFER_IN_ACCOUNT_TRANSFER' },
        { custom_category: 'Transfer In', subcategory: 'TRANSFER_IN_OTHER_TRANSFER_IN' },
        
        { custom_category: 'Transfer Out', subcategory: 'TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS' },
        { custom_category: 'Transfer Out', subcategory: 'TRANSFER_OUT_SAVINGS' },
        { custom_category: 'Transfer Out', subcategory: 'TRANSFER_OUT_WITHDRAWAL' },
        { custom_category: 'Transfer Out', subcategory: 'TRANSFER_OUT_ACCOUNT_TRANSFER' },
        { custom_category: 'Transfer Out', subcategory: 'TRANSFER_OUT_OTHER_TRANSFER_OUT' },
        
        { custom_category: 'Loan Payments', subcategory: 'LOAN_PAYMENTS_CAR_PAYMENT' },
        { custom_category: 'Loan Payments', subcategory: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT' },
        { custom_category: 'Loan Payments', subcategory: 'LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT' },
        { custom_category: 'Loan Payments', subcategory: 'LOAN_PAYMENTS_MORTGAGE_PAYMENT' },
        { custom_category: 'Loan Payments', subcategory: 'LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT' },
        { custom_category: 'Loan Payments', subcategory: 'LOAN_PAYMENTS_OTHER_PAYMENT' },
        
        { custom_category: 'Bank Fees', subcategory: 'BANK_FEES_ATM_FEES' },
        { custom_category: 'Bank Fees', subcategory: 'BANK_FEES_FOREIGN_TRANSACTION_FEES' },
        { custom_category: 'Bank Fees', subcategory: 'BANK_FEES_INSUFFICIENT_FUNDS' },
        { custom_category: 'Bank Fees', subcategory: 'BANK_FEES_INTEREST_CHARGE' },
        { custom_category: 'Bank Fees', subcategory: 'BANK_FEES_OVERDRAFT_FEES' },
        { custom_category: 'Bank Fees', subcategory: 'BANK_FEES_OTHER_BANK_FEES' },
        
        { custom_category: 'Entertainment', subcategory: 'ENTERTAINMENT_CASINOS_AND_GAMBLING' },
        { custom_category: 'Entertainment', subcategory: 'ENTERTAINMENT_MUSIC_AND_AUDIO' },
        { custom_category: 'Entertainment', subcategory: 'ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS' },
        { custom_category: 'Entertainment', subcategory: 'ENTERTAINMENT_TV_AND_MOVIES' },
        { custom_category: 'Entertainment', subcategory: 'ENTERTAINMENT_VIDEO_GAMES' },
        { custom_category: 'Entertainment', subcategory: 'ENTERTAINMENT_OTHER_ENTERTAINMENT' },
        
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR' },
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_COFFEE' },
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_FAST_FOOD' },
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_GROCERIES' },
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_RESTAURANT' },
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_VENDING_MACHINES' },
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK' },
        
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_CONVENIENCE_STORES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_DEPARTMENT_STORES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_DISCOUNT_STORES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_ELECTRONICS' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_OFFICE_SUPPLIES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_PET_SUPPLIES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_SPORTING_GOODS' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_SUPERSTORES' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_TOBACCO_AND_VAPE' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE' },
        
        { custom_category: 'Home Improvement', subcategory: 'HOME_IMPROVEMENT_FURNITURE' },
        { custom_category: 'Home Improvement', subcategory: 'HOME_IMPROVEMENT_HARDWARE' },
        { custom_category: 'Home Improvement', subcategory: 'HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE' },
        { custom_category: 'Home Improvement', subcategory: 'HOME_IMPROVEMENT_SECURITY' },
        { custom_category: 'Home Improvement', subcategory: 'HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT' },
        
        { custom_category: 'Medical', subcategory: 'MEDICAL_DENTAL_CARE' },
        { custom_category: 'Medical', subcategory: 'MEDICAL_EYE_CARE' },
        { custom_category: 'Medical', subcategory: 'MEDICAL_NURSING_CARE' },
        { custom_category: 'Medical', subcategory: 'MEDICAL_PHARMACIES_AND_SUPPLEMENTS' },
        { custom_category: 'Medical', subcategory: 'MEDICAL_PRIMARY_CARE' },
        { custom_category: 'Medical', subcategory: 'MEDICAL_VETERINARY_SERVICES' },
        { custom_category: 'Medical', subcategory: 'MEDICAL_OTHER_MEDICAL' },
        
        { custom_category: 'Personal Care', subcategory: 'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS' },
        { custom_category: 'Personal Care', subcategory: 'PERSONAL_CARE_HAIR_AND_BEAUTY' },
        { custom_category: 'Personal Care', subcategory: 'PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING' },
        { custom_category: 'Personal Care', subcategory: 'PERSONAL_CARE_OTHER_PERSONAL_CARE' },
        
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_AUTOMOTIVE' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_CHILDCARE' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_CONSULTING_AND_LEGAL' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_EDUCATION' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_INSURANCE' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_POSTAGE_AND_SHIPPING' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_STORAGE' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_OTHER_GENERAL_SERVICES' },
        
        { custom_category: 'Government and Non-Profit', subcategory: 'GOVERNMENT_AND_NON_PROFIT_DONATIONS' },
        { custom_category: 'Government and Non-Profit', subcategory: 'GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES' },
        { custom_category: 'Government and Non-Profit', subcategory: 'GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT' },
        { custom_category: 'Government and Non-Profit', subcategory: 'GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT' },
        
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_BIKES_AND_SCOOTERS' },
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_GAS' },
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_PARKING' },
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_PUBLIC_TRANSIT' },
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES' },
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_TOLLS' },
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_OTHER_TRANSPORTATION' },
        
        { custom_category: 'Travel', subcategory: 'TRAVEL_FLIGHTS' },
        { custom_category: 'Travel', subcategory: 'TRAVEL_LODGING' },
        { custom_category: 'Travel', subcategory: 'TRAVEL_RENTAL_CARS' },
        { custom_category: 'Travel', subcategory: 'TRAVEL_OTHER_TRAVEL' },
        
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY' },
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_INTERNET_AND_CABLE' },
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_RENT' },
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT' },
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_TELEPHONE' },
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_WATER' },
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_OTHER_UTILITIES' },
        
        // Add catch-all OTHER categories for each main category
        { custom_category: 'Food and Drink', subcategory: 'FOOD_AND_DRINK_OTHER' },
        { custom_category: 'Transportation', subcategory: 'TRANSPORTATION_OTHER' },
        { custom_category: 'Entertainment', subcategory: 'ENTERTAINMENT_OTHER' },
        { custom_category: 'General Merchandise', subcategory: 'GENERAL_MERCHANDISE_OTHER' },
        { custom_category: 'General Services', subcategory: 'GENERAL_SERVICES_OTHER' },
        { custom_category: 'Medical', subcategory: 'MEDICAL_OTHER' },
        { custom_category: 'Personal Care', subcategory: 'PERSONAL_CARE_OTHER' },
        { custom_category: 'Home Improvement', subcategory: 'HOME_IMPROVEMENT_OTHER' },
        { custom_category: 'Bank Fees', subcategory: 'BANK_FEES_OTHER' },
        { custom_category: 'Loan Payments', subcategory: 'LOAN_PAYMENTS_OTHER' },
        { custom_category: 'Transfer In', subcategory: 'TRANSFER_IN_OTHER' },
        { custom_category: 'Transfer Out', subcategory: 'TRANSFER_OUT_OTHER' },
        { custom_category: 'Income', subcategory: 'INCOME_OTHER' },
        { custom_category: 'Government and Non-Profit', subcategory: 'GOVERNMENT_AND_NON_PROFIT_OTHER' },
        { custom_category: 'Travel', subcategory: 'TRAVEL_OTHER' },
        { custom_category: 'Rent and Utilities', subcategory: 'RENT_AND_UTILITIES_OTHER' },
        
        // General catch-all category
        { custom_category: 'Other', subcategory: 'OTHER' },
        { custom_category: 'Other', subcategory: 'UNCATEGORIZED' },
        { custom_category: 'Other', subcategory: 'UNKNOWN' },
      ];

      console.log(`Adding ${defaultCategories.length} default categories...`);

      // Check which categories already exist for this user
      const { data: existingCategories, error: existingError } = await supabase
        .from('categories')
        .select('custom_category, subcategory')
        .eq('user_id', userId);

      if (existingError) {
        throw existingError;
      }

      // Create a set of existing category-subcategory combinations
      const existingCombos = new Set(
        existingCategories?.map(cat => `${cat.custom_category}|${cat.subcategory}`) || []
      );

      // Filter out categories that already exist
      const categoriesToAdd = defaultCategories.filter(cat => 
        !existingCombos.has(`${cat.custom_category}|${cat.subcategory}`)
      );

      if (categoriesToAdd.length === 0) {
        setCategoryMessage('All default categories already exist! 📂');
        setTimeout(() => setCategoryMessage(null), 3000);
        return;
      }

      console.log(`Adding ${categoriesToAdd.length} new categories (${defaultCategories.length - categoriesToAdd.length} already exist)`);

      // Prepare the data for insertion
      const categoriesWithUserId = categoriesToAdd.map(cat => ({
        user_id: userId,
        custom_category: cat.custom_category,
        subcategory: cat.subcategory,
        created_at: new Date().toISOString()
      }));

      console.log('Sample categories to insert:', categoriesWithUserId.slice(0, 3));

      // Insert all new categories in batches
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < categoriesWithUserId.length; i += batchSize) {
        batches.push(categoriesWithUserId.slice(i, i + batchSize));
      }

      console.log(`Inserting categories in ${batches.length} batches...`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Inserting batch ${i + 1}/${batches.length} (${batch.length} categories)...`);
        
        const { error: insertError } = await supabase
          .from('categories')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${i + 1}:`, insertError);
          throw insertError;
        }
        
        console.log(`Batch ${i + 1} inserted successfully`);
      }

      console.log('All categories inserted successfully, now updating transactions...');

      // Now update existing transactions with the new categories
      let totalUpdatedTransactions = 0;
      const updateResults = [];

      // Process updates sequentially to avoid overwhelming the database
      for (const cat of categoriesToAdd) {
        try {
          console.log(`Checking transactions for ${cat.custom_category} - ${cat.subcategory}...`);
          const updatedCount = await updateTransactionsWithNewCategory(
            cat.custom_category,
            cat.subcategory
          );
          updateResults.push({ category: cat.custom_category, subcategory: cat.subcategory, count: updatedCount });
          totalUpdatedTransactions += updatedCount;
        } catch (error) {
          console.error(`Error updating transactions for ${cat.custom_category} - ${cat.subcategory}:`, error);
          updateResults.push({ category: cat.custom_category, subcategory: cat.subcategory, count: 0, error: error.message });
        }
      }

      console.log('Transaction update results:', updateResults);
      console.log(`Total transactions updated: ${totalUpdatedTransactions}`);

      // Show success message with transaction update count
      if (totalUpdatedTransactions > 0) {
        setCategoryMessage(
          `✅ Successfully added ${categoriesToAdd.length} default categories and updated ${totalUpdatedTransactions} existing transaction${totalUpdatedTransactions !== 1 ? 's' : ''} with proper categories!`
        );
      } else {
        setCategoryMessage(
          `✅ Successfully added ${categoriesToAdd.length} default categories! Your transaction categorization options have been expanded.`
        );
      }

      // Refresh the categories list
      console.log('Refreshing categories list...');
      await fetchCategories();

      setTimeout(() => setCategoryMessage(null), 7000);

    } catch (error) {
      console.error('Error adding default categories:', error);
      setCategoryMessage(`Error adding default categories: ${error.message}`);
      setTimeout(() => setCategoryMessage(null), 5000);
    } finally {
      setAddingCategory(false);
    }
  };

  // Update the categories header section in renderCategories()
  const renderCategories = () => (
    <div className="tab-content">
      <div className="categories-header">
        <h3>Your Transaction Categories</h3>
        <div className="categories-actions">
          <button 
            className="add-default-categories-btn" 
            onClick={addDefaultCategories}
            disabled={addingCategory}
            title="Add standard financial categories"
          >
            {addingCategory ? (
              <>
                <div className="button-spinner"></div>
                Adding...
              </>
            ) : (
              '📂 Add Default Categories'
            )}
          </button>
          <button 
            className="add-category-btn" 
            onClick={() => setShowAddCategory(true)}
          >
            + Add Custom Category
          </button>
        </div>
      </div>

      {/* Category Message */}
      {categoryMessage && (
        <div className={`category-alert ${categoryMessage.includes('Error') ? 'error' : 'success'}`}>
          {categoryMessage}
        </div>
      )}

      {deleteConfirm && (
      <div className="delete-overlay">
        <div className="delete-dialog">
          <div className="delete-header">
            <h4>⚠️ Delete Category</h4>
          </div>
          <div className="delete-content">
            <p>Are you sure you want to delete the category <strong>"{deleteConfirm.categoryName}"</strong>?</p>
            <p>This will permanently remove:</p>
            <ul className="delete-list">
              {deleteConfirm.subcategories.map((sub, index) => (
                <li key={index}>{sub}</li>
              ))}
            </ul>
            <p className="delete-warning">This action cannot be undone.</p>
          </div>
          <div className="delete-actions">
            <button 
              onClick={() => deleteCategory(deleteConfirm.categoryName)}
              disabled={deleting}
              className="delete-confirm-btn"
            >
              {deleting ? (
                <>
                  <div className="button-spinner"></div>
                  Deleting...
                </>
              ) : (
                'Delete Category'
              )}
            </button>
            <button 
              onClick={() => setDeleteConfirm(null)}
              className="delete-cancel-btn"
              disabled={deleting}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="add-category-form">
          <div className="form-header">
            <h4>Add New Category</h4>
            <button 
              className="close-btn"
              onClick={() => setShowAddCategory(false)}
            >
              ×
            </button>
          </div>
          
          <div className="form-content">
            <div className="form-group">
              <label htmlFor="main-category">Main Category *</label>
              <input
                id="main-category"
                type="text"
                placeholder="e.g., Food & Dining, Transportation, Entertainment"
                value={newCategory.custom_category}
                onChange={(e) => setNewCategory({...newCategory, custom_category: e.target.value})}
                className="category-input"
                disabled={addingCategory}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="subcategory">Subcategory *</label>
              <input
                id="subcategory"
                type="text"
                placeholder="e.g., Restaurants, Gas Stations, Movies"
                value={newCategory.subcategory}
                onChange={(e) => setNewCategory({...newCategory, subcategory: e.target.value})}
                className="category-input"
                disabled={addingCategory}
              />
            </div>
            
            <div className="form-actions">
              <button 
                onClick={addCustomCategory}
                disabled={addingCategory || !newCategory.custom_category.trim() || !newCategory.subcategory.trim()}
                className="save-category-btn"
              >
                {addingCategory ? (
                  <>
                    <div className="button-spinner"></div>
                    Adding...
                  </>
                ) : (
                  '+ Add Category'
                )}
              </button>
              <button 
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory({ custom_category: '', subcategory: '' });
                }}
                className="cancel-category-btn"
                disabled={addingCategory}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {categoriesLoading && !showAddCategory && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading categories...</p>
        </div>
      )}
      
      {/* Empty State */}
      {categoryGroups.length === 0 && !showAddCategory && !categoriesLoading ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h4>No categories found</h4>
          <p>Create your first category to start organizing your budget and goals.</p>
          <button onClick={() => setShowAddCategory(true)} className="connect-btn">
            Create Category
          </button>
          <div className="or-divider">
            <span>or</span>
          </div>
          <button 
            onClick={addDefaultCategories} 
            className="connect-btn secondary"
            disabled={addingCategory}
          >
            {addingCategory ? (
              <>
                <div className="button-spinner"></div>
                Adding Default Categories...
              </>
            ) : (
              '📂 Add Default Categories'
            )}
          </button>
        </div>
      ) : (
        // Categories List - only show if not loading and has categories
        !categoriesLoading && categoryGroups.length > 0 && (
          <div className="categories-overview">
            <div className="categories-list">
              {categoryGroups.map((group, index) => (
                <div key={group.custom_category} className="category-group">
                  <div className="category-header">
                    <div className="category-main">
                      <div className="category-name">{group.custom_category}</div>
                      <div className="category-count">{group.count} entries</div>
                    </div>
                    <div className="category-budget">
                      <div className="budget-input-container">
                        <div className="input-group">
                          <span className="input-prefix">$</span>
                          <input
                            type="number"
                            value={allocationDisplays[group.custom_category] || '0.00'}
                            onChange={(e) => setAllocationDisplays(prev => ({
                              ...prev,
                              [group.custom_category]: e.target.value
                            }))} // Just update display, don't convert
                            onBlur={(e) => handleAllocationBlur(group.custom_category, e.target.value)} // Convert when user finishes editing
                            placeholder="0.00"
                            className="category-budget-input"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div className="budget-percentage">
                        {getDisplayIncome() > 0 ? ((getDisplayAllocation(group.weeklyAllocation || 0) / getDisplayIncome()) * 100).toFixed(1) : 0}% of income
                      </div>
                    </div>
                    <button 
                      className="delete-category-btn"
                      onClick={() => setDeleteConfirm({
                        show: true,
                        categoryName: group.custom_category,
                        subcategories: group.subcategories
                      })}
                      title="Delete category"
                      disabled={deleting}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="subcategories-container">
                    <div className="subcategories-list">
                      {group.subcategories.map((subcategory, subIndex) => (
                        <div key={`${group.custom_category}-${subcategory}-${subIndex}`} className="subcategory-tag">
                          {subcategory}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );

  const setCategoryAllocation = (custom_category: string, amount: number) => {
    setCategoryGroups(prevGroups =>
      prevGroups.map(group =>
        group.custom_category === custom_category
          ? { ...group, allocation: amount }
          : group
      )
    );
    
    // Also update the allocations state
    setCategoryAllocations(prev => ({
      ...prev,
      [custom_category]: amount
    }));
  }

  const updateBudgetCategory = (id: string, amount: number) => {
    setBudgetCategories(prev => 
      prev.map(cat => cat.id === id ? { ...cat, amount } : cat)
    );
  };

  const getTotalBudget = () => {
    const totalWeeklyBudget = categoryGroups.reduce((sum, group) => sum + (group.weeklyAllocation || 0), 0);
    return getDisplayAllocation(totalWeeklyBudget);
  };

  const getRemainingIncome = () => {
    return getDisplayIncome() - getTotalBudget();
  };

  const getBudgetPercentage = (displayAmount: number) => {
    const displayIncome = getDisplayIncome();
    return displayIncome > 0 ? (displayAmount / displayIncome) * 100 : 0;
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

  // Update the saveBudgetData function to include income in category records
  const saveBudgetData = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Convert display income to weekly rate before saving
      const weeklyIncomeToSave = convertDisplayToWeekly(parseFloat(incomeDisplay) || 0);
      
      console.log('Saving income conversion:');
      console.log(`Display income (${budgetPeriod}): $${incomeDisplay}`);
      console.log(`Weekly income to save: $${weeklyIncomeToSave.toFixed(2)}`);

      // Save main income record (category = null, amount = null)
      const { data: existingMainData, error: existingMainError } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .is('category', null)
        .maybeSingle();

      if (existingMainError && existingMainError.code !== 'PGRST116') {
        console.error('Error checking existing main data:', existingMainError);
        throw existingMainError;
      }

      if (existingMainData) {
        // Update existing income record
        const { error: updateError } = await supabase
          .from('goals')
          .update({
            income: weeklyIncomeToSave
          })
          .eq('id', existingMainData.id);
        
        if (updateError) {
          console.error('Error updating income:', updateError);
          throw updateError;
        }
        console.log('Updated income record');
      } else {
        // Insert new income record
        const { error: insertError } = await supabase
          .from('goals')
          .insert([{
            user_id: userId,
            income: weeklyIncomeToSave,
            category: null,
            amount: null
          }]);
        
        if (insertError) {
          console.error('Error inserting income:', insertError);
          throw insertError;
        }
        console.log('Inserted new income record');
      }

      // Save each category allocation separately
      for (const group of categoryGroups) {
        const displayAmount = parseFloat(allocationDisplays[group.custom_category] || '0') || 0;
        const weeklyAllocationToSave = convertDisplayToWeekly(displayAmount);
        
        console.log(`Saving ${group.custom_category} allocation conversion:`);
        console.log(`Display amount (${budgetPeriod}): $${displayAmount.toFixed(2)}`);
        console.log(`Weekly allocation to save: $${weeklyAllocationToSave.toFixed(2)}`);

        if (weeklyAllocationToSave > 0) {
          // Check if this category allocation already exists
          const { data: existingCategoryData, error: existingCategoryError } = await supabase
            .from('goals')
            .select('id')
            .eq('user_id', userId)
            .eq('category', group.custom_category)
            .maybeSingle();

          if (existingCategoryError && existingCategoryError.code !== 'PGRST116') {
            console.error('Error checking existing category data:', existingCategoryError);
            throw existingCategoryError;
          }

          if (existingCategoryData) {
            // Update existing category allocation - include income
            const { error: updateError } = await supabase
              .from('goals')
              .update({
                income: weeklyIncomeToSave, // Include the income in category records
                amount: weeklyAllocationToSave
              })
              .eq('id', existingCategoryData.id);
            
            if (updateError) {
              console.error(`Error updating ${group.custom_category}:`, updateError);
              throw updateError;
            }
            console.log(`Updated ${group.custom_category} allocation with income`);
          } else {
            // Insert new category allocation - include income
            const { error: insertError } = await supabase
              .from('goals')
              .insert([{
                user_id: userId,
                income: weeklyIncomeToSave, // Include the income in category records
                category: group.custom_category,
                amount: weeklyAllocationToSave
              }]);
            
            if (insertError) {
              console.error(`Error inserting ${group.custom_category}:`, insertError);
              throw insertError;
            }
            console.log(`Inserted ${group.custom_category} allocation with income`);
          }
        } else {
          // If allocation is 0, delete the record if it exists
          const { error: deleteError } = await supabase
            .from('goals')
            .delete()
            .eq('user_id', userId)
            .eq('category', group.custom_category);
          
          if (deleteError) {
            console.error(`Error deleting ${group.custom_category}:`, deleteError);
            // Don't throw here, just log the error
          } else {
            console.log(`Deleted ${group.custom_category} allocation (was zero)`);
          }
        }
      }

      // Update the local state to match what was saved
      setWeeklyIncome(weeklyIncomeToSave);
      
      // Update category groups with the converted weekly allocations
      setCategoryGroups(prevGroups =>
        prevGroups.map(group => {
          const displayAmount = parseFloat(allocationDisplays[group.custom_category] || '0') || 0;
          const weeklyAmount = convertDisplayToWeekly(displayAmount);
          return {
            ...group,
            weeklyAllocation: weeklyAmount
          };
        })
      );

      // Update category allocations state
      const newWeeklyAllocations: Record<string, number> = {};
      categoryGroups.forEach(group => {
        const displayAmount = parseFloat(allocationDisplays[group.custom_category] || '0') || 0;
        newWeeklyAllocations[group.custom_category] = convertDisplayToWeekly(displayAmount);
      });
      setCategoryAllocations(newWeeklyAllocations);

      console.log('Budget saved successfully with weekly conversions!');
      setSaveMessage('Budget saved successfully! 💾');
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (error) {
      console.error('Error saving budget:', error);
      setSaveMessage('Error saving budget. Please try again.');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setSaving(false);
    }
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
                value={incomeDisplay}
                onChange={(e) => setIncomeDisplay(e.target.value)} // Just update display, don't convert
                onBlur={(e) => handleIncomeBlur(e.target.value)} // Convert when user finishes editing
                placeholder="0.00"
                className="income-field"
                step="0.01"
              />
            </div>
            {weeklyIncome > 0 && (
              <div className="income-breakdown">
                <span>Weekly: ${weeklyIncome.toFixed(2)}</span>
                <span>Monthly: ${(weeklyIncome * 4.33).toFixed(2)}</span>
                <span>Yearly: ${(weeklyIncome * 52).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Budget Categories */}
        <div className="section-card">
          
          <div>
            {renderCategories()}
          </div>

          {/* Save Button and Message */}
          {saveMessage && (
            <div className={`save-alert ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}

          <div className="save-section">
            <button 
              onClick={saveBudgetData}
              disabled={saving}
              className="save-budget-btn"
            >
              {saving ? (
                <>
                  <div className="button-spinner"></div>
                  Saving Budget...
                </>
              ) : (
                <>
                  💾 Save Budget
                </>
              )}
            </button>
            <p className="save-help">
              Save your income and budget categories. Values are stored as weekly rates and converted for display.
            </p>
          </div>

          {/* Budget Visualization */}
          {getDisplayIncome() > 0 && (
            <div className="budget-chart">
              <h4>Budget Breakdown ({budgetPeriod})</h4>
              <div className="budget-summary">
                <div className="budget-total">
                  <span>Total Income: ${getDisplayIncome().toFixed(2)}</span>
                  <span>Total Allocated: ${getTotalBudget().toFixed(2)}</span>
                  <span>Remaining: ${getRemainingIncome().toFixed(2)}</span>
                </div>
              </div>
              <div className="chart-container">
                {categoryGroups
                  .filter(group => (group.weeklyAllocation || 0) > 0)
                  .map(group => (
                    <div
                      key={group.custom_category}
                      className="chart-segment"
                      style={{
                        width: `${getBudgetPercentage(getDisplayAllocation(group.weeklyAllocation || 0))}%`,
                        backgroundColor: `hsl(${group.custom_category.length * 50}, 70%, 60%)`,
                      }}
                      title={`${group.custom_category}: $${getDisplayAllocation(group.weeklyAllocation || 0).toFixed(2)} (${getBudgetPercentage(getDisplayAllocation(group.weeklyAllocation || 0)).toFixed(1)}%)`}
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

// Update the groupCategoriesWithAllocations function
function groupCategoriesWithAllocations(categoriesData: Category[], weeklyAllocations: Record<string, number>): CategoryGroup[] {
  // Group categories by custom_category
  const grouped: CategoryGroup[] = [];
  categoriesData.forEach(category => {
    let group = grouped.find(g => g.custom_category === category.custom_category);
    if (!group) {
      group = {
        custom_category: category.custom_category,
        subcategories: [],
        count: 0,
        weeklyAllocation: weeklyAllocations[category.custom_category] || 0, // Store as weekly
      };
      grouped.push(group);
    }
    if (!group.subcategories.includes(category.subcategory)) {
      group.subcategories.push(category.subcategory);
      group.count += 1;
    }
  });
  // Sort subcategories within each group
  grouped.forEach(group => group.subcategories.sort());
  return grouped;
}

export default Goals;