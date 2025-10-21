// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import { useLoginMutation, useRegisterMutation } from '../../app/services/client';
import { storeToken } from '../../app/utils/authUtils';
import ButtonBasic from '../components/elements/ButtonBasic.tsx';
import FormElementTextInput from '../components/forms/formElements/FormElementTextInput.tsx';
import ThemeToggle from '../components/core/ThemeToggle.tsx';

interface LoginProps {
  onAuthenticate: () => void;
}

const LayoutLogin: React.FC<LoginProps> = ({ onAuthenticate }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [reenteredPassword, setReenteredPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [isForgotPasswordView, setIsForgotPasswordView] = useState(false);
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [login, { isLoading: isLoggingIn, data: loginData }] = useLoginMutation();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();

  useEffect(() => {
    if (loginData?.sessionToken) {
      storeToken(loginData.sessionToken);
      onAuthenticate();
    }
  }, [loginData, onAuthenticate]);

  const validateName = (name: string) => /^[a-zA-Z\s]+$/.test(name);
  const validateEmail = (email: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validatePassword = (password: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);

  const validateInputs = () => {
    const errors = {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    };

    if (!validateEmail(email)) {
      errors.email = "Email address is invalid.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    if (!isLoginView) { // Only validate if registering
      if (!validateName(firstName)) {
        errors.firstName = "First name is invalid. It should only contain letters and spaces.";
      }

      if (!validateName(lastName)) {
        errors.lastName = "Last name is invalid. It should only contain letters and spaces.";
      }

      if (password !== reenteredPassword) {
        errors.password = "Passwords do not match.";
      }

      if (!validatePassword(password)) {
        errors.password = "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
      }
    }

    return errors;
  };

  const handleLoginClick = async () => {
    const errors = validateInputs();

    if (errors.email || errors.password) {
      setEmailError(errors.email);
      setPasswordError(errors.password);
      return;
    }

    try {
      const { sessionToken } = await login({ email, password }).unwrap();
      storeToken(sessionToken);
      onAuthenticate();
    } catch (error) {
      setPasswordError("Invalid email or password.");
    }
  };

  const handleRegisterClick = async () => {
    const errors = validateInputs();

    setFirstNameError(errors.firstName);
    setLastNameError(errors.lastName);
    setEmailError(errors.email);
    setPasswordError(errors.password);

    if (errors.firstName || errors.lastName || errors.email || errors.password) {
      return;
    }

    // Proceed with registration API call
    try {
      await register({ firstName, lastName, email, password }).unwrap();
      setIsLoginView(true);
    } catch (error: any) {
      // Assuming error.message contains the message from the backend
      if (error?.data?.message === "Email already in use") {
        setEmailError("This email is already associated with an account.");
      } else {
        setEmailError("Registration failed. Please try again.");
      }
    }
  };

  const handleForgotPasswordClick = async () => {
    if (!validateEmail(email)) {
      setEmailError("Email address is invalid.");
      return;
    }

    try {
      // Call forgot password API
      alert("Password reset instructions have been sent to your email.");
      setIsForgotPasswordView(false);
    } catch (error) {
      setEmailError("Failed to reset password. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <>
      <div className="w-screen h-screen overflow-hidden flex">
        <div className="absolute z-30 top-2 right-2">
          <ThemeToggle />
        </div>
        <div className="w-screen h-screen absolute top-0 left-0 inset-0 z-10 bg-black bg-opacity-20">
          {/* Horizontal gradient for lg and above */}
          <div className="hidden lg:block h-full w-full" style={{ backgroundImage: 'linear-gradient(to right, transparent, transparent 55%, #000000 75%, #000000)' }}></div>
          {/* Vertical gradient for mobile to md */}
          <div className="block lg:hidden h-full w-full" style={{ backgroundImage: 'linear-gradient(to bottom, transparent, transparent 45%, #000000 60%, #000000)' }}></div>
        </div>
        <div className="w-full h-4/6 lg:h-screen lg:w-9/12 bg-cover bg-center relative" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}AdobeStock_1298095622.jpeg)` }} />
        <div className="absolute w-full h-3/6 sm:h-7/12 lg:h-full lg:left-0 lg:top-0 lg:ml-auto lg:w-7/12 xl:w-8/12 bg-cover bg-center flex flex-col items-center z-10 p-10">
          <div className="lg:absolute lg:top-44 lg:left-24 z-20 p-4 rounded-lg backdrop-blur-sm" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0) 0%, transparent 60%, transparent)' }}>
            <div className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-blue-100 font-montserrat text-6xl xl:text-8xl font-extrabold tracking-wide leading-tight">
              Scout
            </div>
          </div>
          <div className="lg:absolute lg:bottom-10 lg:right-0 z-20 p-4 rounded-lg backdrop-blur-sm inset lg:m-20 lg:mr-28" style={{ background: 'radial-gradient(circle, rgba(255, 255, 255, 0) 0%, transparent 60%, transparent)' }}>
            <div className="flex flex-col text-transparent bg-clip-text bg-gradient-to-r from-blue-100 via-primary to-primary font-montserrat">
              <div className="text-lg sm:text-xl md:text-2xl xl:text-4xl font-extrabold tracking-wide leading-tight mr-20">
                Precision Cyber Reports,
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl xl:text-5xl font-extrabold tracking-wide leading-tight self-end" style={{ marginLeft: '20px' }}>
                simplified
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 h-3/6 w-full sm:h-7/12 lg:h-full lg:right-0 lg:top-0 lg:w-6/12 xl:w-5/12 ml-auto flex justify-center items-center z-10 p-10">
        <div className="bg-gray-300 dark:bg-gray-800 shadow-lg rounded-lg p-8 min-w-[500px] max-w-[500px] z-10">
          {isLoginView && !isForgotPasswordView && (
            <div onKeyDown={(e) => handleKeyDown(e, handleLoginClick)}>
              <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
              <div className="flex flex-col gap-4 mb-8">
                <FormElementTextInput
                  label="Email"
                  type="email"
                  name="email"
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleLoginClick)}
                  ariaLabel="Email Address"
                />
                <FormElementTextInput
                  label="Password"
                  type="password"
                  name="password"
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleLoginClick)}
                  ariaLabel="Password"
                />
                <div id="auth-error-box">
                  {emailError && <div className="text-red-500">{emailError}</div>}
                  {passwordError && <div className="text-red-500">{passwordError}</div>}
                </div>
              </div>
              <div tabIndex={0} className="flex justify-end">
                <ButtonBasic label="Login" color="btn-primary" onClick={handleLoginClick} />
              </div>
              <div className="flex justify-between mt-4">
                <button tabIndex={0} className="text-gray-800 dark:text-white hover:text-primary" type="button" onClick={() => setIsForgotPasswordView(true)}>
                  Forgot Password?
                </button>
                <button tabIndex={0} className="text-gray-800 dark:text-white hover:text-primary" type="button" onClick={() => setIsLoginView(false)}>
                  Register
                </button>
              </div>
            </div>
          )}
          {!isLoginView && (
            <div onKeyDown={(e) => handleKeyDown(e, handleRegisterClick)}>
              <h2 className="text-3xl font-bold mb-6 text-center">Register</h2>
              <div className="flex flex-col gap-4 mb-8">
                <FormElementTextInput
                  label="First Name"
                  type="text"
                  name="firstName"
                  id="register-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  ariaLabel="First Name"
                />
                <FormElementTextInput
                  label="Last Name"
                  type="text"
                  name="lastName"
                  id="register-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  ariaLabel="Last Name"
                />
                <FormElementTextInput
                  label="Email"
                  type="email"
                  name="email"
                  id="register-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  ariaLabel="Email Address"
                />
                <FormElementTextInput
                  label="Password"
                  type="password"
                  name="password"
                  id="register-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  ariaLabel="Password"
                />
                <FormElementTextInput
                  label="Re-enter Password"
                  type="password"
                  name="reenteredPassword"
                  id="register-reentered-password"
                  value={reenteredPassword}
                  onChange={(e) => setReenteredPassword(e.target.value)}
                  ariaLabel="Re-enter Password"
                />
                <div id="auth-error-box">
                  {firstNameError && <div className="text-red-500">{firstNameError}</div>}
                  {lastNameError && <div className="text-red-500">{lastNameError}</div>}
                  {emailError && <div className="text-red-500">{emailError}</div>}
                  {passwordError && <div className="text-red-500">{passwordError}</div>}
                </div>
              </div>
              <div className="flex justify-end">
                <ButtonBasic label="Register" color="btn-primary" onClick={handleRegisterClick} />
              </div>
              <div className="flex justify-center mt-4">
                <button tabIndex={0} className="text-gray-800 dark:text-white hover:text-primary" type="button" onClick={() => setIsLoginView(true)}>
                  Back to Login
                </button>
              </div>
            </div>
          )}
          {isForgotPasswordView && (
            <div onKeyDown={(e) => handleKeyDown(e, handleForgotPasswordClick)}>
              <h2 className="text-3xl font-bold mb-6 text-center">Forgot Password</h2>
              <div className="flex flex-col gap-4 mb-8">
                <FormElementTextInput
                  label="Email"
                  type="email"
                  name="email"
                  id="forgot-password-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  ariaLabel="Email Address"
                />
                <div id="auth-error-box">
                  {emailError && <div className="text-red-500">{emailError}</div>}
                </div>
              </div>
              <div className="flex justify-end">
                <ButtonBasic label="Reset Password" color="btn-primary" onClick={handleForgotPasswordClick} />
              </div>
              <div className="flex justify-center mt-4">
                <button tabIndex={0} className="text-gray-800 dark:text-white hover:text-primary" type="button" onClick={() => setIsForgotPasswordView(false)}>
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LayoutLogin;
