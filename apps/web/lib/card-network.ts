export type CardNetwork = 'visa' | 'mastercard' | 'amex'

export const CARD_NETWORK_OPTIONS: Array<{ value: CardNetwork; label: string }> = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'American Express' },
]

export function getCardNetworkLabel(network: string | null | undefined) {
  return CARD_NETWORK_OPTIONS.find((option) => option.value === network)?.label ?? 'Card'
}

export function getCardNetworkAsset(network: string | null | undefined) {
  switch (network) {
    case 'visa':
      return '/card-networks/visa.png'
    case 'mastercard':
      return '/card-networks/mastercard.png'
    case 'amex':
      return '/card-networks/amex.png'
    default:
      return '/card-networks/generic-card.png'
  }
}
