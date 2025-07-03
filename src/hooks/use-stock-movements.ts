
"use client";

import { useState, useEffect } from 'react';
import type { StockMovement } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

export function useStockMovements(inventoryItemId: string | null) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!inventoryItemId) {
      setMovements([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'stockMovements'),
      where('inventoryItemId', '==', inventoryItemId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const movementsData: StockMovement[] = snapshot.docs.map(doc => {
          const data = doc.data();
          const ts = data.createdAt;
          let normalizedCreatedAt: string;

          if (ts && typeof ts.toDate === 'function') {
            normalizedCreatedAt = ts.toDate().toISOString();
          } else if (ts && typeof ts.seconds === 'number') {
            normalizedCreatedAt = new Date(ts.seconds * 1000).toISOString();
          } else if (doc.metadata.hasPendingWrites) {
            normalizedCreatedAt = new Date().toISOString();
          }
          else {
            normalizedCreatedAt = new Date().toISOString();
          }

          return {
            id: doc.id,
            ...data,
            createdAt: normalizedCreatedAt,
          } as StockMovement;
        });
        setMovements(movementsData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firebase stock movements snapshot error:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [inventoryItemId]);

  return { movements, isLoading };
}
