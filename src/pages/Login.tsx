import React, { FormEvent } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    
    if (isSignUp) {
      // Handle sign-up logic here
      const { error: signUpError } = await supabase.auth.signUp({
        email, 
        password, 
        options: {
          emailRedirectTo: 'https://nsfogg.github.io/finance/#/'
        }
      });
      if (signUpError) {
        console.error("Error signing up:", signUpError);
        setError(signUpError.message);
      } else {
        console.log("Sign-up successful");
        setMessage("Check your email for confirmation link!");
      }
    } else {
      // Handle login logic here
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.error("Error logging in:", signInError);
        setError(signInError.message);
      } else {
        console.log("Login successful");
        navigate('/');
      }
    }
    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="app-title">Budget</h1>
          <h2 className="form-title">{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="form-subtitle">
            {isSignUp 
              ? 'Sign up to start managing your finances' 
              : 'Sign in to your account'
            }
          </p>
        </div>
        
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email" 
              placeholder="Enter your email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              placeholder="Enter your password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading 
              ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
              : (isSignUp ? 'Create Account' : 'Sign In')
            }
          </button>
        </form>
        
        <div className="form-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="switch-btn"
            disabled={loading}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;