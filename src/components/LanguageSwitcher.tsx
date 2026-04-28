import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher: FC = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <div className="relative group">
      <button className="flex items-center gap-2 px-3 py-2 bg-theme-bg-card border border-theme-border rounded-lg hover:bg-theme-bg-hover transition-colors">
        <Globe className="h-4 w-4 text-theme-text-secondary" />
        <span className="text-theme-text-primary">
          {languages.find(lang => lang.code === i18n.language)?.flag || '🌐'}
        </span>
      </button>
      
      <div className="absolute top-full right-0 mt-2 bg-theme-bg-card border border-theme-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-48">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-theme-bg-hover transition-colors first:rounded-t-lg last:rounded-b-lg ${
              i18n.language === language.code ? 'bg-theme-accent/10 text-theme-accent' : 'text-theme-text-primary'
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <span className="font-medium">{language.name}</span>
            {i18n.language === language.code && (
              <span className="ml-auto text-theme-accent">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
