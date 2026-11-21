import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  ShieldCheck,
  BadgeCheck,
  Coins,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  MessageSquare,
  Receipt,
  Image as ImageIcon,
  Trash2,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  AgencyCoinOrderRecord,
  DualAgencyRecord,
  buildWhatsAppUrl,
  cancelMyPendingCoinOrder,
  submitCoinPurchaseSlipOrder,
  subscribeBuyerCoinOrders,
} from '../../services/agencyService';
import { uploadUserImage } from '../../services/storageService';

interface CoinSlipOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  agency: DualAgencyRecord | null;
  currentUser: UserProfile;
  onSendMessage?: (user: UserProfile) => void;
}

const COIN_PRESETS = [1000, 5000, 10000, 25000, 50000, 100000];
const PAYMENT_METHODS = ['JazzCash', 'EasyPaisa', 'Bank Transfer', 'SadaPay / NayaPay', 'Cash'];

export const CoinSlipOrderModal: React.FC<CoinSlipOrderModalProps> = ({
  isOpen,
  onClose,
  agency,
  currentUser,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'order' | 'my_orders'>('order');
  const [coinsRequested, setCoinsRequested] = useState('5000');
  const [paidAmountText, setPaidAmountText] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('JazzCash');
  const [transactionRef, setTransactionRef] = useState('');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [paymentSlipUrl, setPaymentSlipUrl] = useState('');
  const [uploadingSlip, setUploadingSlip] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const [myOrders, setMyOrders] = useState<AgencyCoinOrderRecord[]>([]);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;
    const unsub = subscribeBuyerCoinOrders(currentUser.id, setMyOrders);
    return () => unsub();
  }, [isOpen, currentUser?.id]);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setErrorMessage(null);
      setLastOrderId(null);
    }
  }, [isOpen, agency?.id]);

  const pendingOrdersCount = useMemo(
    () => myOrders.filter((o) => o.status === 'pending').length,
    [myOrders]
  );

  if (!isOpen || !agency) return null;

  const isOwnAgency = agency.ownerUid === currentUser.id;
  const buyerIdLabel = currentUser.displayId || currentUser.id.slice(0, 8);

  const whatsappPrefillMessage = [
    `Salam ${agency.name} (${agency.agencyCode})!`,
    `I want to buy ${Number(coinsRequested || 0).toLocaleString()} Lenzo Coins.`,
    `My Name: ${currentUser.name}`,
    `My Lenzo ID: ${buyerIdLabel}`,
    `Payment Method: ${paymentMethod}`,
    paidAmountText.trim() ? `Amount Paid: ${paidAmountText.trim()}` : '',
    transactionRef.trim() ? `Transaction / Ref ID: ${transactionRef.trim()}` : '',
    lastOrderId ? `In-App Order #: ${lastOrderId.slice(-6).toUpperCase()}` : '',
    `Sharing my payment slip here for quick coin confirmation.`,
  ]
    .filter(Boolean)
    .join('\n');

  const whatsappDirectHref = buildWhatsAppUrl(agency.whatsappNumber, whatsappPrefillMessage);

  const handleOpenInAppChat = () => {
    if (!onSendMessage || isOwnAgency) return;
    const ownerProfile: UserProfile = {
      id: agency.ownerUid,
      displayId: agency.ownerDisplayId || agency.ownerUid.slice(0, 8),
      name: agency.name || agency.ownerName || 'Coin Seller Agency',
      username: agency.ownerUsername || `@${agency.agencyCode.toLowerCase()}`,
      avatar:
        agency.ownerAvatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(agency.name || 'Agency')}&background=8B20FF&color=fff`,
      bio: agency.description || 'Official Verified Lenzo Coin Seller Agency',
      level: 1,
      vipLevel: 0,
      isVIP: false,
      coins: 0,
      diamonds: 0,
      followersCount: 0,
      followingCount: 0,
      fansCount: '0',
      likesCount: '0',
    };
    onClose();
    onSendMessage(ownerProfile);
  };

  const handleSlipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image screenshot of your payment slip (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setErrorMessage('Payment slip image must be smaller than 12 MB.');
      return;
    }

    setErrorMessage(null);
    setUploadingSlip(true);
    try {
      const uploadedUrl = await uploadUserImage(file, 'payment_slips');
      setPaymentSlipUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not upload payment slip image. Please try again.');
    } finally {
      setUploadingSlip(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (isOwnAgency) {
      setErrorMessage('This is your own Coin Seller Agency.');
      return;
    }

    const parsedCoins = Math.floor(Number(coinsRequested));
    if (!Number.isFinite(parsedCoins) || parsedCoins <= 0) {
      setErrorMessage('Please enter a valid number of coins.');
      return;
    }
    if (!paymentSlipUrl && !transactionRef.trim()) {
      setErrorMessage('Please upload your payment slip screenshot or enter the Transaction / Reference ID.');
      return;
    }

    setIsSubmitting(true);
    const res = await submitCoinPurchaseSlipOrder({
      agency,
      buyer: currentUser,
      coinsRequested: parsedCoins,
      paidAmountText,
      paymentMethod,
      transactionRef,
      paymentSlipUrl,
      buyerWhatsapp,
      buyerNote,
    });
    setIsSubmitting(false);

    if (res.success && res.orderId) {
      setLastOrderId(res.orderId);
      setStatusMessage(
        `Payment slip sent to ${agency.name}! Order #${res.orderId.slice(-6).toUpperCase()} is now live — once the agency confirms with their PIN, coins will be credited to your account automatically.`
      );
      setTransactionRef('');
      setPaidAmountText('');
      setBuyerNote('');
      setPaymentSlipUrl('');
    } else {
      setErrorMessage(res.error || 'Could not submit payment slip. Please try again.');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const res = await cancelMyPendingCoinOrder(orderId);
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to cancel order.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md"
      style={{
        paddingTop: 'max(0.75rem, var(--app-safe-top))',
        paddingBottom: 'max(0.5rem, var(--app-safe-bottom))',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0E071B] border border-amber-400/30 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 bg-gradient-to-r from-[#231040] via-[#1A0B30] to-[#140724] flex items-start justify-between gap-2.5">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 text-[9px] font-black uppercase tracking-wider">
                <BadgeCheck className="w-3 h-3" />
                Verified Agency
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/45 text-[#FFC84A] text-[9px] font-black uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                Official Agency
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-[#E9D5FF] text-[9px] font-mono font-bold">
                {agency.agencyCode}
              </span>
            </div>
            <h3 className="text-base font-black text-white truncate">{agency.name}</h3>
            <p className="text-[11px] text-[#B9AECF] truncate">
              Holder: {agency.ownerName} · WA: {agency.whatsappNumber || 'In-App Support'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Payment Slip Modal"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instant Contact Strip (WhatsApp + In-App Chat) */}
        <div className="px-4 py-2.5 bg-[#130824] border-b border-white/10 flex items-center gap-2">
          {whatsappDirectHref ? (
            <a
              href={whatsappDirectHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#04140B] text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp Contact</span>
            </a>
          ) : (
            <div className="flex-1 py-2 px-3 rounded-xl bg-white/5 text-[#9B8DB5] text-xs font-bold text-center">
              WhatsApp Unavailable
            </div>
          )}

          {onSendMessage && !isOwnAgency && (
            <button
              type="button"
              onClick={handleOpenInAppChat}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>In-App Contact</span>
            </button>
          )}
        </div>

        {/* Sub-Tabs */}
        <div className="grid grid-cols-2 gap-1.5 px-4 pt-3 pb-2 bg-[#0E071B]">
          <button
            type="button"
            onClick={() => setActiveTab('order')}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'order'
                ? 'bg-[#FFC84A] text-[#090611] shadow-md'
                : 'bg-white/[0.05] text-[#C5B9DE] hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Send Payment Slip</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my_orders')}
            className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'my_orders'
                ? 'bg-[#FFC84A] text-[#090611] shadow-md'
                : 'bg-white/[0.05] text-[#C5B9DE] hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>My Orders ({myOrders.length})</span>
            {pendingOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black leading-none">
                {pendingOrdersCount}
              </span>
            )}
          </button>
        </div>

        {/* Feedback Banners */}
        {statusMessage && (
          <div className="mx-4 mb-1 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-400/45 text-emerald-100 text-xs space-y-2">
            <div className="flex items-start gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
            {whatsappDirectHref && (
              <a
                href={whatsappDirectHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-[11px] font-black"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Also Notify Agency on WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="mx-4 mb-1 px-3.5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-400/45 text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-2 space-y-4">
          {activeTab === 'order' ? (
            <form onSubmit={handleSubmitOrder} className="space-y-3.5">
              {/* Buyer Info Bar */}
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#C5B9DE]">Coins will be delivered to:</span>
                <span className="font-mono font-black text-[#FFC84A]">
                  {currentUser.name} · ID {buyerIdLabel}
                </span>
              </div>

              {/* Coins Quick Select + Input */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-white flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#FFC84A]" />
                  <span>Coins to Buy *</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {COIN_PRESETS.map((preset) => {
                    const active = Number(coinsRequested) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCoinsRequested(String(preset))}
                        className={`py-1.5 px-2 rounded-xl text-[11px] font-mono font-black border transition-all ${
                          active
                            ? 'bg-amber-500/25 border-[#FFC84A] text-[#FFC84A]'
                            : 'bg-white/[0.04] border-white/10 text-[#D4C7EA] hover:border-white/25'
                        }`}
                      >
                        {preset.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                      Custom Coins
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={coinsRequested}
                      onChange={(e) => setCoinsRequested(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs font-mono font-bold text-[#FFC84A] focus:outline-none focus:border-[#FFC84A]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#B9AECF] block mb-1">
                      Amount Paid (Optional)
                    </label>
                    <input
                      type="text"
                      value={paidAmountText}
                      onChange={(e) => setPaidAmountText(e.target.value)}
                      placeholder="e.g. PKR 1,500"
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-white block">Payment Method *</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                        paymentMethod === method
                          ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] border-transparent text-white shadow'
                          : 'bg-white/[0.04] border-white/10 text-[#C5B9DE] hover:text-white'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Reference & Buyer WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                    Transaction / TID Number
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. TID 8492019283"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#FFC84A]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                    Your WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(e.target.value)}
                    placeholder="+923001234567"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#FFC84A]"
                  />
                </div>
              </div>

              {/* Payment Slip Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-white flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Upload Payment Slip Screenshot</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSlipFileChange}
                  className="hidden"
                />

                {paymentSlipUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-400/45 bg-black/50 p-2 flex items-center gap-3">
                    <img
                      src={paymentSlipUrl}
                      alt="Uploaded Payment Slip"
                      onClick={() => setLightboxImageUrl(paymentSlipUrl)}
                      className="w-16 h-16 rounded-xl object-cover cursor-pointer border border-white/15 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Slip Ready to Send</span>
                      </p>
                      <p className="text-[10px] text-[#B9AECF]">
                        Tap image to preview · Visible only to you &amp; this agency.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentSlipUrl('')}
                      aria-label="Remove payment slip"
                      className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={uploadingSlip}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 px-3 rounded-2xl border border-dashed border-amber-400/45 bg-amber-500/[0.06] hover:bg-amber-500/[0.12] flex flex-col items-center justify-center gap-1.5 text-center transition-all disabled:opacity-60"
                  >
                    {uploadingSlip ? (
                      <>
                        <Loader2 className="w-5 h-5 text-[#FFC84A] animate-spin" />
                        <span className="text-xs font-bold text-[#FFC84A]">Uploading payment slip...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-[#FFC84A]" />
                        <span className="text-xs font-black text-white">
                          Tap to Attach Payment Slip Screenshot
                        </span>
                        <span className="text-[10px] text-[#B9AECF]">
                          JazzCash, EasyPaisa, or Bank Receipt Image
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Optional Note */}
              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                  Note for Agency (Optional)
                </label>
                <input
                  type="text"
                  maxLength={250}
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  placeholder="e.g. Sent from Ali's JazzCash, please confirm quickly"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              {/* Primary Action */}
              <button
                type="submit"
                disabled={isSubmitting || uploadingSlip || isOwnAgency}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F97316] text-[#090611] text-xs sm:text-sm font-black shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Slip to Agency...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      Send Payment Slip In-App ({Number(coinsRequested || 0).toLocaleString()} Coins)
                    </span>
                  </>
                )}
              </button>

              {isOwnAgency && (
                <p className="text-[11px] text-amber-200 text-center">
                  You own this Coin Seller Agency. Open Profile → Agency Center → Slips tab to verify buyer orders.
                </p>
              )}
            </form>
          ) : (
            /* MY ORDERS HISTORY */
            <div className="space-y-2.5">
              {myOrders.length === 0 ? (
                <div className="py-10 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-1.5">
                  <Receipt className="w-8 h-8 text-[#B9AECF]/50 mx-auto" />
                  <p className="text-xs font-bold text-white">No Coin Slip Orders Yet</p>
                  <p className="text-[11px] text-[#A59AB8]">
                    Submit your payment slip to any verified Coin Seller Agency to track coin delivery live.
                  </p>
                </div>
              ) : (
                myOrders.map((order) => {
                  const statusTone =
                    order.status === 'confirmed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : order.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                        : order.status === 'cancelled'
                          ? 'bg-white/10 text-[#B9AECF] border-white/15'
                          : 'bg-amber-500/20 text-[#FFC84A] border-amber-400/40';
                  return (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-2xl bg-[#160A2A] border border-white/10 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-white truncate">
                            {order.agencyName}{' '}
                            <span className="text-[10px] font-mono text-[#B9AECF]">
                              ({order.agencyCode})
                            </span>
                          </p>
                          <p className="text-[10px] text-[#A59AB8]">
                            #{order.id.slice(-6).toUpperCase()} · {order.paymentMethod}
                            {order.paidAmountText ? ` · ${order.paidAmountText}` : ''}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase shrink-0 ${statusTone}`}
                        >
                          {order.status === 'confirmed'
                            ? `+${(order.coinsSent || order.coinsRequested).toLocaleString()} Sent`
                            : order.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-mono font-black text-[#FFC84A]">
                          Requested: {order.coinsRequested.toLocaleString()} Coins
                        </span>
                        {order.transactionRef && (
                          <span className="font-mono text-[#C5B9DE] truncate max-w-[160px]">
                            Ref: {order.transactionRef}
                          </span>
                        )}
                      </div>

                      {order.sellerNote && (
                        <p className="text-[11px] text-emerald-200/90 bg-black/35 px-2.5 py-1.5 rounded-xl">
                          Agency: {order.sellerNote}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        {order.paymentSlipUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightboxImageUrl(order.paymentSlipUrl || null)}
                            className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>View Slip</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#8E7FA8]">No image attached</span>
                        )}

                        {order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => void handleCancelOrder(order.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-bold"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Slip Image Lightbox */}
      {lightboxImageUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImageUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-6 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImageUrl}
            alt="Payment Slip Full Preview"
            className="max-w-full max-h-[82vh] rounded-2xl object-contain border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
