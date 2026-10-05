import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

let firestoreInstance: any = null;
let isMockFirestore = false;

// In-memory mock storage for development/test when environment credentials are not supplied
class MockFirestore {
  private data: Map<string, Map<string, any>> = new Map();

  private getCollection(col: string): Map<string, any> {
    if (!this.data.has(col)) {
      this.data.set(col, new Map());
    }
    return this.data.get(col)!;
  }

  collection(colName: string) {
    const self = this;
    const colMap = this.getCollection(colName);

    return {
      doc(docId?: string) {
        const id = docId || `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        return {
          id,
          async get() {
            const exists = colMap.has(id);
            const d = exists ? colMap.get(id) : undefined;
            return {
              id,
              exists: !!exists,
              data: () => (d ? JSON.parse(JSON.stringify(d)) : undefined),
            };
          },
          async set(data: any, options?: { merge?: boolean }) {
            if (options?.merge && colMap.has(id)) {
              const prev = colMap.get(id);
              colMap.set(id, { ...prev, ...data });
            } else {
              colMap.set(id, JSON.parse(JSON.stringify(data)));
            }
          },
          async update(data: any) {
            if (!colMap.has(id)) {
              throw new Error(`Document ${id} does not exist in collection ${colName}`);
            }
            const prev = colMap.get(id);
            colMap.set(id, { ...prev, ...data });
          },
          async delete() {
            colMap.delete(id);
          },
        };
      },
      where(field: string, op: string, value: any) {
        return self.createQuery(colName, [{ field, op, value }]);
      },
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        return self.createQuery(colName, [], { field, direction });
      },
      limit(n: number) {
        return self.createQuery(colName, [], undefined, n);
      },
      async get() {
        const docs = Array.from(colMap.entries()).map(([id, d]) => ({
          id,
          exists: true,
          data: () => JSON.parse(JSON.stringify(d)),
        }));
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
        };
      },
    };
  }

  private createQuery(
    colName: string,
    filters: Array<{ field: string; op: string; value: any }> = [],
    orderBy?: { field: string; direction: 'asc' | 'desc' },
    limitVal?: number
  ) {
    const self = this;
    const colMap = this.getCollection(colName);

    const queryObj: any = {
      where(field: string, op: string, value: any) {
        filters.push({ field, op, value });
        return queryObj;
      },
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        orderBy = { field, direction };
        return queryObj;
      },
      limit(n: number) {
        limitVal = n;
        return queryObj;
      },
      async get() {
        let items = Array.from(colMap.entries()).map(([id, d]) => ({
          id,
          ...d,
        }));

        // Apply filters
        for (const f of filters) {
          items = items.filter((item) => {
            const val = item[f.field];
            if (f.op === '==') return val === f.value;
            if (f.op === '!=') return val !== f.value;
            if (f.op === '>') return val > f.value;
            if (f.op === '>=') return val >= f.value;
            if (f.op === '<') return val < f.value;
            if (f.op === '<=') return val <= f.value;
            if (f.op === 'array-contains') return Array.isArray(val) && val.includes(f.value);
            return true;
          });
        }

        // Apply orderBy
        if (orderBy) {
          const { field, direction } = orderBy;
          items.sort((a, b) => {
            const va = a[field] ?? '';
            const vb = b[field] ?? '';
            if (va < vb) return direction === 'asc' ? -1 : 1;
            if (va > vb) return direction === 'asc' ? 1 : -1;
            return 0;
          });
        }

        // Apply limit
        if (typeof limitVal === 'number' && limitVal > 0) {
          items = items.slice(0, limitVal);
        }

        const docs = items.map((item) => {
          const { id, ...data } = item;
          return {
            id,
            exists: true,
            data: () => JSON.parse(JSON.stringify(data)),
          };
        });

        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
        };
      },
    };

    return queryObj;
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
    const txn = {
      async get(docRef: any) {
        return docRef.get();
      },
      set(docRef: any, data: any, options?: any) {
        return docRef.set(data, options);
      },
      update(docRef: any, data: any) {
        return docRef.update(data);
      },
      delete(docRef: any) {
        return docRef.delete();
      },
    };
    return updateFunction(txn);
  }

  batch() {
    const operations: Array<() => Promise<void>> = [];
    return {
      set(docRef: any, data: any, options?: any) {
        operations.push(() => docRef.set(data, options));
        return this;
      },
      update(docRef: any, data: any) {
        operations.push(() => docRef.update(data));
        return this;
      },
      delete(docRef: any) {
        operations.push(() => docRef.delete());
        return this;
      },
      async commit() {
        for (const op of operations) {
          await op();
        }
      },
    };
  }

  // Helper for tests/reset
  __clear() {
    this.data.clear();
  }

  // Export all collections to JSON
  async __exportAll() {
    const result: Record<string, any[]> = {};
    for (const [colName, map] of this.data.entries()) {
      result[colName] = Array.from(map.entries()).map(([id, data]) => ({
        id,
        ...data,
      }));
    }
    return result;
  }
}

export function getFirestore(): any {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountBase64 && projectId) {
    try {
      const decodedJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(decodedJson);

      if (getApps().length === 0) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId,
        });
      }
      firestoreInstance = getAdminFirestore();
      isMockFirestore = false;
      console.log(`[Firebase] Initialized Firestore connected to project: ${projectId}`);
      return firestoreInstance;
    } catch (err: any) {
      console.error('[Firebase] Failed to initialize Firebase Admin SDK from credentials:', err.message);
      console.error('[Firebase] Falling back to mock Firestore for safety.');
    }
  } else {
    console.warn(
      '[Firebase] Notice: FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT_BASE64 not set. Running with safe in-memory Firestore mock.'
    );
  }

  firestoreInstance = new MockFirestore();
  isMockFirestore = true;
  return firestoreInstance;
}

export function isUsingMock(): boolean {
  if (!firestoreInstance) {
    getFirestore();
  }
  return isMockFirestore;
}
