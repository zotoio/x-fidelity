// This file contains many functions to trigger the functionCount-iterative rule

export function function1() { return 1; }
export function function2() { return 2; }
export function function3() { return 3; }
export function function4() { return 4; }
export function function5() { return 5; }
export function function6() { return 6; }
export function function7() { return 7; }
export function function8() { return 8; }
export function function9() { return 9; }
export function function10() { return 10; }
export function function11() { return 11; }
export function function12() { return 12; }
export function function13() { return 13; }
export function function14() { return 14; }
export function function15() { return 15; }
export function function16() { return 16; }
export function function17() { return 17; }
export function function18() { return 18; }
export function function19() { return 19; }
export function function20() { return 20; }
export function function21() { return 21; }
export function function22() { return 22; }
export function function23() { return 23; }
export function function24() { return 24; }
export function function25() { return 25; }

// Additional utility functions to exceed the threshold
export const utilityFunction1 = () => 'utility1';
export const utilityFunction2 = () => 'utility2';
export const utilityFunction3 = () => 'utility3';
export const utilityFunction4 = () => 'utility4';
export const utilityFunction5 = () => 'utility5';

// Class methods also count as functions
export class ManyMethodsClass {
  method1() { return 'method1'; }
  method2() { return 'method2'; }
  method3() { return 'method3'; }
  method4() { return 'method4'; }
  method5() { return 'method5'; }
  method6() { return 'method6'; }
  method7() { return 'method7'; }
  method8() { return 'method8'; }
  method9() { return 'method9'; }
  method10() { return 'method10'; }
}

// Anonymous functions
export const anonymousFunction1 = function() { return 'anon1'; };
export const anonymousFunction2 = function() { return 'anon2'; };
export const anonymousFunction3 = function() { return 'anon3'; };
export const anonymousFunction4 = function() { return 'anon4'; };
export const anonymousFunction5 = function() { return 'anon5'; };

// This file should trigger the functionCount rule as it has >20 functions 