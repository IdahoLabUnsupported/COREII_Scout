// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useContext, useEffect } from 'react';

import FormElementTextInput from '../components/forms/formElements/FormElementTextInput';
import FormElementCheckbox from '../components/forms/formElements/FormElementCheckbox';
import FormElementSelect, { SelectedItemType } from '../components/forms/formElements/FormElementSelect';
import { ThemeContextBlock } from '../contexts/ThemeContextBlock';
import CardStatusNested from '../components/cards/CardStatusNested';
import CardContent from '../components/cards/CardContent';
import ButtonBasic from '../components/elements/ButtonBasic';

const LayoutConfiguration: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContextBlock);
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    rePassword: '',
    notifications: false,
    theme: 'system',
  });

  useEffect(() => {
    // Set the initial theme based on system preference or user preference
    setUserData((prevState) => ({ ...prevState, theme }));
  }, [theme]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setUserData({
      ...userData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTheme = e.target.value;
    setUserData({
      ...userData,
      theme: selectedTheme,
    });

    // Update the theme context
    toggleTheme();
  };

  const handleSave = (section: string) => {
    // Handle save logic for each section
    console.log(`Saving ${section}`, userData);
  };

  const themeOptions: SelectedItemType[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System Default' }
  ];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex justify-between p-10 bg-gray-300 dark:bg-gray-925">
        <h1 className="text-3xl">Account Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        <CardStatusNested title={'Basic Info'} type="normal">
          <CardContent customPadding="">
            <div className="h-100 grid md:grid-cols-2 gap-4 md:gap-x-10">
              <FormElementTextInput
                label="First Name"
                value={userData.firstName}
                onChange={handleChange}
                name="firstName"
                placeholder="Enter your first name"
              />
              <FormElementTextInput
                label="Last Name"
                value={userData.lastName}
                onChange={handleChange}
                name="lastName"
                placeholder="Enter your last name"
              />
              <FormElementTextInput
                label="Email"
                value={userData.email}
                onChange={handleChange}
                name="email"
                type="email"
                placeholder="Enter your email"
              />
            </div>
            <div className="flex justify-end mt-4">
              <ButtonBasic
                label="Save Basic Info"
                onClick={() => handleSave('Basic Info')}
                color="btn-primary"
              />
            </div>
          </CardContent>
        </CardStatusNested>
        
        <CardStatusNested title={'Password'} type="normal">
          <CardContent customPadding="">
            <div className="h-100 grid md:grid-cols-2 gap-4 md:gap-x-10">
              <FormElementTextInput
                label="Password"
                value={userData.password}
                onChange={handleChange}
                name="password"
                type="password"
                placeholder="Enter your password"
              />
              <FormElementTextInput
                label="Re-enter Password"
                value={userData.rePassword}
                onChange={handleChange}
                name="rePassword"
                type="password"
                placeholder="Re-enter your password"
              />
            </div>
            <div className="flex justify-end mt-4">
              <ButtonBasic
                label="Save Password"
                onClick={() => handleSave('Password')}
                color="btn-primary"
              />
            </div>
          </CardContent>
        </CardStatusNested>

        <CardStatusNested title={'Preferences'} type="normal">
          <CardContent customClass="min-h-3">
            <div className="h-100 grid md:grid-cols-2 gap-4 md:gap-x-10">
              <FormElementSelect
                label="Theme"
                options={themeOptions}
                value={userData.theme}
                onChange={handleSelectChange}
                labelClassName="w-36 mr-5"
              />
              <div className="flex items-center">
                <span className="max-w-24 mr-8">Enable Notifications</span>
                <FormElementCheckbox
                  label="Enable Notifications"
                  value="notifications"
                  name="notifications"
                  checked={userData.notifications}
                  onChange={handleChange}
                  labelClassName='sr-only'
                />
                
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <ButtonBasic
                label="Save Preferences"
                onClick={() => handleSave('Preferences')}
                color="btn-primary"
              />
            </div>
          </CardContent>
        </CardStatusNested>
      </div>
    </div>
  );
};

export default LayoutConfiguration;
