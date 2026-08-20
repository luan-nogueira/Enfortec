import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidWhatsApp(phone: string): boolean {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, "");

  // Tamanho inválido (mínimo 10 dígitos com DDD, máximo 15 internacional)
  if (clean.length < 10 || clean.length > 15) {
    return false;
  }

  // Não aceita números com todos os dígitos iguais (ex: 00000000000, 11111111111)
  if (/^(\d)\1+$/.test(clean)) {
    return false;
  }

  // Se tiver prefixo +55 com 12 ou 13 dígitos
  let num = clean;
  if (num.startsWith("55") && (num.length === 12 || num.length === 13)) {
    num = num.substring(2);
  }

  // Padrão brasileiro (10 dígitos fixo ou 11 dígitos celular)
  if (num.length === 10 || num.length === 11) {
    const ddd = parseInt(num.substring(0, 2), 10);
    if (isNaN(ddd) || ddd < 11 || ddd > 99) {
      return false;
    }
    if (num.length === 11 && num[2] !== "9") {
      return false;
    }
    return true;
  }

  return clean.length >= 10 && clean.length <= 15;
}

