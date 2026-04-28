import { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type FeatureLinkCardProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  to: string;
  state?: any;
  rightIcon?: ReactNode;
};

// shared card used across admin and routes pages
const FeatureLinkCard: FC<FeatureLinkCardProps> = ({ title, description, icon, color = 'blue', to, state, rightIcon }) => {
  const baseCard = "group flex items-center gap-4 p-6 bg-theme-bg-card border border-theme-border rounded-xl text-theme-text-primary transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-xl relative overflow-hidden";
  const colorCard: Record<NonNullable<FeatureLinkCardProps['color']>, string> = {
    blue: "hover:border-blue-400 hover:shadow-blue-400/20",
    green: "hover:border-green-400 hover:shadow-green-400/20",
    orange: "hover:border-theme-accent hover:shadow-theme-accent/20",
    purple: "hover:border-purple-400 hover:shadow-purple-400/20",
  };

  const baseIcon = "flex items-center justify-center w-14 h-14 rounded-xl bg-theme-bg-tertiary flex-shrink-0 transition-colors duration-300";
  const colorIcon: Record<NonNullable<FeatureLinkCardProps['color']>, string> = {
    blue: "text-blue-400 group-hover:bg-blue-400/10",
    green: "text-green-400 group-hover:bg-green-400/10",
    orange: "text-theme-accent group-hover:bg-theme-accent/10",
    purple: "text-purple-400 group-hover:bg-purple-400/10",
  };

  const topBorder: Record<NonNullable<FeatureLinkCardProps['color']>, string> = {
    blue: "bg-blue-400",
    green: "bg-green-400",
    orange: "bg-theme-accent",
    purple: "bg-purple-400",
  };

  return (
    <Link to={to} state={state} className={`${baseCard} ${colorCard[color]}`}>
      <div className={`absolute top-0 left-0 right-0 h-1 ${topBorder[color]} transition-all duration-300 group-hover:h-1.5`} />
      <div className={`${baseIcon} ${colorIcon[color]}`}>{icon}</div>
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-theme-text-primary mb-2">{title}</h3>
        {description && (
          <p className="text-theme-text-muted text-sm leading-relaxed">{description}</p>
        )}
      </div>
      {rightIcon && (
        <div className="text-theme-text-muted transition-all duration-300 group-hover:translate-x-1 group-hover:text-theme-accent">
          {rightIcon}
        </div>
      )}
    </Link>
  );
};

export default FeatureLinkCard;


