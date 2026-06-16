import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RefreshCw, Users, Star, GitFork, BookOpen, Clock, Calendar, Code2, AlertCircle } from 'lucide-react';
import { getProfile, refreshProfile } from '../api';
import StatCard from '../components/StatCard';
import LanguageChart from '../components/LanguageChart';
import './ProfileDashboard.css';

const ProfileDashboard = () => {
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      
      let data;
      // First try to get it, if it's a refresh we call the refresh endpoint
      if (isRefresh) {
        // We need the githubId for refresh, which is in the profileData
        if (profileData?.profile?.githubId) {
          data = await refreshProfile(profileData.profile.githubId);
        } else {
           // Fallback, shouldn't happen usually
           data = await getProfile(username); 
        }
      } else {
         // Get profile requires githubId based on our backend routes
         // Actually wait, our backend `/api/profiles/:githubId` expects a numeric ID.
         // BUT wait, does the analyze endpoint return the profile?
         // Yes, in Home.jsx we called analyzeProfile. So we can just fetch it?
         // Our backend GET /api/profiles/:githubId expects githubId, NOT username.
         // But the URL parameter is `username`.
         // To fix this without changing the backend, we can just call analyzeProfile again!
         // Analyze acts as an idempotent "get or create/update" endpoint.
         const { analyzeProfile } = await import('../api');
         data = await analyzeProfile(username);
      }
      
      setProfileData(data.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load profile data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  if (isLoading) {
    return (
      <div className="loading-state container">
        <div className="spinner-large"></div>
        <p className="text-secondary mt-4">Loading profile insights...</p>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="error-state container">
        <AlertCircle size={48} className="text-error mb-4" />
        <h2>Profile Not Found</h2>
        <p className="text-secondary mb-6">{error}</p>
        <Link to="/" className="btn btn-primary">Go Back Home</Link>
      </div>
    );
  }

  const { profile, insight } = profileData;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  return (
    <div className="dashboard container">
      {/* Profile Header */}
      <div className="profile-header glass-panel">
        <img src={profile.avatarUrl} alt={profile.username} className="avatar" />
        <div className="profile-info">
          <h1 className="profile-name">{profile.displayName || profile.username}</h1>
          <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="profile-handle">
            @{profile.username}
          </a>
          {profile.bio && <p className="profile-bio text-secondary">{profile.bio}</p>}
          
          <div className="profile-meta text-secondary">
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.company && <span>🏢 {profile.company}</span>}
            <span>Joined {formatDate(profile.accountCreationDate)}</span>
          </div>
        </div>
        
        <button 
          className="btn glass-btn refresh-btn" 
          onClick={() => fetchProfile(true)}
          disabled={isRefreshing}
        >
          <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="metrics-grid">
        <StatCard title="Followers" value={insight.followerCount.toLocaleString()} icon={Users} colorClass="purple" />
        <StatCard title="Total Stars" value={insight.totalStarsEarned.toLocaleString()} icon={Star} colorClass="cyan" />
        <StatCard title="Forks Received" value={insight.totalForksReceived.toLocaleString()} icon={GitFork} colorClass="pink" />
        <StatCard title="Public Repos" value={insight.publicRepositoryCount.toLocaleString()} icon={BookOpen} colorClass="green" />
      </div>

      {/* Deep Insights */}
      <div className="insights-section">
        <div className="insight-card glass-panel">
          <h3 className="section-title">
            <Code2 size={20} className="text-secondary" /> 
            Language Distribution
          </h3>
          <LanguageChart distribution={insight.languageDistribution} />
          {insight.topProgrammingLanguage && (
            <div className="top-language text-center mt-4">
              <span className="text-secondary">Primary Language: </span>
              <strong>{insight.topProgrammingLanguage}</strong>
            </div>
          )}
        </div>

        <div className="insight-details">
           <div className="detail-card glass-panel">
             <div className="icon-wrapper cyan"><Clock size={24} /></div>
             <div>
               <h4>Avg. Repository Age</h4>
               <p className="value">{insight.averageRepositoryAgeDays ? `${Math.round(insight.averageRepositoryAgeDays)} Days` : 'N/A'}</p>
             </div>
           </div>

           <div className="detail-card glass-panel">
             <div className="icon-wrapper purple"><Calendar size={24} /></div>
             <div>
               <h4>Most Active Year</h4>
               <p className="value">{insight.mostActiveCommitYear || 'N/A'}</p>
             </div>
           </div>

           <div className="detail-card glass-panel">
             <div className="icon-wrapper pink"><GitFork size={24} /></div>
             <div>
               <h4>Fork Ratio</h4>
               <p className="value">{insight.forkRatio !== null ? `${(insight.forkRatio * 100).toFixed(1)}%` : 'N/A'}</p>
             </div>
           </div>

           <div className="detail-card glass-panel">
             <div className="icon-wrapper green"><BookOpen size={24} /></div>
             <div>
               <h4>Repos with README</h4>
               <p className="value">{insight.hasReadmeCount} / {insight.publicRepositoryCount}</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard;
