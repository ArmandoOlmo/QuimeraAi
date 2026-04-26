import { FirebaseTimestamp } from './ecommerce';

export type PropertyStatus = 'draft' | 'active' | 'pending' | 'sold' | 'archived';
export type PropertyType = 'house' | 'condo' | 'apartment' | 'townhouse' | 'land' | 'commercial';

export interface PropertyImage {
    id: string;
    url: string;
    altText?: string;
    position: number;
}

export interface Property {
    id: string;
    projectId: string;
    title: string;
    slug: string;
    description: string;
    price: number;
    address: string;
    city: string;
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    yearBuilt?: number;
    parkingSpaces?: number;
    lotSize?: number;
    state?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
    amenities: string[];
    images: PropertyImage[];
    videoUrl?: string;
    virtualTourUrl?: string;
    status: PropertyStatus;
    isFeatured: boolean;
    publishedAt?: FirebaseTimestamp;
    createdAt: FirebaseTimestamp;
    updatedAt: FirebaseTimestamp;
}

