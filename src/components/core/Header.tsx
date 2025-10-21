// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch } from '../../../app/hooks/reduxTypescriptHooks';
import { appStateActions } from '../../../app/store';

interface HeaderProps {
  onLogout: () => void;
}

// Custom Components
import ThemeToggle from './ThemeToggle';
import ButtonIcon from '../../components/elements/ButtonIcon.tsx';

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const dispatch = useAppDispatch();
  const [accountDropdownIsOpen, setAccountDropdownIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAccountDropdownIsOpen(!accountDropdownIsOpen);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setAccountDropdownIsOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLinkClick = () => {
    dispatch(appStateActions.setSelectedReportIndex(null));
    setAccountDropdownIsOpen(false);
  };

  return (
    <>
      <div className="navbar bg-primary text-primary-content sticky top-0 z-[3000]">
        <Link to="/" className="btn btn-ghost ml-2 p-0 normal-case rounded-full border-none logo-btn">
          <img src={import.meta.env.BASE_URL + "/CyOTE_logo_23-0807_nostars.svg"} alt="CyOTE logo" className="h-8" />
        </Link>

        <Link to="/" className="btn btn-ghost px-2 mx-1 normal-case btn-sm text-xl text-white">
          COREII Scout
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
          <div className="dropdown" ref={dropdownRef}>
         
              <ButtonIcon label="Account" color="btn-ghost text-white" buttonIcon="account_circle" onClick={handleToggle} />
     
            {accountDropdownIsOpen && (
              <ul className="menu dropdown-content mt-2 right-0 dark:bg-gray-700 rounded-box p-2 shadow ">
                <li><Link to="/account" onClick={handleLinkClick}>Settings</Link></li>
                <li><Link to="/" onClick={() => onLogout()}>Logout</Link></li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
