// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';

//Custom Components
import ButtonBasic from '../elements/ButtonBasic';

type Props = object;

const Hero: React.FC<Props> = () => {
  return (
    <>
      <div className="wrapper -mx-10 -mt-10 mb-10 bg-gray-300 dark:bg-gray-925">
        <div className="hero min-h-64 bg-base-200 w-full">
          <div className="hero-content">
            <div className="py-8 pl-8 pr-4 flex align-middle">
              <img className="" src={import.meta.env.BASE_URL + "/CyOTE_logo_23-0807.svg"} width="200" alt="CyOTE logo" />
            </div>
            <div className="py-8 pl-4 pr-8">
              <h1 className="text-5xl font-bold">COREII Scout</h1>
              <p className="py-6">Welcome to the COREII Scout. Easily select data sources, apply ML models to input data, create AI generated reports with minimal need for editing, and access other Scout generated reports.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
      
export default Hero;
