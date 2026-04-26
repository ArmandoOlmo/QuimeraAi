import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { db } from '../../../../firebase';
import { Property, PropertyStatus } from '../../../../types/realEstate';

const toSlug = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

export const useRealEstate = (userId?: string, projectId?: string | null) => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const basePath = useMemo(() => {
        if (!userId || !projectId) return null;
        return `users/${userId}/projects/${projectId}`;
    }, [projectId, userId]);

    const syncPublicProperty = useCallback(async (propertyId: string, property: Partial<Property>, shouldDelete = false) => {
        if (!projectId) return;
        const publicRef = doc(db, 'publicPropertyListings', projectId, 'properties', propertyId);

        if (shouldDelete || property.status !== 'active') {
            await deleteDoc(publicRef).catch(() => undefined);
            return;
        }

        await setDoc(publicRef, {
            ...property,
            projectId,
            publishedAt: new Date().toISOString(),
        }, { merge: true });
    }, [projectId]);

    useEffect(() => {
        if (!basePath || !projectId) {
            setProperties([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribers = [
            onSnapshot(
                query(collection(db, `${basePath}/properties`), orderBy('createdAt', 'desc')),
                snapshot => {
                    setProperties(snapshot.docs.map(item => ({
                        id: item.id,
                        projectId,
                        ...item.data(),
                    })) as Property[]);
                    setIsLoading(false);
                },
                error => {
                    console.error('[useRealEstate] Error loading properties:', error);
                    setIsLoading(false);
                }
            )
        ];

        return () => unsubscribers.forEach(unsubscribe => unsubscribe());
    }, [basePath, projectId]);

    const addProperty = useCallback(async (data: Omit<Property, 'id' | 'projectId' | 'slug' | 'createdAt' | 'updatedAt'>) => {
        if (!basePath || !projectId) return undefined;
        const payload = {
            ...data,
            projectId,
            slug: toSlug(data.title),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const ref = await addDoc(collection(db, `${basePath}/properties`), payload);
        await syncPublicProperty(ref.id, { ...payload, id: ref.id } as any);
        return ref.id;
    }, [basePath, projectId, syncPublicProperty]);

    const updateProperty = useCallback(async (propertyId: string, updates: Partial<Property>) => {
        if (!basePath) return;
        const current = properties.find(property => property.id === propertyId);
        const payload = {
            ...updates,
            ...(updates.title ? { slug: toSlug(updates.title) } : {}),
            updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, `${basePath}/properties`, propertyId), payload);
        await syncPublicProperty(propertyId, { ...current, ...updates, ...payload, id: propertyId } as any);
    }, [basePath, properties, syncPublicProperty]);

    const updatePropertyStatus = useCallback((propertyId: string, status: PropertyStatus) => {
        return updateProperty(propertyId, {
            status,
            ...(status === 'active' ? { publishedAt: serverTimestamp() as any } : {}),
        });
    }, [updateProperty]);

    const deleteProperty = useCallback(async (propertyId: string) => {
        if (!basePath) return;
        await deleteDoc(doc(db, `${basePath}/properties`, propertyId));
        await syncPublicProperty(propertyId, {}, true);
    }, [basePath, syncPublicProperty]);



    return {
        properties,
        isLoading,
        addProperty,
        updateProperty,
        updatePropertyStatus,
        deleteProperty,
    };
};
