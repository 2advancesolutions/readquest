/**
 * useAudioRecorder.ts
 * MediaRecorder wrapper that captures mic audio.
 * The stream is obtained externally (from getUserMedia) to allow
 * sharing it with the Web Speech API.
 */

import { useRef, useCallback } from 'react'

export interface AudioRecorderHook {
  startRecording: (stream: MediaStream) => void
  stopRecording: () => Promise<{ blob: Blob; duration: number } | null>
  isRecording: () => boolean
}

export function useAudioRecorder(): AudioRecorderHook {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)

  const isRecording = useCallback(() => {
    return recorderRef.current?.state === 'recording'
  }, [])

  const startRecording = useCallback((stream: MediaStream) => {
    // If already recording, do nothing
    if (recorderRef.current?.state === 'recording') return

    chunksRef.current = []
    startTimeRef.current = Date.now()

    // Pick the best supported mime type
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ].find(t => MediaRecorder.isTypeSupported(t)) ?? ''

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      recorderRef.current = recorder
      recorder.start(250) // collect chunks every 250ms
    } catch (err) {
      console.warn('[AudioRecorder] Failed to start MediaRecorder:', err)
    }
  }, [])

  const stopRecording = useCallback((): Promise<{ blob: Blob; duration: number } | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(null)
        return
      }

      const duration = (Date.now() - startTimeRef.current) / 1000

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        chunksRef.current = []
        recorderRef.current = null
        resolve({ blob, duration })
      }

      try {
        recorder.stop()
      } catch (err) {
        console.warn('[AudioRecorder] Stop failed:', err)
        recorderRef.current = null
        resolve(null)
      }
    })
  }, [])

  return { startRecording, stopRecording, isRecording }
}
