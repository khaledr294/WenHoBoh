/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'customer' | 'pharmacy' | 'admin' | 'splitscreen' | 'gateway';

export type Language = 'ar' | 'en';

export interface UserProfile {
  phone: string;
  name: string;
  isRegistered: boolean;
}

export type ProductCategory = 'rx' | 'otc' | 'baby' | 'cosmetics' | 'supplements' | 'devices' | 'other';

export interface Pharmacy {
  id: string;
  nameAr: string;
  nameEn: string;
  addressAr: string;
  addressEn: string;
  latitude: number;
  longitude: number;
  isVerified: boolean;
  licenseNumber: string;
  rating: number;
  responseRate: number;
  avgResponseTimeSec: number;
  status: 'active' | 'pending' | 'suspended';
}

export interface CustomerRequest {
  id: string;
  productName: string;
  category: ProductCategory;
  latitude: number;
  longitude: number;
  radiusKm: number;
  prescriptionImage: string | null;
  notes: string | null;
  acceptsAlternative: boolean;
  status: 'active' | 'fulfilled' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
}

export type ResponseStatus = 'available' | 'not_available' | 'alternative';

export interface PharmacyResponse {
  id: string;
  requestId: string;
  pharmacyId: string;
  status: ResponseStatus;
  alternativeName?: string;
  price?: number;
  notes?: string;
  respondedAt: string;
}

export interface Reservation {
  id: string;
  requestId: string;
  responseId: string;
  customerPhone: string;
  pharmacyId: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled_customer' | 'cancelled_pharmacy' | 'no_show';
  reservedAt: string;
  expiresAt: string;
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: 'request_created' | 'response_sent' | 'reservation_created' | 'reservation_completed' | 'verification_approved' | 'abuse_warning';
  messageAr: string;
  messageEn: string;
}
