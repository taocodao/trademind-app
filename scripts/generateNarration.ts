import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY || "",
});

interface NarrationConfig {
    lang: string;
    voiceId: string; // Will use appropriate voices per language
    script: string;
}

const narrations: NarrationConfig[] = [
    {
        lang: "en",
        voiceId: "JBFqnCBsd6RMkjVDRZzb", // Example EN voice
        script: `Welcome to TurboBounce. In a market that constantly overreacts—driven by fear, greed, and relentless news cycles—finding a consistent edge is harder than ever. At TurboBounce, our unique selling proposition is simple but incredibly powerful: we specialize in AI-driven, mean-reversion options trading. 
    
We don't try to predict the future. Instead, our Machine Learning algorithms mathematically react to the present. By letting our AI handle the complex strategy selection and providing 24/7 automated monitoring, we have transformed options trading into a truly hands-free investment. You simply connect your brokerage account, and watch your capital grow. 

And the best part? It's entirely scalable. Whether you are starting with a modest $5,000 investment, or deploying a large portfolio, the AI dynamically adapts to you. It automatically calculates position sizing and selects the optimal option structures—shifting between deep ITM LEAPS, PMCCs, or Defensive Credit Spreads—based exclusively on your initial investment.

Right now, you are looking at our verified $5,000 backtest on the screen. But this isn't just a static chart. Go ahead and adjust the initial investment. Use this interactive simulator to see what your customized compounding journey could look like. TurboBounce isn't just an alert service—it is a complete automated wealth-building engine. Sign up at TurboBounce.com today.`,
    },
    {
        lang: "es",
        voiceId: "piTKgcLEGmPE4e6mJC43", // Example ES voice
        script: `Bienvenido a TurboBounce. En un mercado que reacciona de forma exagerada constantemente—impulsado por el miedo, la avaricia y un ciclo de noticias implacable—encontrar una ventaja constante es más difícil que nunca. En TurboBounce, nuestra propuesta de valor es simple pero increíblemente poderosa: nos especializamos en el comercio de opciones de reversión a la media impulsado por Inteligencia Artificial.

No intentamos predecir el futuro. En cambio, nuestros algoritmos de aprendizaje automático reaccionan matemáticamente al presente. Al permitir que nuestra IA se encargue de la compleja selección de estrategias y brinde un monitoreo automatizado las 24 horas del día, los 7 días de la semana, hemos transformado el comercio de opciones en una inversión verdaderamente autónoma. Simplemente conecta tu cuenta de corretaje y observa cómo crece tu capital.

¿Y la mejor parte? Es completamente escalable. Ya sea que comiences con una modesta inversión de $5,000 o desplegando un gran portafolio, la IA se adapta dinámicamente a ti. Calcula automáticamente el tamaño de la posición y selecciona las estructuras de opciones óptimas—cambiando entre LEAPS profundamente ITM, PMCCs o Spreads de Crédito Defensivos—basándose exclusivamente en tu inversión inicial.

En este momento, estás viendo nuestra prueba retrospectiva verificada de $5,000 en la pantalla. Pero esto no es solo un gráfico estático. Adelante, ajusta la inversión inicial. Usa este simulador interactivo para ver cómo podría lucir tu propio viaje de capitalización personalizado. TurboBounce no es solo un servicio de alertas; es un motor completo de creación de riqueza automatizado. Regístrate en TurboBounce.com hoy mismo.`,
    },
    {
        lang: "zh",
        voiceId: "MF3mGyEYCl7XYWbV9V6O", // Example ZH voice
        script: `欢迎来到 TurboBounce。在一个不断过度反应的市场中——受到恐惧、贪婪和无情新闻周期的驱使——找到一致的优势比以往任何时候都难。在 TurboBounce，我们独特的销售主张简单却无比强大：我们专注于由人工智能驱动的均值回归期权交易。

我们不试图预测未来。相反，我们的机器学习算法在数学层面上对当下做出反应。通过让我们的 AI 处理复杂的策略选择并提供 24/7 的自动化监控，我们将期权交易转变为一种真正的放手投资。您只需连接您的经纪账户，然后看着您的资本增长。

最棒的部分是什么？它是完全可扩展的。无论您是带着区区 5,000 美元的投资开始，还是部署一个庞大的投资组合，AI 都会动态适应您。它会自动计算头寸规模并选择最佳的期权结构——在深度价内 LEAPS、PMCC 或防御性信贷价差之间切换——完全基于您的初始投资。

现在，您正在屏幕上查看我们经过验证的 5,000 美元回测结果。但这不仅仅是一个静态图表。继续调整初始投资吧。使用这个交互式模拟器，看看您定制的复利之旅会是什么样子。TurboBounce 不仅仅是一个警报服务——它是一个完整的自动化财富生成引擎。今天就在 TurboBounce.com 注册吧。`,
    },
];

async function generateAll() {
    const outDir = path.resolve(__dirname, "../public/audio");
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
        console.warn("ELEVENLABS_API_KEY is not set. Skipping audio generation.");
        return;
    }

    for (const config of narrations) {
        console.log(`Generating ${config.lang} narration...`);
        try {
            const audioStream = await client.textToSpeech.convert(config.voiceId, {
                text: config.script,
                modelId: "eleven_multilingual_v2",
                outputFormat: "mp3_44100_128",
                voiceSettings: {
                    stability: 0.5,
                    similarityBoost: 0.75,
                    style: 0.15,
                    useSpeakerBoost: true,
                },
            });

            const outputPath = path.join(outDir, `narration_${config.lang}.mp3`);

            // Handle stream correctly for JS Node types
            const fileStream = fs.createWriteStream(outputPath);

            for await (const chunk of audioStream as any) {
                fileStream.write(Buffer.from(chunk));
            }

            fileStream.end();

            console.log(`✅ Saved: ${outputPath}`);
        } catch (e: any) {
            console.error(`Failed to generate audio for ${config.lang}:`, e.message);
        }
    }
}

generateAll().catch(console.error);
