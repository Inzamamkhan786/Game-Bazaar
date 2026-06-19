import { useState } from 'react';
import Layout from '../components/layout/Layout';

const SupportPage = () => {
  const adminWhatsApp = import.meta.env.VITE_ADMIN_WHATSAPP || '919931902300';
  const supportMessage = encodeURIComponent('Hello Admin, I need help regarding my order.');

  const faqs = [
    { q: 'How long does delivery take after payment?', a: 'Game access is delivered via WhatsApp typically within 1-6 hours of payment confirmation, sometimes faster.' },
    { q: 'What payment methods are accepted?', a: 'We accept all major payment methods via Razorpay: UPI, Credit/Debit Cards, Net Banking, Wallets, and EMI.' },
    { q: 'Will I receive account credentials?', a: 'Yes. After payment verification, we will manually send the game access credentials to your registered WhatsApp number.' },
    { q: 'What if I face issues after purchase?', a: 'Contact us directly on WhatsApp with your Order ID. We provide support for all purchased games.' },
    { q: 'Are refunds available?', a: 'Due to the digital nature of our products, refunds are handled on a case-by-case basis. Contact us immediately if there is an issue.' },
    { q: 'Can I purchase multiple games?', a: 'Yes! You can purchase as many games as you want. Each purchase creates a separate order.' },
    { q: 'Is my payment secure?', a: 'Absolutely. Payments are processed by Razorpay, a PCI DSS compliant payment gateway trusted by millions.' },
    { q: 'What platforms are the games for?', a: 'All games are for PC (Windows). Access is provided through Steam or Epic Games accounts as applicable.' },
  ];

  const [openFaq, setOpenFaq] = useState(null);

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-10 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="font-display font-black text-4xl text-white mb-4">How can we help?</h1>
          <p className="text-slate-300 text-lg">Get instant support via WhatsApp or browse our FAQ</p>
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.084.535 4.043 1.473 5.756L.014 23.986l6.354-1.643A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.374l-.36-.213-3.717.96.993-3.614-.234-.373A9.783 9.783 0 012.182 12C2.182 6.579 6.579 2.182 12 2.182S21.818 6.579 21.818 12 17.421 21.818 12 21.818z"/>
            </svg>
          </div>
          <h2 className="font-bold text-2xl text-slate-900 mb-2">Chat with Us on WhatsApp</h2>
          <p className="text-slate-600 mb-6">Our support team typically replies within 1 hour during business hours.</p>
          <a
            href={`https://wa.me/${adminWhatsApp}?text=${supportMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            id="whatsapp-support-btn"
            className="inline-flex items-center gap-3 bg-green-500 text-white font-bold px-8 py-4 rounded-2xl hover:bg-green-600 transition-all hover:-translate-y-1 hover:shadow-xl shadow-md"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.084.535 4.043 1.473 5.756L.014 23.986l6.354-1.643A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.374l-.36-.213-3.717.96.993-3.614-.234-.373A9.783 9.783 0 012.182 12C2.182 6.579 6.579 2.182 12 2.182S21.818 6.579 21.818 12 17.421 21.818 12 21.818z"/>
            </svg>
            Chat on WhatsApp
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="section-title text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                id={`faq-btn-${i}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold text-slate-800 text-sm">{faq.q}</span>
                <svg className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  <p className="pt-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Info */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: '📱', title: 'WhatsApp', desc: 'Chat with us anytime', link: `https://wa.me/${adminWhatsApp}` },
            { icon: '⚡', title: 'Response Time', desc: 'Typically 1-6 hours', link: null },
            { icon: '🕐', title: 'Business Hours', desc: '9 AM – 11 PM IST', link: null },
          ].map((item) => (
            <div key={item.title} className="glass-card rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">{item.icon}</div>
              <h4 className="font-semibold text-slate-800">{item.title}</h4>
              {item.link ? (
                <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">{item.desc}</a>
              ) : (
                <p className="text-sm text-slate-500">{item.desc}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default SupportPage;
