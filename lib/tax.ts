import type { TaxBreakdown } from "./types";
import {
  FEDERAL_BRACKETS_2026,
  FEDERAL_BASIC_PERSONAL_AMOUNT,
  BC_BRACKETS_2026,
  BC_BASIC_PERSONAL_AMOUNT,
  CPP_2026,
  CPP2_2026,
  EI_2026,
} from "./constants";

function calcBracketTax(
  income: number,
  brackets: { min: number; max: number; rate: number }[],
  basicPersonalAmount: number
): { total: number; byBracket: { bracket: string; taxableInBracket: number; tax: number }[] } {
  let totalTax = 0;
  const byBracket: { bracket: string; taxableInBracket: number; tax: number }[] = [];

  for (const b of brackets) {
    const taxableInBracket = Math.max(0, Math.min(income, b.max) - b.min);
    const tax = taxableInBracket * b.rate;
    totalTax += tax;
    const label =
      b.max === Infinity
        ? `$${b.min.toLocaleString()}+`
        : `$${b.min.toLocaleString()} - $${b.max.toLocaleString()}`;
    byBracket.push({ bracket: label, taxableInBracket, tax });
  }

  // Basic personal amount is a non-refundable credit at the lowest marginal rate
  const bpaCredit = basicPersonalAmount * brackets[0].rate;
  totalTax = Math.max(0, totalTax - bpaCredit);

  return { total: totalTax, byBracket };
}

function calcCPP(income: number): number {
  const pensionable = Math.min(income, CPP_2026.maxPensionableEarnings) - CPP_2026.basicExemption;
  if (pensionable <= 0) return 0;
  return Math.min(pensionable * CPP_2026.rate, CPP_2026.maxContribution);
}

function calcCPP2(income: number): number {
  if (income <= CPP_2026.maxPensionableEarnings) return 0;
  const pensionable = Math.min(income, CPP2_2026.secondCeiling) - CPP_2026.maxPensionableEarnings;
  if (pensionable <= 0) return 0;
  return Math.min(pensionable * CPP2_2026.rate, CPP2_2026.maxContribution);
}

function calcEI(income: number): number {
  const insurable = Math.min(income, EI_2026.maxInsurableEarnings);
  return Math.min(insurable * EI_2026.rate, EI_2026.maxPremium);
}

export function calculateTax(annualGrossCAD: number): TaxBreakdown {
  if (annualGrossCAD <= 0) {
    return {
      federalTax: 0,
      federalByBracket: [],
      provincialTax: 0,
      provincialByBracket: [],
      cpp: 0,
      cpp2: 0,
      ei: 0,
      totalDeductions: 0,
      netIncome: 0,
      effectiveRate: 0,
      monthlyNet: 0,
    };
  }

  const federal = calcBracketTax(annualGrossCAD, FEDERAL_BRACKETS_2026, FEDERAL_BASIC_PERSONAL_AMOUNT);
  const provincial = calcBracketTax(annualGrossCAD, BC_BRACKETS_2026, BC_BASIC_PERSONAL_AMOUNT);
  const cpp = calcCPP(annualGrossCAD);
  const cpp2 = calcCPP2(annualGrossCAD);
  const ei = calcEI(annualGrossCAD);

  const totalDeductions = federal.total + provincial.total + cpp + cpp2 + ei;
  const netIncome = annualGrossCAD - totalDeductions;

  return {
    federalTax: federal.total,
    federalByBracket: federal.byBracket,
    provincialTax: provincial.total,
    provincialByBracket: provincial.byBracket,
    cpp,
    cpp2,
    ei,
    totalDeductions,
    netIncome,
    effectiveRate: totalDeductions / annualGrossCAD,
    monthlyNet: netIncome / 12,
  };
}
