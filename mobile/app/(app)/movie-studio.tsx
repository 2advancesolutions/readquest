/**
 * Movie Studio — React Native (Phase 6)
 * Route: /movie-studio (hidden tab)
 *
 * Conversions:
 * - framer-motion → Animated
 * - <video ref> → expo-av Video component
 * - navigator.clipboard → expo-clipboard
 * - document.createElement('a') download → expo-media-library
 * - ProgressBar: Animated.View width
 * - AnimatePresence modal: Modal
 * - All CSS classes → inline RN styles
 */
import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Animated, ActivityIndicator, Modal, Alert, Share, Linking,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { VideoView, useVideoPlayer } from 'expo-video'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { supabase } from '../../src/lib/supabase'
import { storage } from '../../src/lib/storage'

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api`

// ── Types ─────────────────────────────────────────────────────────────────────
interface Frame {
  prompt: string; imageUrl: string|null; generating: boolean; done: boolean
}
type VideoState = 'idle' | 'creating' | 'done' | 'error'

const EMPTY_FRAME = (): Frame => ({ prompt:'', imageUrl:null, generating:false, done:false })

const FRAME_PLACEHOLDERS = [
  'A brave young hero discovers a glowing map in a magical forest…',
  'The hero follows fireflies over a sparkling bridge into an enchanted city…',
  'A friendly dragon lands and offers to help with the journey…',
  'Together they find the hidden treasure chest under a rainbow waterfall…',
  'Everyone celebrates with a feast as shooting stars fill the night sky…',
]

const CREATION_STEPS = [
  'Bringing your frames to life…',
  'Animating your scenes…',
  'Stitching your movie together…',
  'Uploading to the cloud…',
  '🎉 Your movie is ready!',
]

function FrameCard({ frame, idx, onPromptChange, onGenerate, disabled }: {
  frame: Frame; idx: number; onPromptChange:(v:string)=>void
  onGenerate:()=>void; disabled:boolean
}) {
  return (
    <View style={{ backgroundColor:'#1a1a35', borderRadius:16, padding:14, marginBottom:12,
      borderWidth:1, borderColor: frame.done ? '#22c55e33' : '#2a2a4a' }}>
      {/* Frame number header */}
      <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10, gap:8 }}>
        <View style={{ width:28, height:28, borderRadius:14, backgroundColor:'#702AE1',
          alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color:'#fff', fontWeight:'900', fontSize:13 }}>{idx+1}</Text>
        </View>
        <Text style={{ color:'#fff', fontWeight:'700', fontSize:13 }}>Frame {idx+1}</Text>
        {frame.done && <Text style={{ color:'#22c55e', fontSize:11, fontWeight:'700', marginLeft:'auto' }}>✓ Ready</Text>}
        {frame.generating && <ActivityIndicator size="small" color="#B28CFF" style={{ marginLeft:'auto' }} />}
      </View>

      {/* Image preview */}
      <View style={{ width:'100%', height:140, borderRadius:12, backgroundColor:'#0d0d1f',
        alignItems:'center', justifyContent:'center', overflow:'hidden', marginBottom:10,
        borderWidth:1, borderColor:'#702AE122' }}>
        {frame.imageUrl ? (
          <Image source={{ uri:frame.imageUrl }} style={{ width:'100%', height:140 }} contentFit="cover" />
        ) : frame.generating ? (
          <View style={{ alignItems:'center', gap:8 }}>
            <ActivityIndicator size="large" color="#702AE1" />
            <Text style={{ color:'#B28CFF', fontSize:12 }}>Generating scene…</Text>
          </View>
        ) : (
          <View style={{ alignItems:'center', gap:4 }}>
            <Text style={{ fontSize:40 }}>🎬</Text>
            <Text style={{ color:'#4a4a6a', fontSize:12 }}>Scene {idx+1}</Text>
          </View>
        )}
      </View>

      {/* Prompt input */}
      <TextInput
        value={frame.prompt}
        onChangeText={onPromptChange}
        placeholder={FRAME_PLACEHOLDERS[idx]}
        placeholderTextColor="#3a3a5a"
        multiline numberOfLines={3}
        editable={!disabled}
        style={{ backgroundColor:'#0d0d1f', borderRadius:10, padding:10, color:'#fff',
          fontSize:13, lineHeight:20, marginBottom:10, textAlignVertical:'top',
          borderWidth:1, borderColor:'#702AE133' }}
      />

      {/* Generate button */}
      <TouchableOpacity onPress={onGenerate}
        disabled={!frame.prompt.trim() || frame.generating || disabled}
        style={{ backgroundColor: frame.done ? '#22c55e20' : '#702AE1',
          borderRadius:12, padding:12, alignItems:'center',
          borderWidth:1, borderColor: frame.done ? '#22c55e44' : 'transparent',
          opacity:(!frame.prompt.trim()||frame.generating||disabled)?0.5:1 }}>
        <Text style={{ color: frame.done?'#22c55e':'#fff', fontWeight:'800', fontSize:13 }}>
          {frame.generating ? '✨ Generating…' : frame.done ? '🔄 Regenerate Scene' : '✨ Generate Scene'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
export default function MovieStudioScreen() {
  const insets    = useSafeAreaInsets()
  const videoRef  = useRef<VideoView>(null)

  const [frames,          setFrames]          = useState<Frame[]>(Array.from({length:5}, EMPTY_FRAME))
  const [videoState,      setVideoState]      = useState<VideoState>('idle')
  const [videoUrl,        setVideoUrl]        = useState<string|null>(null)
  const [creationStep,    setCreationStep]    = useState(0)
  const [creationProg,    setCreationProg]    = useState(0)
  const [tokensRemaining, setTokensRemaining] = useState(10)
  const [tokensTotal,     setTokensTotal]     = useState(10)
  const [showTokenGate,   setShowTokenGate]   = useState(false)
  const [studentId,       setStudentId]       = useState('guest')
  const [purchasing,      setPurchasing]      = useState(false)
  const [copyDone,        setCopyDone]        = useState(false)

  // Always call hook at top level — player is fed empty string until a real URL arrives
  const videoPlayer = useVideoPlayer(videoUrl ?? '', player => {
    if (videoUrl) player.play()
  })

  const progressAnim = useRef(new Animated.Value(0)).current
  const progressRef  = useRef<ReturnType<typeof setInterval>|null>(null)
  const stepRef      = useRef<ReturnType<typeof setInterval>|null>(null)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data:{ session } } = await supabase.auth.getSession()
      const sid = await storage.getString('readquest_student_id') || session?.user?.id || 'guest'
      setStudentId(sid); fetchTokens(sid)
    }
    init()
  }, [])

  const fetchTokens = async (sid: string) => {
    try {
      const res = await fetch(`${API_BASE}/movie-studio/tokens`, { headers:{'X-Student-ID':sid} })
      if (res.ok) {
        const d = await res.json()
        setTokensRemaining(d.tokens_remaining ?? 10); setTokensTotal(d.tokens_total ?? 10)
      }
    } catch {}
  }

  // ── Frame operations ──────────────────────────────────────────────────────
  const updatePrompt = (idx: number, value: string) => {
    setFrames(prev => prev.map((f,i) => i===idx ? {...f, prompt:value} : f))
  }

  const generateFrame = async (idx: number) => {
    const frame = frames[idx]
    if (!frame.prompt.trim() || frame.generating) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setFrames(prev => prev.map((f,i) => i===idx ? {...f, generating:true, done:false} : f))
    try {
      const res = await fetch(`${API_BASE}/movie-studio/generate-frame`, {
        method:'POST', headers:{'Content-Type':'application/json','X-Student-ID':studentId},
        body: JSON.stringify({ prompt:frame.prompt, frame_index:idx }),
      })
      const data = await res.json()
      if (data.image_url) {
        setFrames(prev => prev.map((f,i) => i===idx ? {...f, imageUrl:data.image_url, generating:false, done:true} : f))
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        setFrames(prev => prev.map((f,i) => i===idx ? {...f, generating:false} : f))
        Alert.alert('Scene Failed', 'Image generation failed. Please try again.')
      }
    } catch {
      setFrames(prev => prev.map((f,i) => i===idx ? {...f, generating:false} : f))
      Alert.alert('Connection Error', 'Check your internet connection and try again.')
    }
  }

  // ── Create video ──────────────────────────────────────────────────────────
  const createVideo = async () => {
    if (tokensRemaining <= 0) { setShowTokenGate(true); return }
    const imageUrls = frames.map(f => f.imageUrl || '')
    if (imageUrls.filter(u=>u).length < 5) {
      Alert.alert('Not Ready', 'Please generate all 5 frame images before creating your movie!')
      return
    }

    setVideoState('creating')
    setCreationProg(0); setCreationStep(0); setVideoUrl(null)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    Animated.timing(progressAnim, { toValue: 0, duration: 0, useNativeDriver: false }).start()
    progressRef.current = setInterval(() => {
      setCreationProg(p => { if (p >= 90) { clearInterval(progressRef.current!); return 90 }; return p + Math.random()*3 })
    }, 800)
    stepRef.current = setInterval(() => setCreationStep(s => Math.min(s+1, CREATION_STEPS.length-1)), 8000)

    try {
      const res = await fetch(`${API_BASE}/movie-studio/create-video`, {
        method:'POST', headers:{'Content-Type':'application/json','X-Student-ID':studentId},
        body: JSON.stringify({ image_urls:imageUrls, student_id:studentId }),
      })
      const data = await res.json()
      clearInterval(progressRef.current!); clearInterval(stepRef.current!)

      if (data.success && data.video_url) {
        setCreationProg(100); setCreationStep(CREATION_STEPS.length-1)
        setVideoUrl(data.video_url)
        setTokensRemaining(data.tokens_remaining ?? tokensRemaining - 1)
        setVideoState('done')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        setVideoState('error')
        Alert.alert('Error', data.error || 'Video creation failed. Please try again.')
      }
    } catch {
      clearInterval(progressRef.current!); clearInterval(stepRef.current!)
      setVideoState('error')
      Alert.alert('Connection Error', 'Check your connection and try again.')
    }
  }

  // ── Token purchase ────────────────────────────────────────────────────────
  const purchaseTokens = async () => {
    setPurchasing(true)
    try {
      const res = await fetch(`${API_BASE}/movie-studio/purchase-tokens`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ student_id:studentId, package:'10_pack' }),
      })
      const data = await res.json()
      if (data.success) {
        setTokensRemaining(data.tokens_remaining); setTokensTotal(t=>t+10); setShowTokenGate(false)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } catch { Alert.alert('Error', 'Purchase failed. Please try again.') }
    finally { setPurchasing(false) }
  }

  // ── Share / copy ──────────────────────────────────────────────────────────
  const shareVideo = async () => {
    if (!videoUrl) return
    try { await Share.share({ url:videoUrl, message:`Check out my movie from ReadQuest! ${videoUrl}` }) }
    catch {}
  }

  const copyLink = async () => {
    if (!videoUrl) return
    await Clipboard.setStringAsync(videoUrl)
    setCopyDone(true); setTimeout(() => setCopyDone(false), 2500)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const allFramesDone = frames.every(f => f.done && f.imageUrl)
  const anyGenerating = frames.some(f => f.generating)
  const framesReady   = frames.filter(f => f.done && f.imageUrl).length
  const tokenLow      = tokensRemaining <= 2

  return (
    <View style={{ flex:1, backgroundColor:'#0d0d1f', paddingTop:insets.top }}>

      {/* Header */}
      <View style={{ paddingHorizontal:16, paddingVertical:10, flexDirection:'row', alignItems:'center',
        borderBottomWidth:1, borderBottomColor:'#702AE122' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight:10 }}>
          <Text style={{ color:'#8a7aaa', fontSize:13 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={{ color:'#fff', fontWeight:'900', fontSize:15 }}>🎬 Movie Studio</Text>
          <Text style={{ color:'#6b5d80', fontSize:11 }}>for Kids · Create Your Story</Text>
        </View>
        {/* Token badge */}
        <View style={{ backgroundColor: tokenLow?'#ef444420':'#1a1a35', borderRadius:12,
          paddingHorizontal:10, paddingVertical:6, borderWidth:1,
          borderColor: tokenLow?'#ef444444':'#2a2a4a', flexDirection:'row', alignItems:'center', gap:4 }}>
          <Text style={{ fontSize:14 }}>🎟️</Text>
          <Text style={{ color: tokenLow?'#ef4444':'#B28CFF', fontWeight:'900', fontSize:14 }}>{tokensRemaining}</Text>
          <Text style={{ color:'#4a4a6a', fontSize:11 }}>/{tokensTotal}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding:16, paddingBottom:100 }} showsVerticalScrollIndicator={false}>

        {/* Storyboard section */}
        <Text style={{ color:'#fff', fontWeight:'700', fontSize:15, marginBottom:4 }}>🎞️ Your Storyboard — 5 Frames</Text>
        <Text style={{ color:'#6b5d80', fontSize:12, marginBottom:16 }}>
          {framesReady === 5 ? '🎉 All 5 frames ready! Create your movie below.' : `${framesReady}/5 frames ready — type a scene & tap Generate`}
        </Text>

        {frames.map((frame, idx) => (
          <FrameCard key={idx} frame={frame} idx={idx}
            onPromptChange={v => updatePrompt(idx, v)}
            onGenerate={() => generateFrame(idx)}
            disabled={anyGenerating && !frame.generating} />
        ))}

        {/* Video preview */}
        <Text style={{ color:'#fff', fontWeight:'700', fontSize:15, marginBottom:12, marginTop:8 }}>🎥 Your Movie</Text>
        <View style={{ backgroundColor:'#1a1a35', borderRadius:16, overflow:'hidden',
          minHeight:200, alignItems:'center', justifyContent:'center',
          borderWidth:1, borderColor:'#2a2a4a', marginBottom:16 }}>
          {videoState === 'idle' && (
            <View style={{ alignItems:'center', padding:32 }}>
              <Text style={{ fontSize:56 }}>🎬</Text>
              <Text style={{ color:'#fff', fontWeight:'700', fontSize:16, marginTop:12 }}>Your movie will play here</Text>
              <Text style={{ color:'#6b5d80', fontSize:13, marginTop:6, textAlign:'center' }}>
                Generate all 5 scenes, then tap Create Movie!
              </Text>
            </View>
          )}

          {videoState === 'creating' && (
            <View style={{ padding:24, alignItems:'center', width:'100%' }}>
              <Text style={{ fontSize:48, marginBottom:12 }}>🎞️</Text>
              <Text style={{ color:'#fff', fontWeight:'800', fontSize:16, marginBottom:4 }}>Creating Your Movie…</Text>
              <Text style={{ color:'#8a7aaa', fontSize:12, marginBottom:20, textAlign:'center' }}>
                This takes about 2–3 minutes. Don't close the app!
              </Text>
              {/* Progress bar */}
              <View style={{ width:'100%', height:8, backgroundColor:'#2a2a4a', borderRadius:4, marginBottom:16 }}>
                <View style={{ height:8, borderRadius:4, backgroundColor:'#702AE1', width:`${Math.min(creationProg,100)}%` }} />
              </View>
              {/* Steps */}
              {CREATION_STEPS.map((step, i) => (
                <View key={i} style={{ flexDirection:'row', alignItems:'center', marginBottom:6, width:'100%' }}>
                  <Text style={{ width:20, color: i<creationStep?'#22c55e':i===creationStep?'#702AE1':'#4a4a6a' }}>
                    {i<creationStep?'✓ ':i===creationStep?'▶ ':'○ '}
                  </Text>
                  <Text style={{ color: i===creationStep?'#fff':i<creationStep?'#22c55e':'#4a4a6a', fontSize:12, flex:1 }}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {videoState === 'error' && (
            <View style={{ alignItems:'center', padding:32 }}>
              <Text style={{ fontSize:56 }}>😔</Text>
              <Text style={{ color:'#ef4444', fontWeight:'700', fontSize:15, marginTop:12 }}>Something went wrong</Text>
              <Text style={{ color:'#8a7aaa', fontSize:13, marginTop:6, textAlign:'center' }}>
                Your images are still saved — try creating the movie again.
              </Text>
            </View>
          )}

          {videoState === 'done' && videoUrl && (
            <VideoView ref={videoRef}
              style={{ width:'100%', height:240 }}
              player={videoPlayer}
              allowsFullscreen allowsPictureInPicture />
          )}
        </View>

        {/* Action buttons */}
        <View style={{ gap:10, marginBottom:20 }}>
          <TouchableOpacity
            onPress={createVideo}
            disabled={videoState==='creating' || anyGenerating || (!allFramesDone && videoState!=='error')}
            style={{ backgroundColor:'#22c55e', borderRadius:14, padding:16, alignItems:'center',
              opacity:(videoState==='creating'||anyGenerating||(!allFramesDone&&videoState!=='error'))?0.5:1 }}>
            <Text style={{ color:'#fff', fontWeight:'900', fontSize:16 }}>
              {videoState==='creating'?'🎞️ Creating Movie…':videoState==='done'?'🎬 Create New Movie':'🎬 Create Movie'}
            </Text>
          </TouchableOpacity>

          {videoUrl && (
            <View style={{ flexDirection:'row', gap:10 }}>
              <TouchableOpacity onPress={shareVideo} style={{ flex:1, backgroundColor:'#1a1a35',
                borderRadius:12, padding:13, alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
                <Text style={{ color:'#B28CFF', fontWeight:'700' }}>📤 Share</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={copyLink} style={{ flex:1, backgroundColor:'#1a1a35',
                borderRadius:12, padding:13, alignItems:'center', borderWidth:1, borderColor:'#2a2a4a' }}>
                <Text style={{ color:'#B28CFF', fontWeight:'700' }}>{copyDone?'✅ Copied!':'🔗 Copy Link'}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ backgroundColor:'#4a2a8830', borderRadius:12, padding:12,
            borderWidth:1, borderColor:'#702AE122', flexDirection:'row', alignItems:'center', gap:8 }}>
            <Text style={{ fontSize:20 }}>📺</Text>
            <View>
              <Text style={{ color:'#B28CFF', fontWeight:'700', fontSize:13 }}>Export to YouTube</Text>
              <Text style={{ color:'#4a4a6a', fontSize:11 }}>Coming soon!</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Token Gate Modal */}
      <Modal visible={showTokenGate} transparent animationType="fade" onRequestClose={()=>setShowTokenGate(false)}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.85)', alignItems:'center', justifyContent:'center', padding:24 }}>
          <View style={{ backgroundColor:'#1a1a35', borderRadius:20, padding:28, width:'100%',
            alignItems:'center', borderWidth:1, borderColor:'#702AE122' }}>
            <Text style={{ fontSize:56, marginBottom:12 }}>🎟️</Text>
            <Text style={{ color:'#fff', fontWeight:'900', fontSize:20, textAlign:'center', marginBottom:8 }}>Out of Movie Tokens</Text>
            <Text style={{ color:'#8a7aaa', fontSize:14, textAlign:'center', marginBottom:20 }}>
              You've used all your free movie creations.{'\n'}Get 10 more to keep the creativity going!
            </Text>
            <Text style={{ color:'#B28CFF', fontWeight:'900', fontSize:32, marginBottom:4 }}>$15</Text>
            <Text style={{ color:'#6b5d80', fontSize:13, marginBottom:20 }}>for 10 more movies · one-time</Text>
            <TouchableOpacity onPress={purchaseTokens} disabled={purchasing}
              style={{ backgroundColor:'#702AE1', borderRadius:14, padding:15, width:'100%',
                alignItems:'center', marginBottom:10, opacity:purchasing?0.6:1 }}>
              <Text style={{ color:'#fff', fontWeight:'900', fontSize:15 }}>
                {purchasing ? '⏳ Processing…' : '🎟️ Get 10 More Movies — $15'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setShowTokenGate(false)}>
              <Text style={{ color:'#6b5d80', fontSize:14 }}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
