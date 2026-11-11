import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  Plus, 
  CheckCircle2, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Sparkles, 
  ShieldCheck 
} from 'lucide-react';
import { UserProfile, RechargePackage, Transaction } from '../../types';
import { MOCK_RECHARGE_PACKAGES, MOCK_TRANSACTIONS } from '../../data/mockData';
import { COIN_CONFIG } from '../../utils/coinConfig';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onRechargeSuccess: (addedCoins: number) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRechargeSuccess,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage>(MOCK_RECHARGE_PACKAGES[1]);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{ package: RechargePackage; newTotal: number } | null>(null);

  if (!isOpen) return null;

  const handlePurchase = () => {
    setIsProcessing(true);
    const addedAmount = selectedPackage.coins + (selectedPackage.bonusCoins || 0);

    setTimeout(() => {
      setIsProcessing(false);
      onRechargeSuccess(addedAmount);

      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        type: 'recharge',
        description: `Wallet Recharge (${addedAmount.toLocaleString()} Coins)`,
        amount: addedAmount,
        date: 'Just now',
        status: 'completed',
      };
      setTransactions((prev) => [newTx, ...prev]);

      setSuccessDialog({
        package: selectedPackage,
        newTotal: currentUser.coins + addedAmount,
      });
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Purchase Result Modal */}
        {successDialog && (
          <div className="absolute inset-0 z-50 bg-[#160C25]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-black text-white font-display mb-1">Recharge Successful!</h3>
            <p className="text-xs text-[#B9AECF] mb-6 max-w-xs">
              Demo purchase confirmed. <span className="text-[#FFC84A] font-bold font-mono">+{((successDialog.package.coins) + (successDialog.package.bonusCoins || 0)).toLocaleString()} coins</span> have been added to your wallet!
            </p>

            <div className="p-4 rounded-2xl bg-[#211333] border border-white/10 w-full max-w-xs mb-6 text-left">
              <div className="flex justify-between text-xs text-[#B9AECF] mb-1.5">
                <span>Package:</span>
                <span className="text-white font-bold">{successDialog.package.price}</span>
              </div>
              <div className="flex justify-between text-xs text-[#B9AECF] mb-1.5">
                <span>Coins Added:</span>
                <span className="text-[#FFC84A] font-bold font-mono">+{((successDialog.package.coins) + (successDialog.package.bonusCoins || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-[#B9AECF] pt-2 border-t border-white/10 font-bold">
                <span>New Balance:</span>
                <span className="text-white font-mono">🪙 {successDialog.newTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSuccessDialog(null)}
              className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-lg shadow-[#F328D5]/30 active:scale-95 transition-all"
            >
              Continue
            </button>
          </div>
        )}

        {/* Top Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFC84A]/10 text-[#FFC84A] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">My Wallet</h3>
              <p className="text-[11px] text-[#B9AECF]">Lonzo Coins & Recharge Center</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#211333] hover:bg-[#2e1a47] flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Card Banner */}
        <div className="p-5 bg-gradient-to-r from-[#211333] via-[#351854] to-[#4d1668] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-[#B9AECF] font-medium">Available Coin Balance</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-[#FFC84A] font-mono tracking-tight">
                🪙 {currentUser.coins.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-emerald-400 font-semibold">{COIN_CONFIG.formatPkrEquivalent(currentUser.coins)}</span>
              <span className="text-white/40">•</span>
              <span className="text-[#B9AECF]">Ref: 1 Coin ≈ PKR 2</span>
            </div>
            <span className="text-[11px] text-white/70 mt-1">
              Diamonds: <span className="text-[#06B6D4] font-mono font-bold">{currentUser.diamonds.toLocaleString()}</span> (Creator Earnings)
            </span>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs text-[#FFC84A] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Coin System
            </span>
            <span className="text-[10px] text-[#B9AECF]">Standard in-app entertainment currency</span>
          </div>
        </div>


        {/* Segmented Switch: Recharge vs History */}
        <div className="flex px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('recharge')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'recharge'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow'
                : 'bg-[#211333] text-[#B9AECF] hover:text-white'
            }`}
          >
            Recharge Packages
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow'
                : 'bg-[#211333] text-[#B9AECF] hover:text-white'
            }`}
          >
            Transaction History
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar flex-1">
          {activeTab === 'recharge' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MOCK_RECHARGE_PACKAGES.map((pkg) => {
                  const isSelected = selectedPackage.id === pkg.id;
                  const totalPackageCoins = pkg.coins + (pkg.bonusCoins || 0);

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`relative p-3.5 rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#2d1747] to-[#3b1c5c] border-2 border-[#FFC84A] shadow-lg shadow-[#FFC84A]/15'
                          : 'bg-[#211333] hover:bg-[#2c1745] border border-white/5'
                      }`}
                    >
                      {pkg.discountBadge && (
                        <span className="absolute -top-2 bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow">
                          {pkg.discountBadge}
                        </span>
                      )}

                      <span className="text-xl mb-1">🪙</span>
                      <span className="text-base font-extrabold text-white font-mono">
                        {totalPackageCoins.toLocaleString()}
                      </span>
                      {pkg.bonusCoins && (
                        <span className="text-[10px] text-[#FFC84A] font-semibold">
                          Includes {pkg.bonusCoins} Bonus
                        </span>
                      )}

                      <div className="mt-2.5 w-full py-1.5 px-1 rounded-xl bg-white/10 text-white font-bold text-xs font-mono flex flex-col items-center">
                        <span>{pkg.price}</span>
                        <span className="text-[9px] text-[#FFC84A] font-sans font-semibold">
                          {COIN_CONFIG.formatPkrEquivalent(totalPackageCoins)}
                        </span>
                      </div>
                    </div>

                  );
                })}
              </div>

              {/* Purchase Trigger */}
              <div className="pt-2">
                <button
                  onClick={handlePurchase}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F328D5] text-[#090611] font-black text-sm shadow-xl shadow-[#FFC84A]/20 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-[#090611] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Recharge {selectedPackage.price} ({((selectedPackage.coins) + (selectedPackage.bonusCoins || 0)).toLocaleString()} Coins)</span>
                      <Sparkles className="w-4 h-4 fill-current" />
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#B9AECF]/60 text-center mt-2">
                  Simulation Mode: Coins will be instantly credited to your session balance.
                </p>
              </div>
            </div>
          ) : (
            /* Transactions List */
            <div className="space-y-2.5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-[#211333] border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{tx.description}</span>
                      <span className="text-[10px] text-[#B9AECF]">{tx.date}</span>
                    </div>
                  </div>

                  <span className={`text-xs font-black font-mono ${
                    tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} 🪙
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
