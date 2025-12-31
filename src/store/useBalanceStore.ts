import { create } from "zustand";
import { api } from "../services/api";

interface BalanceState {
  balanceGeneralBRL: number | null; // Total geral em BRL
  balanceGeneralUSD: number | null; // Total geral em USD
  balanceSupplier: number | null;
  balanceCarrier: number | null;
  balancePartnerBRL: number | null; // New
  balancePartnerUSD: number | null; // New
  isLoading: boolean;
  error: string | null;

  getBalances: () => Promise<void>;
  calculateGeneralBalance: () => { generalBalanceBRL: number; generalBalanceUSD: number } | null;
}

export const useBalanceStore = create<BalanceState>((set, get) => ({
  balanceGeneralBRL: null,
  balanceGeneralUSD: null,
  balanceCarrier: null,
  balancePartnerBRL: null, // New
  balancePartnerUSD: null, // New
  balanceSupplier: null,
  isLoading: false,
  error: null,

  // Unified method to fetch all balances
  getBalances: async () => {
    set({ isLoading: true, error: null });

    try {
      // Parallel requests for better performance
      const [suppliers, carriers, partners] = await Promise.all([
        api.get<{ total: number }>("/balance/suppliers"),
        api.get<{ total: number }>("/balance/carriers"),
        api.get<{ brlPartners: { total: number }; usdPartners: { total: number } }>("/balance/partners"),
      ]);

      console.log("partners", partners);

      set({
        balanceSupplier: suppliers.data.total,
        balanceCarrier: carriers.data.total,
        balancePartnerBRL: partners.data.brlPartners.total, // New
        balancePartnerUSD: partners.data.usdPartners.total, // New
        isLoading: false,
      });

      // Automatically calculate general balance
      get().calculateGeneralBalance();
    } catch (err) {
      console.error("Error fetching balances:", err);
      set({
        error: "Failed to load balance data",
        isLoading: false,
      });
    }
  },

  // Calculate general balance based on specific balances
  calculateGeneralBalance: () => {
    const { balanceSupplier, balanceCarrier, balancePartnerBRL, balancePartnerUSD } = get();

    console.log("teste", balanceSupplier, balanceCarrier, balancePartnerBRL, balancePartnerUSD);

    if (
      balanceSupplier === null ||
      balanceCarrier === null ||
      balancePartnerBRL === null ||
      balancePartnerUSD === null
    ) {
      return null;
    }

    // You might want to convert currencies here if needed
    // For now, we're just summing all values assuming they're in the same currency
    const generalBalanceUSD = balanceSupplier + balanceCarrier + balancePartnerUSD;
    const generalBalanceBRL = balanceSupplier + balanceCarrier + balancePartnerBRL;
    set({ balanceGeneralBRL: generalBalanceBRL, balanceGeneralUSD: generalBalanceUSD });
    return { generalBalanceBRL, generalBalanceUSD };
  },
}));
