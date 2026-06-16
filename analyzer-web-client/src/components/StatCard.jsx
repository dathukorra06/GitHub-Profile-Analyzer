import './StatCard.css';

const StatCard = ({ title, value, icon: Icon, colorClass = 'purple' }) => {
  return (
    <div className="stat-card glass-panel">
      <div className="stat-header">
        <span className="stat-title text-secondary">{title}</span>
        <div className={`stat-icon-wrapper ${colorClass}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
};

export default StatCard;
