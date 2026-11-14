import {
  parseDateOnly,
  formatExpiryDate,
  getDaysUntilExpiry,
  getExpiryLabel,
  getExpiryStatus,
  getExpiringPurchases,
  getProductNextExpiry,
} from './expiry.ts';
import type { Product, Purchase, Store } from '../types/index.ts';

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Assertion failed: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertTrue(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed: expected true, got false');
  }
}

console.log('=== Tests unitaires src/utils/expiry.ts ===');

const fixedNow = new Date(2026, 10, 14); // 14 Novembre 2026

// 1. parseDateOnly & formatExpiryDate
const d = parseDateOnly('2026-11-20');
assertTrue(d !== null, 'Date parsing failed');
if (d) {
  assertEqual(d.getFullYear(), 2026);
  assertEqual(d.getMonth(), 10);
  assertEqual(d.getDate(), 20);
}
assertEqual(formatExpiryDate('2026-11-20'), '20/11/2026');
console.log('✅ PASS : parseDateOnly & formatExpiryDate');

// 2. getDaysUntilExpiry & getExpiryLabel
assertEqual(getDaysUntilExpiry('2026-11-14', fixedNow), 0);
assertEqual(getExpiryLabel(0), "Expire aujourd'hui");

assertEqual(getDaysUntilExpiry('2026-11-15', fixedNow), 1);
assertEqual(getExpiryLabel(1), 'Expire demain');

assertEqual(getDaysUntilExpiry('2026-11-21', fixedNow), 7);
assertEqual(getExpiryLabel(7), 'Expire dans 7 j');

assertEqual(getDaysUntilExpiry('2026-11-13', fixedNow), -1);
assertEqual(getExpiryLabel(-1), 'Périmé depuis hier');

assertEqual(getDaysUntilExpiry('2026-11-10', fixedNow), -4);
assertEqual(getExpiryLabel(-4), 'Dépassée depuis 4 j');
console.log('✅ PASS : getDaysUntilExpiry & getExpiryLabel');

// 3. getExpiryStatus (alertDays = 7)
const stExpired = getExpiryStatus('2026-11-10', 7, fixedNow);
assertEqual(stExpired?.isExpired, true);
assertEqual(stExpired?.isAlert, true);
assertEqual(stExpired?.statusLevel, 'danger');

const stWarning = getExpiryStatus('2026-11-18', 7, fixedNow);
assertEqual(stWarning?.isExpired, false);
assertEqual(stWarning?.isWarning, true);
assertEqual(stWarning?.isAlert, true);
assertEqual(stWarning?.statusLevel, 'warning');

const stNormal = getExpiryStatus('2026-11-25', 7, fixedNow); // dans 11 jours
assertEqual(stNormal?.isExpired, false);
assertEqual(stNormal?.isWarning, false);
assertEqual(stNormal?.isAlert, false);
assertEqual(stNormal?.statusLevel, 'normal');
console.log('✅ PASS : getExpiryStatus niveaux danger / warning / normal');

// 4. getExpiringPurchases avec filtrage strict stock > 0
const dummyProducts: Product[] = [
  { id: 'P1', barcode: '', name: 'Lait entier', category: 'Frais', unit: 'l', brand: '', format: '1 l', stock: 5, minStockAlert: 2, avgPurchasePrice: 1.2, mainStoreId: '', notes: '', isActive: true },
  { id: 'P2', barcode: '', name: 'Beurre doux', category: 'Frais', unit: 'kg', brand: '', format: '250 g', stock: 0, minStockAlert: 1, avgPurchasePrice: 8.0, mainStoreId: '', notes: '', isActive: true }, // Stock = 0 !
  { id: 'P3', barcode: '', name: 'Crème fraîche', category: 'Frais', unit: 'l', brand: '', format: '50 cl', stock: 2, minStockAlert: 1, avgPurchasePrice: 3.5, mainStoreId: '', notes: '', isActive: true },
  { id: 'P4', barcode: '', name: 'Farine T55', category: 'Épicerie', unit: 'kg', brand: '', format: '1 kg', stock: 10, minStockAlert: 2, avgPurchasePrice: 1.0, mainStoreId: '', notes: '', isActive: false }, // Inactif !
];

const dummyStores: Store[] = [
  { id: 'S1', name: 'Metro Cash & Carry', type: 'Grossiste' },
  { id: 'S2', name: 'Ferme Locale', type: 'Producteur' },
];

const dummyPurchases: Purchase[] = [
  // P1 : stock 5 > 0, expiré le 10/11 -> doit apparaître (danger)
  { id: 'A1', date: '2026-11-01', productId: 'P1', qty: 5, unit: 'l', pricePaid: 6, unitPrice: 1.2, storeId: 'S1', batchNo: 'LOT-LAIT-01', expiryDate: '2026-11-10' },
  // P2 : stock = 0, expiré le 08/11 -> NE DOIT PAS apparaître car stock = 0
  { id: 'A2', date: '2026-11-01', productId: 'P2', qty: 2, unit: 'kg', pricePaid: 16, unitPrice: 8, storeId: 'S1', batchNo: 'LOT-BEURRE-01', expiryDate: '2026-11-08' },
  // P3 : stock 2 > 0, expire le 18/11 (dans 4 jours <= 7) -> doit apparaître (warning)
  { id: 'A3', date: '2026-11-12', productId: 'P3', qty: 2, unit: 'l', pricePaid: 7, unitPrice: 3.5, storeId: 'S2', batchNo: 'LOT-CREME-99', expiryDate: '2026-11-18' },
  // P1 : stock 5 > 0, expire le 30/11 (> 7 jours) -> NE DOIT PAS apparaître
  { id: 'A4', date: '2026-11-12', productId: 'P1', qty: 3, unit: 'l', pricePaid: 3.6, unitPrice: 1.2, storeId: 'S1', batchNo: 'LOT-LAIT-02', expiryDate: '2026-11-30' },
  // P4 : produit inactif -> NE DOIT PAS apparaître
  { id: 'A5', date: '2026-11-10', productId: 'P4', qty: 5, unit: 'kg', pricePaid: 5, unitPrice: 1, storeId: 'S1', batchNo: 'LOT-FARINE', expiryDate: '2026-11-12' },
];

const expiring = getExpiringPurchases(dummyPurchases, dummyProducts, dummyStores, 7, fixedNow);
assertEqual(expiring.length, 2, 'Doit retourner exactement 2 achats (A1 et A3)');
assertEqual(expiring[0].purchase.id, 'A1', 'A1 périmé doit être premier');
assertEqual(expiring[0].statusLevel, 'danger');
assertEqual(expiring[0].store?.name, 'Metro Cash & Carry');
assertEqual(expiring[1].purchase.id, 'A3', 'A3 arrivant dans 4j doit être second');
assertEqual(expiring[1].statusLevel, 'warning');
assertEqual(expiring[1].store?.name, 'Ferme Locale');
console.log('✅ PASS : getExpiringPurchases (filtrage stock > 0, fournisseurs, tri par urgence)');

// 5. getProductNextExpiry pour fiche produit
const p1Next = getProductNextExpiry('P1', dummyPurchases, 7, fixedNow);
assertTrue(p1Next !== null);
if (p1Next) {
  assertEqual(p1Next.purchase.id, 'A1'); // Le plus urgent est le périmé du 10/11
  assertEqual(p1Next.batchNo, 'LOT-LAIT-01');
  assertEqual(p1Next.statusLevel, 'danger');
}

// Produit sans DLC
const pEmpty = getProductNextExpiry('UNKNOWN', dummyPurchases, 7, fixedNow);
assertEqual(pEmpty, null);
console.log('✅ PASS : getProductNextExpiry pour fiche produit');

console.log('Tous les tests expiry.ts ont réussi avec succès !');
