// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import CardContent from '../components/cards/CardContent';
import CardStatusNested from '../components/cards/CardStatusNested';
import FormElementSelect from '../components/forms/formElements/FormElementSelect';
import FormElementCheckbox from '../components/forms/formElements/FormElementCheckbox';
import ButtonBasic from '../components/elements/ButtonBasic';
import { Link } from 'react-router-dom'; 

const articleTopics = [
  { id: '1', title: 'Discord Invite Link Hijacking Delivers AsyncRAT and Skuld Stealer Targeting Crypto Wallets', topics: '3', related: '13', url: '' },
  { id: '2', title: 'Ghost in the Router: China-Nexus Espionage Actor UNC3886 Targets Juniper Routers', topics: '6', related: '36', url: '' },
];
const assignedTopics = [
  { id: '1', title: 'Intel Brief Name 1 ', topics: '5', related: '28', url: '' },
  { id: '2', title: 'Intel Brief Name 2', topics: '4', related: '24', url: '' },
];

const ViewTopicsUserSpecific: React.FC = () => {
  return (
   <>
      <div className="p-6 flex-col w-full grid gap-4">
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1">
            <CardStatusNested title={'Articles Topics from Source Lists'} type="normal" className="flex">
              <div className="mb-4 mr-4 flex absolute right-1 top-3"></div>
              {articleTopics.map(article => (
                <Link key={article.id} to={article.url}>
                  <CardContent customPadding='p-4' customClass={`min-h-[50px] mt-4 hover:bg-primary dark:hover:bg-primary-inactive`}>
                    <div className="flex justify-between mt-2">
                      <div className="flex-grow flex items-center space-x-4">
                        {article.title}
                      </div>
                      <div className="flex items-center space-x-4">
                        Topics Found:
                        <span className="bg-secondary text-white text-sm font-semibold mr-2 px-2.5 py-0.5 rounded-full ml-2">
                          {article.topics}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        Related Articles:
                        <span className="bg-secondary text-white text-sm font-semibold mr-2 px-2.5 py-0.5 rounded-full ml-2">
                          {article.related}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              ))}
            </CardStatusNested>
          </div>
          <div className="grid grid-cols-1 mt-8">
            <CardStatusNested title={'Assigned Topics'} type="normal" className="flex">
              <div className="mb-4 mr-4 flex absolute right-1 top-3">
                <ButtonBasic label="Add Topic" color={'btn-primary'} buttonSize="btn-sm" />
              </div>
              {assignedTopics.map(topic => (
                <Link key={topic.id} to={topic.url}>
                  <CardContent customPadding='p-4' customClass={`min-h-[50px] mt-4 hover:bg-primary dark:hover:bg-primary-inactive `}>
                    <div className="flex justify-between mt-2">
                      <div className="flex-grow flex items-center space-x-4">
                        {topic.title}
                      </div>
                      <div className="flex items-center space-x-4">
                        Topics Found:
                        <span className="bg-secondary text-white text-sm font-semibold mr-2 px-2.5 py-0.5 rounded-full ml-2">
                          {topic.topics}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        Related Articles:
                        <span className="bg-secondary text-white text-sm font-semibold mr-2 px-2.5 py-0.5 rounded-full ml-2">
                          {topic.related}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              ))}
            </CardStatusNested>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewTopicsUserSpecific;