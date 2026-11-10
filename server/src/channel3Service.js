// Channel3 E-Commerce & Product Sourcing API Service
// Enables Autonomous AI Agents to discover global inventory, compare wholesale prices,
// and prepare a quoted order for an explicitly approved PayPal/Fabric demo flow.

import { ulid } from 'ulid';
import { FX_RATES } from './corridorRules.js';

const CHANNEL3_API_KEY = process.env.CHANNEL3_API_KEY || '';

// Mock & live catalog items for global cross-border B2B commerce
const GLOBAL_CATALOG = [
  {
    sku: 'CH3-MED-8841',
    title: 'ISO-Certified Pulse Oximeters & Diagnostic Sensors',
    category: 'Healthcare & Medical Devices',
    supplierOrg: 'BankB1',
    supplierName: 'SingaMed Global Tech Pte Ltd',
    country: 'Singapore',
    unitPrice: 45.0,
    currency: 'SGD',
    minOrderQty: 100,
    availableStock: 5000,
    specifications: 'CE / FDA certified, Bluetooth 5.2 telemetry, 48-hr dispatch',
    leadTimeDays: 3,
  },
  {
    sku: 'CH3-SEMI-2099',
    title: 'Automotive Grade Microcontroller Chips (RISC-V 32nm)',
    category: 'Semiconductors & Electronics',
    supplierOrg: 'BankB1',
    supplierName: 'Apex Silicon Foundry Ltd',
    country: 'Singapore',
    unitPrice: 18.5,
    currency: 'SGD',
    minOrderQty: 500,
    availableStock: 12000,
    specifications: 'AEC-Q100 Grade 1 qualified, -40C to 125C temp range',
    leadTimeDays: 5,
  },
  {
    sku: 'CH3-AGRI-1004',
    title: 'Fair-Trade Organic Arabica Coffee Beans (Green Raw Lot)',
    category: 'Agricultural Commodities',
    supplierOrg: 'BankA1',
    supplierName: 'Deccan Agro Exports Ltd',
    country: 'India',
    unitPrice: 650.0,
    currency: 'INR',
    minOrderQty: 200,
    availableStock: 15000,
    specifications: 'Moisture < 11.5%, Screen 18/19, Direct Farm Origin',
    leadTimeDays: 7,
  },
  {
    sku: 'CH3-SOLAR-552',
    title: 'Bi-Facial High Efficiency Monocrystalline Solar Panels',
    category: 'Renewable Energy Hardware',
    supplierOrg: 'BankA1',
    supplierName: 'SolarShakti Power Corp',
    country: 'India',
    unitPrice: 8500.0,
    currency: 'INR',
    minOrderQty: 50,
    availableStock: 3500,
    specifications: '550W Tier 1 PV, 22.4% module efficiency, 25-yr warranty',
    leadTimeDays: 10,
  },
];
const liveCatalogBySku = new Map();

const CHANNEL3_API_URL = process.env.CHANNEL3_API_URL || 'https://api.trychannel3.com/v1/search';

/**
 * Search Channel3 Product Catalog for Agentic Commerce
 */
export async function searchChannel3Catalog(query = '', category = '') {
  const q = query.toLowerCase().trim();
  let liveProducts = [];

  if (CHANNEL3_API_KEY) {
    try {
      const response = await fetch(CHANNEL3_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': CHANNEL3_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query: query || 'wholesale electronics supplies', limit: 8 }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.products)) {
          liveProducts = data.products.map((p) => {
            const priceValue = typeof p.price === 'object' && p.price !== null ? p.price.value : p.price;
            const unitPrice = Number(priceValue);
            if (!p.id || !Number.isFinite(unitPrice) || unitPrice <= 0) return null;
            const currency = String(p.currency || p.price?.currency || 'USD').toUpperCase();
            return ({
            sku: p.id || `CH3-${ulid().slice(0, 6)}`,
            title: p.title || 'Enterprise Verified Sourcing Item',
            category: p.category || 'Global B2B Wholesale',
            supplierOrg: 'BankB1',
            supplierName: p.supplier_name || p.supplier?.name || p.brand || 'Channel3 seller (identity not verified)',
            country: p.country || p.origin_country || 'Not provided',
            unitPrice,
            currency,
            minOrderQty: 25,
            availableStock: 2500,
            specifications: p.description ? String(p.description).slice(0, 120) : 'No product specifications provided',
            leadTimeDays: 4,
            isLiveChannel3: true,
            settlementMappingIsDemo: true,
          });
          }).filter(Boolean);
          liveProducts.forEach((product) => liveCatalogBySku.set(product.sku, product));
        }
      }
    } catch (err) {
      console.warn('[Channel3] Live API call failed, falling back to curated catalog:', err.message);
    }
  }

  let combined = [...liveProducts, ...GLOBAL_CATALOG];

  if (q) {
    combined = combined.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.supplierName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
    );
  }

  if (category && category !== 'ALL') {
    combined = combined.filter((item) => item.category === category);
  }

  return {
    query,
    count: combined.length,
    liveItemCount: liveProducts.length,
    results: combined,
    poweredBy: liveProducts.length > 0 ? 'Channel3 Live 100M+ Products API' : 'Channel3 Curated Sourcing Engine',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Autonomous Sourcing Request
 * Calculates wholesale order total and prepares trade proposal terms
 */
export function generateProcurementQuote(sku, quantity, targetCurrency) {
  const item = liveCatalogBySku.get(sku) || GLOBAL_CATALOG.find((p) => p.sku === sku);
  if (!item) {
    throw new Error(`SKU ${sku} not found in Channel3 catalog`);
  }

  const requestedQty = Number(quantity);
  if (!Number.isSafeInteger(requestedQty) || requestedQty <= 0) throw new Error('Quantity must be a positive whole number');
  const qty = Math.max(requestedQty, item.minOrderQty);
  if (qty > item.availableStock) throw new Error(`Requested quantity exceeds available stock (${item.availableStock})`);
  const target = String(targetCurrency || (item.currency === 'INR' ? 'SGD' : item.currency === 'SGD' ? 'INR' : 'USD')).toUpperCase();
  if (!FX_RATES[item.currency] || !FX_RATES[target]) throw new Error(`Cannot calculate an illustrative quote for ${item.currency} to ${target}`);
  const totalItemCost = item.unitPrice * qty;
  const volumeDiscount = qty >= item.minOrderQty * 2 ? 0.05 : 0.02;
  const discountedTotal = totalItemCost * (1 - volumeDiscount);
  const targetSettlementAmount = Math.round((discountedTotal / FX_RATES[item.currency] * FX_RATES[target]) * 100) / 100;

  return {
    quoteId: `QTE-${ulid().slice(0, 8)}`,
    item,
    quantity: qty,
    baseUnitPrice: item.unitPrice,
    currency: item.currency,
    targetCurrency: target,
    grossAmount: totalItemCost,
    volumeDiscountPct: (volumeDiscount * 100).toFixed(1),
    netSettlementAmount: discountedTotal,
    targetSettlementAmount,
    fxRate: (FX_RATES[item.currency] / FX_RATES[target]).toPrecision(8),
    recommendedPayerOrg: item.supplierOrg === 'BankA1' ? 'BankB1' : 'BankA1',
    recommendedPayeeOrg: item.supplierOrg,
    timestamp: new Date().toISOString(),
  };
}
