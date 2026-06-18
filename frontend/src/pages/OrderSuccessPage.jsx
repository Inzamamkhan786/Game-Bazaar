import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const OrderSuccessPage = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  // Auto-redirect to /orders after 10s
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate('/orders');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center">
          {/* Success animation ring */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-200">
              <svg className="w-16 h-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 mb-3">
            Payment Successful! 🎉
          </h1>
          <p className="text-slate-500 text-lg mb-8 leading-relaxed">
            Your order has been confirmed. We've sent a confirmation to your WhatsApp. The game file will be delivered shortly!
          </p>

          {/* Steps */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 text-left shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 text-sm uppercase tracking-wider">What happens next?</h3>
            <div className="space-y-4">
              {[
                {
                  done: true,
                  icon: '💳',
                  title: 'Payment Confirmed',
                  desc: 'Your payment was verified successfully',
                },
                {
                  done: true,
                  icon: '📱',
                  title: 'WhatsApp Confirmation Sent',
                  desc: "Check your WhatsApp — we've sent a confirmation message",
                },
                {
                  done: false,
                  icon: '🎮',
                  title: 'Game File Delivery',
                  desc: 'Our team will send the game file to your WhatsApp number shortly',
                },
                {
                  done: false,
                  icon: '✅',
                  title: 'Enjoy Your Game!',
                  desc: 'Install and enjoy your new game',
                },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${step.done ? 'bg-green-100' : 'bg-slate-100'}`}>
                    {step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${step.done ? 'text-green-700' : 'text-slate-700'}`}>
                      {step.title}
                      {step.done && <span className="ml-2 text-xs text-green-500 font-medium">✓ Done</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp reminder */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3 text-left">
            <div className="text-2xl">📲</div>
            <div>
              <p className="text-sm font-semibold text-green-800">Keep WhatsApp open!</p>
              <p className="text-xs text-green-600 mt-0.5">
                Your game file will arrive on the WhatsApp number you registered with.
              </p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/orders"
              className="btn-primary flex-1 justify-center py-3 text-sm"
            >
              View My Orders
            </Link>
            <Link
              to="/games"
              className="btn-secondary flex-1 justify-center py-3 text-sm"
            >
              Browse More Games
            </Link>
          </div>

          {/* Auto redirect notice */}
          <p className="text-xs text-slate-400 mt-5">
            Redirecting to your orders in <span className="font-bold text-slate-600">{countdown}s</span>…
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default OrderSuccessPage;
