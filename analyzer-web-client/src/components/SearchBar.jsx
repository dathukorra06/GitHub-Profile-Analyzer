import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import './SearchBar.css';

const SearchBar = ({ onSearch, isLoading }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onSearch(username.trim());
    }
  };

  return (
    <form className="search-form glass-panel" onSubmit={handleSubmit}>
      <Search className="search-icon text-secondary" size={24} />
      <input
        type="text"
        className="search-input"
        placeholder="Enter a GitHub username... (e.g., torvalds)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={isLoading}
      />
      <button 
        type="submit" 
        className="btn btn-primary search-btn"
        disabled={!username.trim() || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="spinner" size={20} />
            Analyzing...
          </>
        ) : (
          'Analyze Profile'
        )}
      </button>
    </form>
  );
};

export default SearchBar;
