// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState } from 'react';

const userContext: React.FC = () => {

    return (
        <div className="max-w-xs mx-auto mt-10">
            {/* TODO: Change to a select and load from config or store. Dont hardcode roles here. */}
            <div className="bg-gray-200 shadow-md rounded p-4 m-5">
                UserRole
            </div>
        </div>
    );
};

export default userContext;