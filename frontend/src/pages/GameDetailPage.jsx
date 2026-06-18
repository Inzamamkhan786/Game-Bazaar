import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { gamesAPI, paymentsAPI } from '../api';
import { GameCardSkeleton } from '../components/ui/Skeleton';
import Layout from '../components/layout/Layout';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || '';

const GameDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [showQR, setShowQR] = useState(false);
  const [upiSubmitting, setUpiSubmitting] = useState(false);
  const [qrData, setQrData] = useState(null);       // { qrId, imageUrl, amount }
  const [qrLoading, setQrLoading] = useState(false); // loading while creating QR
  const [qrPaid, setQrPaid] = useState(false);       // payment confirmed

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await gamesAPI.getById(id);
        setGame(res.data.data);
      } catch {
        navigate('/games');
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [id]);

  // ── Poll Razorpay QR payment status every 3 seconds ──
  useEffect(() => {
    if (!qrData?.qrId || qrPaid) return;
    const interval = setInterval(async () => {
      try {
        const res = await paymentsAPI.pollQrStatus(qrData.qrId);
        if (res.data.data?.paid) {
          setQrPaid(true);
          clearInterval(interval);
          toast.success('Payment confirmed! 🎉 Sending game to your WhatsApp...');
          setTimeout(() => navigate('/order-success'), 1500);
        }
      } catch { /* ignore poll errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrData, qrPaid]);

  const discount = game
    ? Math.round(((game.original_price - game.sale_price) / game.original_price) * 100)
    : 0;

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }

    setPaying(true);
    try {
      // Create Razorpay order
      const orderRes = await paymentsAPI.createOrder(game.id);
      const { razorpayOrderId, amount, currency, keyId } = orderRes.data.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'GameBazaar',
        description: `🎮 ${game.game_name}`,
        image: 'https://i.imgur.com/n5tjHFD.png', // GameBazaar logo placeholder
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.whatsapp_number ? `+91${user.whatsapp_number}`.slice(-10) : '',
          method: 'upi',           // pre-select UPI tab by default
        },
        config: {
          display: {
            // Show UPI first, then cards, then netbanking
            sequence: ['block.upi', 'block.card', 'block.netbanking', 'block.wallet'],
            preferences: {
              show_default_blocks: true,
            },
            blocks: {
              upi: {
                name: 'UPI / QR Code',
                instruments: [
                  { method: 'upi', flows: ['qr', 'collect', 'intent'] },
                ],
              },
              card: {
                name: 'Debit / Credit Card',
                instruments: [{ method: 'card' }],
              },
              netbanking: {
                name: 'Net Banking',
                instruments: [{ method: 'netbanking' }],
              },
              wallet: {
                name: 'Wallets',
                instruments: [{ method: 'wallet' }],
              },
            },
          },
        },
        theme: {
          color: '#2563EB',          // brand blue
          backdrop_color: '#0f172a', // dark overlay
          hide_topbar: false,
        },
        handler: async (response) => {
          try {
            await paymentsAPI.verifyPayment({
              gameId: game.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success('Payment successful! 🎉 Check your email & WhatsApp!');
            navigate('/order-success');
          } catch (err) {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            toast('Payment cancelled');
          },
          confirm_close: true,       // ask user before closing modal
          animation: true,
        },
      };

      if (!window.Razorpay) {
        toast.error('Payment gateway not loaded. Please refresh.');
        setPaying(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        toast.error('Payment failed. Please try again.');
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setPaying(false);
    }
  };

  // Generate real UPI QR from backend (upi://pay deep link as base64 PNG)
  const handleShowQr = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to purchase');
      navigate('/login');
      return;
    }
    if (qrData) { setShowQR(!showQR); return; } // toggle already-created QR
    setQrLoading(true);
    try {
      const res = await paymentsAPI.createQrOrder(game.id);
      setQrData(res.data.data);
      setShowQR(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate QR. Please try again.');
    } finally {
      setQrLoading(false);
    }
  };

  // After user pays via UPI, tap once to notify admin — sends email immediately
  const handleUpiPaid = async () => {
    if (!qrData) return;
    setUpiSubmitting(true);
    try {
      await paymentsAPI.submitUpiOrder(game.id);
      toast.success('Order submitted! Admin notified. Game will be sent to your WhatsApp shortly. 🎮');
      navigate('/order-success');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setUpiSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="skeleton h-96 rounded-2xl" />
            <div className="space-y-4">
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-24 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!game) return null;

  const images = game.images?.length > 0 ? game.images : [];

  const getImageUrl = (img) => img?.startsWith('http') ? img : `${API_BASE}/${img}`;

  return (
    <Layout>
      {/* Load Razorpay SDK */}
      {!window.Razorpay && (
        <script src="https://checkout.razorpay.com/v1/checkout.js" />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <button onClick={() => navigate('/')} className="hover:text-blue-600 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('/games')} className="hover:text-blue-600 transition-colors">Games</button>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs">{game.game_name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div>
            <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden mb-4 shadow-lg">
              {images[activeImg] ? (
                <img
                  src={getImageUrl(images[activeImg])}
                  alt={game.game_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full gaming-gradient flex items-center justify-center">
                  <svg className="w-24 h-24 text-slate-600 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? 'border-blue-600 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={getImageUrl(img)} alt={`${game.game_name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">{game.category}</span>
              {game.is_featured && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">⭐ Featured</span>}
              {!game.availability && <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full">Unavailable</span>}
            </div>

            <h1 className="font-display font-black text-3xl text-slate-900 mb-4 leading-tight">{game.game_name}</h1>

            {/* Price */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5 mb-6 border border-blue-100">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-black text-slate-900">₹{parseFloat(game.sale_price).toFixed(0)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-lg text-slate-400 line-through">₹{parseFloat(game.original_price).toFixed(0)}</span>
                    <span className="discount-badge text-base px-3 py-1">-{discount}% OFF</span>
                  </>
                )}
              </div>
              <p className="text-sm text-slate-500">You save ₹{(game.original_price - game.sale_price).toFixed(0)}</p>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="font-semibold text-slate-900 mb-2">About This Game</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{game.description}</p>
            </div>

            {/* Features */}
            {game.features?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">Features</h3>
                <ul className="space-y-2">
                  {game.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Purchase */}
            <div className="mt-auto space-y-3">
              {game.availability ? (
                <>
                  {/* === UPI QR — Primary Payment === */}
                  <button
                    id="upi-qr-btn"
                    onClick={handleShowQr}
                    disabled={qrLoading}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                      !qrLoading ? 'btn-primary animate-pulse-glow' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {qrLoading ? (
                      <><div className="spinner w-6 h-6" /> Generating QR...</>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm1 1h3v3H5V5zm8-2h7v7h-7V3zm1 1v5h5V4h-5zm1 1h3v3h-3V5zM3 13h7v7H3v-7zm1 1v5h5v-5H4zm1 1h3v3H5v-3zm11 0h2v2h-2v-2zm-3-1h2v2h-2v-2zm0 3h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3-3h3v2h-3v-2zm0 3h3v2h-3v-2z"/>
                        </svg>
                        {showQR && qrData ? 'Hide QR Code' : `Scan & Pay ₹${parseFloat(game.sale_price).toFixed(0)} via UPI`}
                      </>
                    )}
                  </button>

                  {/* === QR Panel === */}
                  {showQR && qrData && (
                    <div className="border-2 border-purple-200 rounded-2xl overflow-hidden bg-gradient-to-b from-purple-50 to-white">

                      {/* Header */}
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm1 1h3v3H5V5zm8-2h7v7h-7V3zm1 1v5h5V4h-5zm1 1h3v3h-3V5zM3 13h7v7H3v-7zm1 1v5h5v-5H4zm1 1h3v3H5v-3zm11 0h2v2h-2v-2zm-3-1h2v2h-2v-2zm0 3h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3-3h3v2h-3v-2zm0 3h3v2h-3v-2z"/>
                          </svg>
                          <span className="text-white text-sm font-bold">UPI Payment</span>
                        </div>
                        <span className="text-purple-200 text-xs">Scan with any UPI app</span>
                      </div>

                      <div className="p-5">
                        {/* Amount */}
                        <div className="text-center mb-4">
                          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Pay Exactly</p>
                          <p className="text-4xl font-black text-slate-900 mt-1">₹{parseFloat(qrData.amount).toFixed(0)}</p>
                          <p className="text-xs text-slate-400 mt-1">for <span className="font-semibold text-slate-600">{qrData.gameName}</span></p>
                        </div>

                        {/* Real UPI QR Image */}
                        <div className="flex justify-center mb-4">
                          <div className="relative bg-white rounded-2xl p-3 shadow-lg border-2 border-purple-100 inline-block">
                            <img
                              src={qrData.imageUrl}
                              alt="UPI QR Code — Scan to Pay"
                              className="w-56 h-56 object-contain rounded-xl"
                            />
                            {qrPaid && (
                              <div className="absolute inset-0 bg-green-500/92 rounded-2xl flex flex-col items-center justify-center">
                                <span className="text-6xl">✅</span>
                                <p className="text-white font-bold mt-2 text-lg">Paid!</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* UPI ID info */}
                        <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-400">Paying to UPI ID</p>
                            <p className="text-sm font-bold text-slate-800 font-mono">{qrData.upiId}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Ref ID</p>
                            <p className="text-xs font-mono font-bold text-purple-600">{qrData.refId}</p>
                          </div>
                        </div>

                        <p className="text-center text-xs text-slate-500 mb-4">
                          Open <strong>PhonePe, GPay, Paytm or BHIM</strong> → Scan QR → Confirm payment
                        </p>

                        {/* Status / Action */}
                        {qrPaid ? (
                          <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-xl py-3 px-4">
                            <span className="text-green-500">✅</span>
                            <p className="text-sm font-semibold text-green-700">Payment confirmed! Redirecting...</p>
                          </div>
                        ) : (
                          <>
                            <button
                              id="upi-paid-btn"
                              onClick={handleUpiPaid}
                              disabled={upiSubmitting}
                              className="w-full py-3.5 rounded-xl font-bold text-base bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md"
                            >
                              {upiSubmitting ? (
                                <><div className="spinner w-5 h-5" /> Notifying Admin...</>
                              ) : (
                                <>✅ Done Paying — Notify Admin</>
                              )}
                            </button>
                            <p className="text-center text-xs text-slate-400 mt-2">
                              Tap once after payment — admin gets notified instantly ⚡
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button disabled className="w-full py-4 rounded-2xl font-bold text-lg bg-slate-100 text-slate-400 cursor-not-allowed">
                  Currently Unavailable
                </button>
              )}

              <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span>🔒</span> Secure Payment</span>
                <span className="flex items-center gap-1"><span>📱</span> WhatsApp Delivery</span>
                <span className="flex items-center gap-1"><span>⚡</span> Instant Order</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default GameDetailPage;
