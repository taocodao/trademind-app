'use client';
import { useTranslation } from 'react-i18next';

export function PrivacyContent() {
    const { i18n } = useTranslation();
    const lang = i18n.language?.startsWith('es') ? 'es' : i18n.language?.startsWith('zh') ? 'zh' : 'en';

    if (lang === 'es') {
        return (
            <>
                <h1 className="text-4xl font-black text-white mb-2">Política de Privacidad</h1>
                <p className="text-sm text-tm-muted font-mono mb-8"><strong>Fecha de Vigencia:</strong> 1 de marzo de 2026</p>
                <p>Esta Política de Privacidad describe cómo TradeMind@bot recopila, usa y protege la información cuando utilizas la plataforma.</p>
                <hr />
                <h3>1. Información que Recopilamos</h3>
                <p><strong>1.1 Información que proporcionas</strong></p>
                <ul>
                    <li>Datos de registro de cuenta: nombre, correo electrónico, credenciales de autenticación</li>
                    <li>Información de pago (procesada por Stripe — no almacenamos números de tarjeta)</li>
                    <li>Credenciales de conexión con bróker (cifradas, solo para envío de órdenes via API)</li>
                </ul>
                <p><strong>1.2 Información recopilada automáticamente</strong></p>
                <ul>
                    <li>Datos de uso: páginas visitadas, funciones utilizadas, señales vistas, duración de sesión</li>
                    <li>Huella del método de pago (solo para prevención de fraude en pruebas gratuitas)</li>
                </ul>
                <h3>2. Cómo Usamos Tu Información</h3>
                <p>Usamos tu información para proporcionar, operar y mejorar el Servicio. <strong>No vendemos tu información personal a terceros.</strong></p>
                <h3>3. Toma de Decisiones Automatizada</h3>
                <p>Nuestros algoritmos analizan datos del mercado y generan resultados idénticos para todos los suscriptores. No toman decisiones sobre ti como individuo.</p>
                <h3>4. Compartir Datos</h3>
                <p>Solo compartimos datos con: Stripe, Privy, Tastytrade (si conectado), Vercel/AWS y autoridades legales cuando sea requerido.</p>
                <h3>5. Retención de Datos</h3>
                <p>Al eliminar la cuenta, los datos personales se eliminan en un plazo de 30 días.</p>
                <h3>6. Tus Derechos</h3>
                <p>Tienes derecho a conocer, eliminar, corregir y optar por no compartir tus datos. Para ejercer estos derechos, escribe a: <strong>privacy@trademind.bot</strong></p>
                <h3>7. Seguridad</h3>
                <p>Implementamos cifrado TLS en tránsito y cifrado AES-256 en reposo.</p>
                <h3>8. Privacidad de Menores</h3>
                <p>El Servicio no está dirigido a personas menores de 18 años.</p>
                <h3>9. Contacto</h3>
                <p>TradeMind@bot LLC<br />Consultas de privacidad: <a href="mailto:privacy@trademind.bot">privacy@trademind.bot</a></p>
            </>
        );
    }

    if (lang === 'zh') {
        return (
            <>
                <h1 className="text-4xl font-black text-white mb-2">隐私政策</h1>
                <p className="text-sm text-tm-muted font-mono mb-8"><strong>生效日期：</strong>2026年3月1日</p>
                <p>本隐私政策描述TradeMind@bot如何在您使用本平台时收集、使用和保护信息。</p>
                <hr />
                <h3>1. 我们收集的信息</h3>
                <p><strong>1.1 您提供的信息</strong></p>
                <ul>
                    <li>账户注册数据：姓名、电子邮件地址、身份验证凭证</li>
                    <li>付款信息（由Stripe处理——我们不存储卡号）</li>
                    <li>券商账户连接凭证（加密，仅用于API订单提交）</li>
                </ul>
                <p><strong>1.2 自动收集的信息</strong></p>
                <ul>
                    <li>使用数据：访问的页面、使用的功能、查看的信号、会话时长</li>
                    <li>付款方式指纹（仅用于防止免费试用欺诈）</li>
                </ul>
                <h3>2. 我们如何使用您的信息</h3>
                <p>我们使用您的信息来提供、运营和改进本服务。<strong>我们不会将您的个人信息出售给第三方。</strong></p>
                <h3>3. 自动化决策</h3>
                <p>我们的算法分析市场数据，并为所有订阅用户生成相同的输出结果。它们不会针对您个人做出决策。</p>
                <h3>4. 数据共享</h3>
                <p>我们仅与以下方共享数据：Stripe、Privy、Tastytrade（若已连接）、Vercel/AWS，以及在法律要求时与相关部门共享。</p>
                <h3>5. 数据保留</h3>
                <p>账户删除后，个人数据将在30天内被移除。</p>
                <h3>6. 您的权利</h3>
                <p>您有权了解、删除、更正数据，并选择退出数据共享。如需行使这些权利，请发送邮件至：<strong>privacy@trademind.bot</strong></p>
                <h3>7. 安全性</h3>
                <p>我们在传输过程中采用TLS加密，静态数据采用AES-256加密。</p>
                <h3>8. 儿童隐私</h3>
                <p>本服务不面向18周岁以下人士。</p>
                <h3>9. 联系方式</h3>
                <p>TradeMind@bot LLC<br />隐私咨询：<a href="mailto:privacy@trademind.bot">privacy@trademind.bot</a></p>
            </>
        );
    }

    // Default: English
    return (
        <>
            <h1 className="text-4xl font-black text-white mb-2">Privacy Policy</h1>
            <p className="text-sm text-tm-muted font-mono mb-8"><strong>Effective Date:</strong> March 1, 2026<br /><strong>Last Updated:</strong> March 14, 2026</p>
            <p>This Privacy Policy describes how TradeMind@bot LLC collects, uses, and protects information when you use the platform.</p>
            <hr />
            <h3>1. Information We Collect</h3>
            <p><strong>1.1 Information You Provide</strong></p>
            <ul>
                <li>Account registration data: name, email address, authentication credentials (via Privy)</li>
                <li>Payment information (processed by Stripe — we do not store card numbers)</li>
                <li>Brokerage account connection credentials (encrypted, used only for API order submission)</li>
            </ul>
            <p><strong>1.2 Information Collected Automatically</strong></p>
            <ul>
                <li>Usage data: pages visited, features used, signals viewed, session duration</li>
                <li>Payment method fingerprint (for free trial fraud prevention only)</li>
            </ul>
            <h3>2. How We Use Your Information</h3>
            <p>We use your information to provide, operate, and improve the Service. <strong>We do not sell your personal information to third parties.</strong></p>
            <h3>3. Automated Decision-Making</h3>
            <p>Our algorithms analyze market data and generate identical outputs for all subscribers. They do not make decisions about you as an individual.</p>
            <h3>4. Data Sharing</h3>
            <p>We share data only with: Stripe, Privy, Tastytrade (if connected), Vercel/AWS, and legal authorities when required.</p>
            <h3>5. Data Retention</h3>
            <p>Upon account deletion, personal data is removed within 30 days.</p>
            <h3>6. Your Rights (CCPA / California Residents)</h3>
            <p>You have the right to know, delete, correct, and opt out of data sharing. To exercise these rights, email: <strong>privacy@trademind.bot</strong></p>
            <h3>7. Security</h3>
            <p>We implement TLS encryption in transit and AES-256 encryption at rest.</p>
            <h3>8. Children&apos;s Privacy</h3>
            <p>The Service is not directed to individuals under the age of 18.</p>
            <h3>9. Contact</h3>
            <p>TradeMind@bot LLC<br />Privacy inquiries: <a href="mailto:privacy@trademind.bot">privacy@trademind.bot</a></p>
        </>
    );
}
