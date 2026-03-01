'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'es' | 'zh';

interface LanguageContextProps {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

// Define basic translations dictionary
const translations: Record<Language, Record<string, string>> = {
    en: {
        'nav.refer': 'Refer a Friend',
        'nav.login': 'Log In',
        'hero.title': 'Turn Options Into a Compounding Machine',
        'hero.subtitle': 'A volatility-adaptive engine targeting +20% annualized growth. Automated. Defined-risk. Supported by a rigorous 7-year track record.',
        'hero.cta': 'Start Free',
        'timeline.time': 'Time',
        'timeline.total': 'Total Capital',
        'calculator.title': 'Compounding Calculator',
    },
    es: {
        'nav.refer': 'Recomienda a un Amigo',
        'nav.login': 'Iniciar Sesión',
        'hero.title': 'Convierte las Opciones en una Máquina de Interés Compuesto',
        'hero.subtitle': 'Un motor adaptativo a la volatilidad que busca un crecimiento anualizado del +20%. Automatizado. Riesgo definido. Respaldado por un historial riguroso de 7 años.',
        'hero.cta': 'Comenzar Gratis',
        'timeline.time': 'Tiempo',
        'timeline.total': 'Capital Total',
        'calculator.title': 'Calculadora de Interés Compuesto',
    },
    zh: {
        'nav.refer': '推荐朋友',
        'nav.login': '登录',
        'hero.title': '将期权变成复利机器',
        'hero.subtitle': '一种适应波动率的引擎，目标是实现+20%的年化增长。自动执行。风险明确。拥有7年严格的过往业绩支持。',
        'hero.cta': '免费开始',
        'timeline.time': '时间',
        'timeline.total': '总资金',
        'calculator.title': '复利计算器',
    }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
