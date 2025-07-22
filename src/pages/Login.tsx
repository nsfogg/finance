import React, { FormEvent } from 'react';
import { supabase } from '../supabaseClient';

const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async (e:FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isSignUp) {
      // Handle sign-up logic here
      const {error: signUpError} = await supabase.auth.signUp({email, password})
      if (signUpError) {
        console.error("Error signing up:", signUpError);
        return;
      } else {
        console.log("Sign-up successful");
      }
    } else {
      // Handle login logic here
      const {error: signInError} = await supabase.auth.signInWithPassword({email, password})
      if (signInError) {
        console.error("Error logging in:", signInError);
        return;
      } else {
        console.log("Login successful");
      }
    }
  }

  return (
    <div>
      <h2>{isSignUp ? 'Sign Up' : 'Log In'}</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">{isSignUp ? 'Sign Up' : 'Log In'}</button>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
        >{isSignUp ? 'Switch to Log In' : 'Switch to Sign Up'}</button>
      </form>
    </div>
  );
};

export default Login;