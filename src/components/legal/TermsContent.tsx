'use client';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export function TermsContent() {
    const { i18n } = useTranslation();
    const lang = i18n.language?.startsWith('es') ? 'es' : i18n.language?.startsWith('zh') ? 'zh' : 'en';

    if (lang === 'es') {
        return (
            <>
                <h1 className="text-4xl font-black text-white mb-2">Términos de Servicio</h1>
                <p className="text-sm text-tm-muted font-mono mb-8"><strong>Fecha de Vigencia:</strong> 1 de marzo de 2026<br /><strong>Última actualización:</strong> 14 de marzo de 2026</p>
                <p>Estos Términos de Servicio (&quot;Términos&quot;) rigen tu acceso y uso de la plataforma TradeMind@bot.</p>
                <p>Al crear una cuenta o utilizar el Servicio, aceptas quedar vinculado por estos Términos.</p>
                <hr />
                <h3>1. Elegibilidad</h3>
                <p>Debes tener al menos 18 años de edad y estar legalmente autorizado para acceder a servicios de información financiera en tu jurisdicción.</p>
                <h3>2. Descripción del Servicio</h3>
                <p>TradeMind@bot es una plataforma de software que ofrece señales de trading generadas algorítmicamente, herramientas de simulación de cartera virtual e integración opcional con la API del bróker. <strong>TradeMind@bot no es un asesor de inversiones registrado, corredor de bolsa ni planificador financiero.</strong></p>
                <h3>3. Suscripciones y Facturación</h3>
                <p>Los nuevos suscriptores reciben una prueba gratuita de 14 días. Se requiere un método de pago válido al registrarse. Si no cancelas antes de que finalice el período de prueba, se realizará un cargo automático. Todas las tarifas están en USD y no son reembolsables, salvo lo exigido por la ley.</p>
                <h3>4. Integración con API del Bróker</h3>
                <p>TradeMind@bot no custodia ni controla tus fondos y no ejecuta operaciones sin tu autorización. Eres el único responsable de todas las operaciones ejecutadas en tu cuenta de corretaje.</p>
                <h3>5. Sin Asesoramiento de Inversión</h3>
                <p>Todo el contenido tiene fines únicamente informativos y educativos, y no constituye asesoramiento personalizado de inversión. <strong>El rendimiento pasado no es indicativo de resultados futuros.</strong></p>
                <h3>6. Programa de Referidos</h3>
                <p>Los créditos se emiten como saldo en la cuenta de suscripción y no tienen valor en efectivo.</p>
                <h3>7. Conducta Prohibida</h3>
                <p>Aceptas no utilizar el Servicio para fines ilegales, no realizar ingeniería inversa de las señales ni compartir las credenciales de tu cuenta.</p>
                <h3>8. Propiedad Intelectual</h3>
                <p>Todo el contenido, algoritmos y marca son propiedad de TradeMind@bot LLC.</p>
                <h3>9. Renuncia de Garantías</h3>
                <p className="uppercase text-sm">EL SERVICIO SE PROPORCIONA &quot;TAL CUAL&quot; SIN GARANTÍAS DE NINGÚN TIPO.</p>
                <h3>10. Limitación de Responsabilidad</h3>
                <p className="uppercase text-sm">NUESTRA RESPONSABILIDAD TOTAL NO EXCEDERÁ EL MONTO PAGADO POR TI EN LOS 12 MESES ANTERIORES AL RECLAMO.</p>
                <h3>11. Ley Aplicable y Disputas</h3>
                <p>Estos Términos se rigen por las leyes del Estado de Delaware. Cualquier disputa se resolverá mediante arbitraje vinculante. <strong>Renuncias a cualquier derecho de participar en una demanda colectiva.</strong></p>
                <h3>12. Modificaciones</h3>
                <p>Notificaremos cambios importantes con al menos 14 días de anticipación.</p>
                <h3>13. Contacto</h3>
                <p>TradeMind@bot LLC<br />Email: <a href="mailto:legal@trademind.bot">legal@trademind.bot</a></p>
            </>
        );
    }

    if (lang === 'zh') {
        return (
            <>
                <h1 className="text-4xl font-black text-white mb-2">服务条款</h1>
                <p className="text-sm text-tm-muted font-mono mb-8"><strong>生效日期：</strong>2026年3月1日<br /><strong>最后更新：</strong>2026年3月14日</p>
                <p>本服务条款规范您对TradeMind@bot平台的访问和使用。</p>
                <p>创建账户或使用本服务，即表示您同意受本条款约束。</p>
                <hr />
                <h3>1. 资格要求</h3>
                <p>您必须年满18周岁，且在您所在司法管辖区内依法有权访问金融信息服务。</p>
                <h3>2. 服务描述</h3>
                <p>TradeMind@bot是一个软件技术平台，提供算法生成的交易信号、虚拟投资组合模拟工具及可选的券商API集成。<strong>TradeMind@bot不是注册投资顾问、经纪交易商或财务规划师。</strong></p>
                <h3>3. 订阅与账单</h3>
                <p>新订阅用户享有14天免费试用期。注册时需提供有效的付款方式。若在试用期结束前未取消订阅，将自动扣费。所有费用以美元计价，除法律规定外不予退款。</p>
                <h3>4. 券商API集成</h3>
                <p>TradeMind@bot不持有、托管或控制您的资金，未经您授权不会执行交易。您须对您券商账户中执行的所有交易独自承担责任。</p>
                <h3>5. 非投资建议</h3>
                <p>所有内容仅供参考和教育使用，不构成个性化投资建议。<strong>过去的表现不代表未来的结果。</strong></p>
                <h3>6. 推荐计划</h3>
                <p>积分以订阅账户余额形式发放，无现金价值。</p>
                <h3>7. 禁止行为</h3>
                <p>您同意不将本服务用于任何非法目的，不对信号进行逆向工程，也不共享账户凭证。</p>
                <h3>8. 知识产权</h3>
                <p>所有内容、算法和品牌归TradeMind@bot LLC所有。</p>
                <h3>9. 免责声明</h3>
                <p className="uppercase text-sm">本服务按&quot;现状&quot;提供，不附带任何形式的保证。</p>
                <h3>10. 责任限制</h3>
                <p className="uppercase text-sm">我们的总责任不超过您在索赔前12个月内支付的金额。</p>
                <h3>11. 适用法律与争议</h3>
                <p>本条款受特拉华州法律管辖。任何争议均应通过具有约束力的仲裁解决。<strong>您放弃参与集体诉讼的任何权利。</strong></p>
                <h3>12. 修改</h3>
                <p>我们将在重大变更生效前至少14天发出通知。</p>
                <h3>13. 联系方式</h3>
                <p>TradeMind@bot LLC<br />电子邮件：<a href="mailto:legal@trademind.bot">legal@trademind.bot</a></p>
            </>
        );
    }

    // Default: English
    return (
        <>
            <h1 className="text-4xl font-black text-white mb-2">Terms of Service</h1>
            <p className="text-sm text-tm-muted font-mono mb-8"><strong>Effective Date:</strong> March 1, 2026<br /><strong>Last Updated:</strong> March 14, 2026</p>
            <p>These Terms of Service (&quot;Terms&quot;) govern your access to and use of the TradeMind@bot platform.</p>
            <p>By creating an account or using the Service, you agree to be bound by these Terms.</p>
            <hr />
            <h3>1. Eligibility</h3>
            <p>You must be at least 18 years of age and legally permitted to access financial information services in your jurisdiction.</p>
            <h3>2. Description of Service</h3>
            <p>TradeMind@bot is a software technology platform that provides algorithmically generated trading signals, virtual portfolio simulation tools, and optional broker API integration. <strong>TradeMind@bot is not a registered investment advisor, broker-dealer, or financial planner.</strong></p>
            <h3>3. Subscriptions &amp; Billing</h3>
            <p>New subscribers receive a 14-day free trial. A valid payment method is required at signup. If you do not cancel before the trial ends, you will be automatically charged. All fees are in USD and are non-refundable except as required by law.</p>
            <h3>4. Broker API Integration</h3>
            <p>TradeMind@bot does not hold, custody, or control your funds and does not execute trades without your authorization. You are solely responsible for all trades executed in your brokerage account.</p>
            <h3>5. No Investment Advice</h3>
            <p>All content is for informational and educational purposes only. <strong>Past performance is not indicative of future results.</strong> See our full <Link href="/risk-disclosure">Risk Disclosure</Link>.</p>
            <h3>6. Referral Program</h3>
            <p>Credits are issued in the form of subscription account balance and have no cash value.</p>
            <h3>7. Prohibited Conduct</h3>
            <p>You agree not to use the Service for any unlawful purpose, reverse-engineer signals, or share account credentials.</p>
            <h3>8. Intellectual Property</h3>
            <p>All content, algorithms, and branding are owned by TradeMind@bot LLC.</p>
            <h3>9. Disclaimer of Warranties</h3>
            <p className="uppercase text-sm">THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND.</p>
            <h3>10. Limitation of Liability</h3>
            <p className="uppercase text-sm">OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
            <h3>11. Governing Law &amp; Disputes</h3>
            <p>These Terms are governed by the laws of the State of Delaware. <strong>You waive any right to participate in a class action lawsuit.</strong></p>
            <h3>12. Modifications</h3>
            <p>We will provide notice of material changes at least 14 days before they take effect.</p>
            <h3>13. Contact</h3>
            <p>TradeMind@bot LLC<br />Email: <a href="mailto:legal@trademind.bot">legal@trademind.bot</a></p>
        </>
    );
}
