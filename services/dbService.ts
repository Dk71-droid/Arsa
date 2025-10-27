import type { LearningPlan, Student, AttendanceRecord, HolidayRecord, ClassProfile } from '../types';

const DB_NAME = 'AsistenKurikulumDB';
const DB_VERSION = 5; // Incremented version for new schema
const PLANS_STORE = 'learningPlans';
const STUDENTS_STORE = 'masterStudents';
const CLASSES_STORE = 'classProfiles';
const STATE_STORE = 'appState';
const ATTENDANCE_STORE = 'attendance';
const HOLIDAYS_STORE = 'holidays';
const API_KEYS_STORE = 'apiKeys'; // New store for API keys

let db: IDBDatabase;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Database error:', request.error);
      reject('Database error: ' + request.error);
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PLANS_STORE)) {
        db.createObjectStore(PLANS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STUDENTS_STORE)) {
        db.createObjectStore(STUDENTS_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CLASSES_STORE)) {
        db.createObjectStore(CLASSES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(ATTENDANCE_STORE)) {
        db.createObjectStore(ATTENDANCE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HOLIDAYS_STORE)) {
        db.createObjectStore(HOLIDAYS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(API_KEYS_STORE)) {
        db.createObjectStore(API_KEYS_STORE, { keyPath: 'userId' });
      }
    };
  });
}

// --- Generic Helpers ---

async function getAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result as T[]);
        };
        request.onerror = () => {
            console.error(`Error fetching all from ${storeName}:`, request.error);
            reject(request.error);
        };
    });
}

async function put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(value);

        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            console.error(`Error putting into ${storeName}:`, request.error);
            reject(request.error);
        };
    });
}

async function get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
            resolve(request.result as T | undefined);
        };
        request.onerror = () => {
            console.error(`Error getting from ${storeName}:`, request.error);
            reject(request.error);
        };
    });
}

async function deleteByKey(storeName: string, key: string | number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}


async function clearStore(storeName: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            console.error(`Error clearing ${storeName}:`, request.error);
            reject(request.error);
        };
    });
}


// --- Learning Plan Functions ---
export const getAllPlans = () => getAll<LearningPlan>(PLANS_STORE);
export const savePlan = (plan: LearningPlan) => put<LearningPlan>(PLANS_STORE, plan);
export const deletePlan = (planId: string) => deleteByKey(PLANS_STORE, planId);
export const saveAllPlans = async (plans: LearningPlan[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(PLANS_STORE, 'readwrite');
        const store = transaction.objectStore(PLANS_STORE);
        plans.forEach(plan => store.put(plan));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
export const clearPlans = () => clearStore(PLANS_STORE);

// --- Class Profile Functions ---
export const getAllClassProfiles = () => getAll<ClassProfile>(CLASSES_STORE);
export const saveClassProfile = (profile: ClassProfile) => put<ClassProfile>(CLASSES_STORE, profile);
export const deleteClassProfile = (profileId: string) => deleteByKey(CLASSES_STORE, profileId);
export const saveAllClassProfiles = async (profiles: ClassProfile[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(CLASSES_STORE, 'readwrite');
        const store = transaction.objectStore(CLASSES_STORE);
        profiles.forEach(profile => store.put(profile));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
export const clearClassProfiles = () => clearStore(CLASSES_STORE);

// --- Student Functions ---
export const getAllStudents = () => getAll<Student>(STUDENTS_STORE);
export const deleteStudent = (studentId: number) => deleteByKey(STUDENTS_STORE, studentId);

export const addStudents = async (students: Omit<Student, 'id'>[]): Promise<Student[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STUDENTS_STORE, 'readwrite');
        const store = transaction.objectStore(STUDENTS_STORE);
        const addedStudents: Student[] = [];

        if (students.length === 0) {
            resolve([]);
            return;
        }

        students.forEach(student => {
            const request = store.add(student);
            request.onsuccess = () => {
                addedStudents.push({ ...student, id: request.result as number });
            };
        });

        transaction.oncomplete = () => {
            resolve(addedStudents);
        };
        transaction.onerror = (event) => {
            console.error("Error during bulk student add transaction: ", transaction.error);
            reject(transaction.error);
        };
    });
};

export const saveStudent = (student: Student) => {
    return put<Student>(STUDENTS_STORE, student);
};

export const saveAllStudents = async (students: Student[]): Promise<void> => {
    if (!Array.isArray(students)) {
        console.warn('saveAllStudents called with a non-array value:', students);
        return;
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STUDENTS_STORE, 'readwrite');
        const store = transaction.objectStore(STUDENTS_STORE);

        students.forEach(student => {
             if (typeof student === 'object' && student !== null) {
                store.put(student);
            }
        });

        transaction.oncomplete = () => {
            resolve();
        };

        transaction.onerror = () => {
            console.error('Error saving all students:', transaction.error);
            reject(transaction.error);
        };
    });
};
export const clearStudents = () => clearStore(STUDENTS_STORE);


// --- App State Functions ---
export const getAppState = async (key: string): Promise<string | null> => {
    const result = await get<{ key: string, value: string }>(STATE_STORE, key);
    return result ? result.value : null;
};

export const setAppState = (key: string, value: string | null) => {
    if (value === null) return removeAppState(key);
    return put<{ key: string, value: string }>(STATE_STORE, { key, value });
};

export const removeAppState = (key: string) => deleteByKey(STATE_STORE, key);
export const clearAppState = () => clearStore(STATE_STORE);


// --- Attendance Functions ---
export const getAllAttendance = () => getAll<AttendanceRecord>(ATTENDANCE_STORE);

export const saveAttendanceBatch = async (records: AttendanceRecord[]) => {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(ATTENDANCE_STORE, 'readwrite');
        const store = transaction.objectStore(ATTENDANCE_STORE);
        records.forEach(record => store.put(record));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const saveAllAttendance = async (records: AttendanceRecord[]): Promise<void> => {
    if (!Array.isArray(records)) {
        console.warn('saveAllAttendance called with non-array:', records);
        return;
    }
    await clearAttendance();
    return saveAttendanceBatch(records);
};

export const clearAttendance = () => clearStore(ATTENDANCE_STORE);

// --- Holiday Functions ---
export const getAllHolidays = () => getAll<HolidayRecord>(HOLIDAYS_STORE);
export const saveHoliday = (holiday: HolidayRecord) => put<HolidayRecord>(HOLIDAYS_STORE, holiday);
export const deleteHoliday = (date: string) => deleteByKey(HOLIDAYS_STORE, date);
export const saveAllHolidays = async (holidays: HolidayRecord[]): Promise<void> => {
    if (!Array.isArray(holidays)) return;
    await clearHolidays();
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(HOLIDAYS_STORE, 'readwrite');
        const store = transaction.objectStore(HOLIDAYS_STORE);
        holidays.forEach(holiday => store.put(holiday));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
export const clearHolidays = () => clearStore(HOLIDAYS_STORE);

// --- API Key Functions ---
export const getApiKey = (userId: string) => get<{ userId: string, apiKey: string }>(API_KEYS_STORE, userId);
export const saveApiKey = (userId: string, apiKey: string) => put(API_KEYS_STORE, { userId, apiKey });
export const clearApiKeys = () => clearStore(API_KEYS_STORE);