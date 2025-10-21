// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import Hero from '../components/elements/Hero';
import CardContent from '../components/cards/CardContent';
import DialogCreateReport from '../components/dialogs/DialogCreateReport';
import ButtonBasic from '../components/elements/ButtonBasic.tsx';

const LayoutMainLanding: React.FC = () => {
  return (
    <div className="w-full h-full p-10">
      <Hero />
      <div className="mb-8">
        <h2 className="text-3xl font-semibold mb-4">Get Started</h2>
        <div className="grid grid-cols-3 gap-4">
        <CardContent>
            <div className="flex flex-col h-full justify-between text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Create an Open Source Report</h3>
                <span>Kickstart your report building with AI Enhanced efficiency and precision</span>
              </div>
              <div>
                <DialogCreateReport
                  title="Create a New Report"
                  buttonType="text"
                  buttonColor="btn-primary"
                  buttonLabel="Create New Report"
                />
              </div>
            </div>
          </CardContent>
          <CardContent>
            <div className="flex flex-col h-full justify-between text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Enhance your Incident Response</h3>
                <span>Collect your artifacts and generate reports to management or technical advisors</span>
              </div>
              <div>
                <ButtonBasic label="Collect Artifacts" color="btn-primary" />
              </div>
            </div>
          </CardContent>
          <CardContent>
            <div className="flex flex-col h-full justify-between text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Dive into Discovery</h3>
                <span>AI assistant to find relevant topics for your needs</span>
              </div>
              <div>
                <ButtonBasic label="Discover with AI" color="btn-primary" />
              </div>
            </div>
          </CardContent>
        </div>
      </div>
      <div>
        <h2 className="text-3xl font-semibold mb-4">Enhance Your Reporting Process</h2>
        <div className="grid grid-cols-3 gap-4">
          <CardContent>
            <div className="flex flex-col h-full justify-between text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Collaborate with Team Members</h3>
                <span>Collect your artifacts and generate reports to management or technical advisors</span>
              </div>
              <div>
                <ButtonBasic label="Share or Collaborate" color="btn-primary" />
              </div>
            </div>
          </CardContent>
          <CardContent>
            <div className="flex flex-col h-full justify-between text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Import a Report</h3>
                <span>Revisit reports to enhance or refresh the information</span>
              </div>
              <div>
                <ButtonBasic label="Import Report" color="btn-primary" />
              </div>
            </div>
          </CardContent>
          <CardContent>
            <div className="flex flex-col h-full justify-between text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-2">Configuration</h3>
                <span>Manage all of your topic domains and the AI agents involved</span>
              </div>
              <div>
                <ButtonBasic label="Configure the App" color="btn-primary" />
              </div>
            </div>
          </CardContent>
        </div>
      </div>
    </div>
  );
};

export default LayoutMainLanding;
