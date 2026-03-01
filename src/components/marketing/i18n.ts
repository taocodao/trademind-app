'use client';

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'es', 'zh'],
        resources: {
            en: {
                translation: {
                    hero: { headline: "Turn Options Into a Compounding Machine" },
                    cta: { start: "Start Free → Observer" },
                    calculator: {
                        title: "Interactive Compounding Calculator",
                        starting_capital: "Starting Capital",
                        monthly_additions: "Monthly Additions",
                        time_horizon: "Time Horizon",
                        cagr: "CAGR"
                    },
                    timeline: { total: "Total Account Value" },
                    refer: { title: "Refer a Friend" },
                    crash: { filter_active: "Crash Filter Active" }
                }
            },
            es: {
                translation: {
                    hero: { headline: "Convierte Opciones en una Máquina de Capitalización" },
                    cta: { start: "Empieza Gratis → Observador" },
                    calculator: {
                        title: "Calculadora de Capitalización Interactiva",
                        starting_capital: "Capital Inicial",
                        monthly_additions: "Adición Mensual",
                        time_horizon: "Horizonte de Tiempo",
                        cagr: "TCAC"
                    },
                    timeline: { total: "Valor Total de la Cuenta" },
                    refer: { title: "Invita a un Amigo" },
                    crash: { filter_active: "Filtro de Caída Activo" }
                }
            },
            zh: {
                translation: {
                    hero: { headline: "将期权变为复利增长引擎" },
                    cta: { start: "免费开始 → 观察者" },
                    calculator: {
                        title: "交互式复利计算器",
                        starting_capital: "初始资金",
                        monthly_additions: "每月追加",
                        time_horizon: "投资年限",
                        cagr: "年复合增长率"
                    },
                    timeline: { total: "账户总价值" },
                    refer: { title: "推荐朋友" },
                    crash: { filter_active: "暴跌保护开启" }
                }
            }
        },
        interpolation: { escapeValue: false },
    });

export default i18next;
