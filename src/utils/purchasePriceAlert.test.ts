import { comparePurchasePrice, formatPercentNumber } from './purchasePriceAlert.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`❌ ÉCHEC : ${msg}`);
  } else {
    console.log(`✅ PASS : ${msg}`);
  }
}

// 1. Tests formatPercentNumber
assert(formatPercentNumber(15) === '15', 'formatPercentNumber entier');
assert(formatPercentNumber(15.0) === '15', 'formatPercentNumber avec .0');
assert(formatPercentNumber(15.25) === '15.3', 'formatPercentNumber arrondi 1 décimale');

// 2. Tests sans alerte (écart <= 10 %)
assert(comparePurchasePrice(2.0, 2.0).hasAlert === false, 'aucun écart');
assert(comparePurchasePrice(2.1, 2.0).hasAlert === false, '+5% ne dépasse pas 10%');
assert(comparePurchasePrice(1.9, 2.0).hasAlert === false, '-5% ne dépasse pas 10%');
assert(comparePurchasePrice(2.2, 2.0).hasAlert === false, '+10% pile ne dépasse pas strictement 10%');
assert(comparePurchasePrice(1.8, 2.0).hasAlert === false, '-10% pile ne dépasse pas');

// 3. Tests hausse > 10 %
const rHausse = comparePurchasePrice(2.4, 2.0); // +20%
assert(rHausse.hasAlert === true, 'alerte hausse déclenchée');
assert(rHausse.type === 'increase', 'type increase');
assert(rHausse.diffPercent === 20, 'diffPercent 20');
assert(rHausse.message === 'Prix en hausse de 20 %', 'message hausse 20%');

const rHausseDec = comparePurchasePrice(2.25, 2.0); // +12.5%
assert(rHausseDec.hasAlert === true, 'alerte hausse décimale');
assert(rHausseDec.message === 'Prix en hausse de 12.5 %', 'message hausse 12.5%');

// 4. Tests baisse > 10 %
const rBaisse = comparePurchasePrice(1.6, 2.0); // -20%
assert(rBaisse.hasAlert === true, 'alerte baisse déclenchée');
assert(rBaisse.type === 'decrease', 'type decrease');
assert(rBaisse.diffPercent === 20, 'diffPercent 20');
assert(rBaisse.message === 'Prix en baisse de 20 %', 'message baisse 20%');

const rBaisseDec = comparePurchasePrice(1.75, 2.0); // -12.5%
assert(rBaisseDec.hasAlert === true, 'alerte baisse décimale');
assert(rBaisseDec.message === 'Prix en baisse de 12.5 %', 'message baisse 12.5%');

// 5. Cas limites (prix nuls, invalides)
assert(comparePurchasePrice(0, 2.0).hasAlert === false, 'nouveau prix 0');
assert(comparePurchasePrice(2.0, 0).hasAlert === false, 'prix précédent 0');
assert(comparePurchasePrice(NaN, 2.0).hasAlert === false, 'nouveau prix NaN');
assert(comparePurchasePrice(2.0, -1).hasAlert === false, 'prix précédent négatif');

console.log('Tous les tests purchasePriceAlert.ts ont réussi avec succès !');
