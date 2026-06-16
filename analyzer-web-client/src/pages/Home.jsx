import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitGraph, TrendingUp, Code2, Users } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { analyzeProfile } from '../api';
import './Home.css';

const Home = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (username) => {
    setIsLoading(true);
    setError(null);
    try {
      // Trigger the backend analysis
      await analyzeProfile(username);
      // If successful, navigate to the dashboard
      navigate(`/profile/${username}`);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'An error occurred while analyzing the profile.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home container">
      <div className="hero">
        <div className="hero-icon-wrapper">
          <GitGraph size={64} className="hero-icon" />
        </div>
        <h1 className="hero-title">
          Uncover Deep <span className="text-gradient">Insights</span> from any GitHub Profile
        </h1>
        <p className="hero-subtitle text-secondary">
          Get comprehensive analytics, language distribution, and activity metrics
          in seconds.
        </p>

        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="error-message glass-panel">
            {error}
          </div>
        )}
      </div>

      <div className="features grid">
        <div className="feature-card glass-panel">
          <div className="feature-icon-wrapper purple">
            <TrendingUp size={24} />
          </div>
          <h3>Performance Metrics</h3>
          <p className="text-secondary">Track total stars, forks, and repository engagement across the entire profile.</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon-wrapper cyan">
            <Code2 size={24} />
          </div>
          <h3>Language Analytics</h3>
          <p className="text-secondary">Visualize the primary programming languages and technologies used.</p>
        </div>
        <div className="feature-card glass-panel">
          <div className="feature-icon-wrapper pink">
            <Users size={24} />
          </div>
          <h3>Network Insights</h3>
          <p className="text-secondary">Analyze follower growth and community reach.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
