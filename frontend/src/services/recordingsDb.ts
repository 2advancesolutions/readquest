/**
 * recordingsDb.ts
 * IndexedDB CRUD for reading recordings.
 * DB: readquest-recordings  |  Store: recordings
 */

import type { Recording } from '../types'

const DB_NAME = 'readquest-recordings'
const DB_VERSION = 1
const STORE = 'recordings'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('byStudentBook', ['studentId', 'bookId'], { unique: false })
        store.createIndex('byCreatedAt', 'createdAt', { unique: false })
        store.createIndex('byStudent', 'studentId', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Save a new recording. Returns the generated id. */
export async function saveRecording(recording: Omit<Recording, 'id'>): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).add(recording)
    req.onsuccess = () => resolve(req.result as number)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/** Get all recordings for a specific book, newest first. */
export async function getRecordingsByBook(
  studentId: string,
  bookId: string
): Promise<Recording[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const index = tx.objectStore(STORE).index('byStudentBook')
    const req = index.getAll([studentId, bookId])
    req.onsuccess = () => {
      const results: Recording[] = req.result ?? []
      // Sort newest first
      results.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      resolve(results)
    }
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/** Get a single recording by id. */
export async function getRecording(id: number): Promise<Recording | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as Recording | undefined)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export interface BookSummary {
  bookId: string
  bookTitle: string
  bookCover?: string
  gradeLevel: number
  recordingCount: number
  lastRecordedAt: string
  avgAccuracy: number
}

/** Get all unique books that have recordings for a student. */
export async function getAllBooks(studentId: string): Promise<BookSummary[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const index = tx.objectStore(STORE).index('byStudent')
    const req = index.getAll(studentId)
    req.onsuccess = () => {
      const all: Recording[] = req.result ?? []
      // Group by bookId
      const map = new Map<string, BookSummary>()
      for (const r of all) {
        if (!map.has(r.bookId)) {
          map.set(r.bookId, {
            bookId: r.bookId,
            bookTitle: r.bookTitle,
            bookCover: r.bookCover,
            gradeLevel: r.gradeLevel,
            recordingCount: 0,
            lastRecordedAt: r.createdAt,
            avgAccuracy: 0,
          })
        }
        const entry = map.get(r.bookId)!
        entry.recordingCount++
        if (new Date(r.createdAt) > new Date(entry.lastRecordedAt)) {
          entry.lastRecordedAt = r.createdAt
        }
        entry.avgAccuracy += r.accuracy
      }
      // Compute averages + sort newest first
      const result = Array.from(map.values()).map(b => ({
        ...b,
        avgAccuracy: Math.round(b.avgAccuracy / b.recordingCount),
      }))
      result.sort((a, b) =>
        new Date(b.lastRecordedAt).getTime() - new Date(a.lastRecordedAt).getTime()
      )
      resolve(result)
    }
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/** Delete a recording by id. */
export async function deleteRecording(id: number): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const req = tx.objectStore(STORE).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

/** Trigger a browser download of the recording as a .webm file. */
export function downloadRecording(recording: Recording): void {
  const url = URL.createObjectURL(recording.audioBlob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date(recording.createdAt).toLocaleDateString('en-US').replace(/\//g, '-')
  a.download = `${recording.bookTitle}-page${recording.pageNumber}-${date}.webm`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
