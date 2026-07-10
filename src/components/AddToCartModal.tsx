"use client";

import { useState } from "react";
import { PriceResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

interface AddToCartModalProps {
  result: PriceResult;
  defaultProfitPercent: number;
  allowProfit?: boolean;
  onConfirm: (profitPercent: number, quantity: number) => void;
  onClose: () => void;
}

export function AddToCartModal({
  result,
  defaultProfitPercent,
  allowProfit = true,
  onConfirm,
  onClose,
}: AddToCartModalProps) {
  const [percent, setPercent] = useState(defaultProfitPercent);
  const [quantity, setQuantity] = useState(1);

  const resalePrice = result.price * (1 + percent / 100);
  const grossProfit = resalePrice - result.price;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-[480px] rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {allowProfit ? "Adicionar para revenda" : "Adicionar ao carrinho"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl leading-none text-gray-400"
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600">{result.productName}</p>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <span className="text-gray-500">Preço de custo</span>
          <span className="font-semibold text-gray-900">
            {formatCurrency(result.price)}
          </span>
        </div>

        <label className="mb-1 block text-sm font-medium text-gray-700">
          Quantidade
        </label>
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Diminuir quantidade"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-lg font-bold text-gray-600 active:bg-gray-100"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm"
          />
          <button
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Aumentar quantidade"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-lg font-bold text-gray-600 active:bg-gray-100"
          >
            +
          </button>
        </div>

        {allowProfit && (
          <>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Percentual de lucro desejado
            </label>
            <div className="mb-4 flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={200}
                step={1}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="flex-1 accent-ml-blue"
              />
              <input
                type="number"
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>

            <div className="mb-5 space-y-2 rounded-lg border border-ml-green/30 bg-ml-green/5 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Valor de revenda (unidade)</span>
                <span className="font-bold text-ml-green">
                  {formatCurrency(resalePrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Lucro bruto (unidade)</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(grossProfit)}
                </span>
              </div>
              {quantity > 1 && (
                <div className="flex items-center justify-between border-t border-ml-green/20 pt-2">
                  <span className="text-gray-600">Lucro total ({quantity}x)</span>
                  <span className="font-bold text-ml-green">
                    {formatCurrency(grossProfit * quantity)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        {!allowProfit && quantity > 1 && (
          <div className="mb-5 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <span className="text-gray-500">Subtotal ({quantity}x)</span>
            <span className="font-bold text-gray-900">
              {formatCurrency(result.price * quantity)}
            </span>
          </div>
        )}

        <button
          onClick={() => onConfirm(allowProfit ? percent : 0, quantity)}
          className="w-full rounded-lg bg-ml-blue py-3 text-sm font-bold text-white active:bg-ml-blue-dark"
        >
          {allowProfit ? "Salvar no carrinho" : "Adicionar ao carrinho"}
        </button>
      </div>
    </div>
  );
}
