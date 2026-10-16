import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreeHeroScene } from '../components/ThreeHeroScene';

export function IntroPage() {
  const navigate = useNavigate();

  const handleLetsGo = () => {
    navigate('/home');
  };

  return <ThreeHeroScene onLetsGo={handleLetsGo} />;
}
