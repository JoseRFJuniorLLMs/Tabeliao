import { create } from "zustand";
import toast from "react-hot-toast";
import { contractsApi } from "@/lib/api";
import type { Contract } from "@/types";

interface ContractsState {
  contracts: Contract[];
  currentContract: Contract | null;
  isLoading: boolean;
  totalCount: number;
  currentPage: number;
  fetchContracts: (params?: Record<string, string | number>) => Promise<void>;
  getContract: (id: string) => Promise<void>;
  createContract: (data: Record<string, unknown>) => Promise<Contract | null>;
  signContract: (id: string) => Promise<void>;
  generateWithAI: (prompt: string) => Promise<string | null>;
  reviewWithAI: (id: string) => Promise<void>;
  setCurrentPage: (page: number) => void;
}

export const useContractsStore = create<ContractsState>()((set, get) => ({
  contracts: [],
  currentContract: null,
  isLoading: false,
  totalCount: 0,
  currentPage: 1,

  fetchContracts: async (params) => {
    set({ isLoading: true });
    try {
      const response = await contractsApi.list(params);
      set({
        contracts: response.data.contracts || response.data,
        totalCount: response.data.total || response.data.length,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      toast.error("Erro ao carregar contratos.");
    }
  },

  getContract: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await contractsApi.get(id);
      set({
        currentContract: response.data,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
      toast.error("Erro ao carregar contrato.");
    }
  },

  createContract: async (data) => {
    set({ isLoading: true });
    try {
      const response = await contractsApi.create(data);
      const newContract = response.data;

      set((state) => ({
        contracts: [newContract, ...state.contracts],
        isLoading: false,
      }));

      toast.success("Contrato criado com sucesso!");
      return newContract;
    } catch {
      set({ isLoading: false });
      toast.error("Erro ao criar contrato.");
      return null;
    }
  },

  signContract: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await contractsApi.sign(id);
      const updatedContract = response.data;

      set((state) => ({
        contracts: state.contracts.map((c) =>
          c.id === id ? updatedContract : c
        ),
        currentContract:
          state.currentContract?.id === id
            ? updatedContract
            : state.currentContract,
        isLoading: false,
      }));

      toast.success("Contrato assinado com sucesso!");
    } catch {
      set({ isLoading: false });
      toast.error("Erro ao assinar contrato.");
    }
  },

  generateWithAI: async (prompt: string) => {
    set({ isLoading: true });
    try {
      const response = await contractsApi.generateWithAI(prompt);
      set({ isLoading: false });
      return response.data.content;
    } catch {
      set({ isLoading: false });
      toast.error("Erro ao gerar contrato com IA.");
      return null;
    }
  },

  reviewWithAI: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await contractsApi.reviewWithAI(id);
      const updatedContract = response.data;

      set((state) => ({
        currentContract:
          state.currentContract?.id === id
            ? updatedContract
            : state.currentContract,
        isLoading: false,
      }));

      toast.success("Revisao concluida!");
    } catch {
      set({ isLoading: false });
      toast.error("Erro ao revisar contrato.");
    }
  },

  setCurrentPage: (page: number) => {
    set({ currentPage: page });
  },
}));
