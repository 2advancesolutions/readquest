/**
 * Subscription Plans — ReadQuest
 * - Live usage pulled from v_parent_usage (Supabase)
 * - Donut chart: stories used vs plan limit
 * - When full → "Buy Tokens" prompt ($5 = 6 more stories)
 * - Unlimited exams / spelling / games on every plan
 */
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Linking, Alert, ActivityIndicator, Modal,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { subscriptionApi, type ParentUsage, type SubscriptionPlan } from '../../src/lib/api'

// ── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({
  used, limit, color, size = 88,
}: { used: number; limit: number; color: string; size?: number }) {
  const isUnlimited = limit >= 9999
  const pct         = isUnlimited ? 0.15 : Math.min(1, used / Math.max(1, limit))
  const isFull      = !isUnlimited && used >= limit

  const radius     = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDash = circumference * (1 - pct)

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#1a1a35" strokeWidth={10} fill="none"
        />
        {/* Fill */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={isFull ? '#ef4444' : color}
          strokeWidth={10} fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDash}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Center text */}
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {isUnlimited ? (
          <Text style={{ color, fontSize: 18, fontWeight: '900' }}>∞</Text>
        ) : (
          <>
            <Text style={{ color: isFull ? '#ef4444' : '#fff', fontSize: 15, fontWeight: '900', lineHeight: 17 }}>
              {used}
            </Text>
            <Text style={{ color: '#4a4a6a', fontSize: 9, lineHeight: 11 }}>/ {limit}</Text>
          </>
        )}
      </View>
    </View>
  )
}

// ── Usage card (shows on top of screen) ─────────────────────────────────────
function UsageCard({ usage, onBuyTokens }: { usage: ParentUsage; onBuyTokens: () => void }) {
  const planColor     = PLAN_COLOR[usage.plan_slug] ?? '#702AE1'
  const isUnlimited   = usage.stories_limit >= 9999
  const isFull        = !isUnlimited && usage.stories_used_this_period >= usage.stories_limit
  const renewDate     = new Date(usage.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <View style={{
      backgroundColor: '#12112a', borderRadius: 20, padding: 18, marginBottom: 20,
      borderWidth: 1, borderColor: isFull ? '#ef444440' : planColor + '44',
      shadowColor: planColor, shadowOpacity: 0.3, shadowRadius: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', flex: 1 }}>
          {PLAN_EMOJI[usage.plan_slug] ?? '✨'} {usage.plan_name} Plan
        </Text>
        <View style={{ backgroundColor: planColor + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: planColor + '40' }}>
          <Text style={{ color: planColor, fontSize: 12, fontWeight: '800' }}>
            ${usage.price_cents / 100}/mo
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        {/* Stories donut */}
        <View style={{ alignItems: 'center' }}>
          <DonutChart used={usage.stories_used_this_period} limit={usage.stories_limit} color={planColor} />
          <Text style={{ color: '#6b5d80', fontSize: 10, marginTop: 5 }}>Stories</Text>
        </View>

        {/* Stats */}
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#8a7aaa', fontSize: 12 }}>Used this month</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
              {isUnlimited ? '∞' : `${usage.stories_used_this_period} / ${usage.stories_limit}`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#8a7aaa', fontSize: 12 }}>Remaining</Text>
            <Text style={{ color: isUnlimited ? '#4ade80' : isFull ? '#ef4444' : '#22c55e', fontWeight: '800', fontSize: 12 }}>
              {isUnlimited ? 'Unlimited' : isFull ? 'None left' : `${usage.stories_remaining} left`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#8a7aaa', fontSize: 12 }}>Resets</Text>
            <Text style={{ color: '#6b5d80', fontSize: 12 }}>{renewDate}</Text>
          </View>
          {usage.token_balance > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#8a7aaa', fontSize: 12 }}>Token balance</Text>
              <Text style={{ color: '#f59e0b', fontWeight: '800', fontSize: 12 }}>+{usage.token_balance} extra stories</Text>
            </View>
          )}
        </View>
      </View>

      {/* Full alert */}
      {isFull && (
        <View style={{ marginTop: 14, backgroundColor: '#ef444415', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ef444430' }}>
          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
            🔒 Story limit reached for this month
          </Text>
          <Text style={{ color: '#8a7aaa', fontSize: 11, lineHeight: 16 }}>
            Add tokens to create more stories now, or wait until {renewDate} when your plan resets.
          </Text>
          <TouchableOpacity
            onPress={onBuyTokens}
            style={{ marginTop: 10, backgroundColor: '#f59e0b', borderRadius: 10, padding: 11, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>⚡ Buy Tokens — $5 = 6 more stories</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Token purchase modal ─────────────────────────────────────────────────────
function BuyTokensModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const packs = [
    { id: 'pack_5',  label: 'Boost Pack',  price: 5,  stories: 6,  emoji: '⚡' },
    { id: 'pack_10', label: 'Power Pack',  price: 10, stories: 12, emoji: '🔥' },
    { id: 'pack_20', label: 'Mega Pack',   price: 20, stories: 25, emoji: '🚀' },
  ]

  const handleBuy = (pack: typeof packs[0]) => {
    Alert.alert(
      `Buy ${pack.label}`,
      `Add ${pack.stories} stories for $${pack.price}. You'll be taken to secure payment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue →',
          onPress: () => {
            Linking.openURL(`https://buy.stripe.com/readquest_tokens_${pack.id}`).catch(() =>
              Alert.alert('Coming Soon', 'Token purchase will be live soon. Email support@readquest.app.')
            )
            onClose()
          },
        },
      ]
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#0d0d1f', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 4 }}>⚡ Buy Extra Stories</Text>
          <Text style={{ color: '#6b5d80', fontSize: 13, marginBottom: 20 }}>
            Tokens never expire. $5 = 6 additional stories you can create anytime.
          </Text>
          {packs.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => handleBuy(p)}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#12112a',
                borderRadius: 16, padding: 16, marginBottom: 10,
                borderWidth: 1, borderColor: '#2a2a4a',
              }}
            >
              <Text style={{ fontSize: 28, marginRight: 14 }}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{p.label}</Text>
                <Text style={{ color: '#6b5d80', fontSize: 12, marginTop: 2 }}>{p.stories} extra stories</Text>
              </View>
              <View style={{ backgroundColor: '#702AE1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>${p.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={{ marginTop: 8, alignItems: 'center', padding: 12 }}>
            <Text style={{ color: '#6b5d80', fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Plan card ────────────────────────────────────────────────────────────────
const PLAN_COLOR: Record<string, string> = {
  spark: '#60a5fa', grow: '#a78bfa', read: '#702AE1', excel: '#f59e0b', unlimited: '#4ade80',
}
const PLAN_EMOJI: Record<string, string> = {
  spark: '⚡', grow: '🌿', read: '📖', excel: '🎓', unlimited: '🚀',
}

function PlanCard({ plan, currentSlug, onSelect }: {
  plan: SubscriptionPlan; currentSlug?: string; onSelect: (plan: SubscriptionPlan) => void
}) {
  const color      = PLAN_COLOR[plan.slug] ?? '#702AE1'
  const emoji      = PLAN_EMOJI[plan.slug] ?? '✨'
  const isCurrent  = plan.slug === currentSlug
  const isUnlimited = plan.tokens_included >= 9999

  const features: string[] = Array.isArray(plan.features) ? plan.features as string[] : []

  return (
    <View
      style={{
        borderRadius: 22, borderWidth: isCurrent ? 2 : 1,
        borderColor: isCurrent ? color : '#2a2a4a',
        backgroundColor: '#12112a',
        padding: 20, marginBottom: 14,
        shadowColor: color, shadowOpacity: isCurrent ? 0.4 : 0, shadowRadius: 14,
      }}
    >
      {plan.is_popular && (
        <View style={{ position: 'absolute', top: -12, right: 18, backgroundColor: color, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>Most Popular</Text>
        </View>
      )}
      {isCurrent && (
        <View style={{ position: 'absolute', top: -12, left: 18, backgroundColor: '#22c55e', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓ Current Plan</Text>
        </View>
      )}

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: color + '40' }}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>{plan.name}</Text>
          <Text style={{ color: '#6b5d80', fontSize: 12 }}>
            {isUnlimited ? 'Unlimited everything' : `${plan.tokens_included} stories / month`}
          </Text>
        </View>
        <View>
          <Text style={{ color, fontSize: 24, fontWeight: '900' }}>${plan.price_cents / 100}</Text>
          <Text style={{ color: '#4a4a6a', fontSize: 11, textAlign: 'right' }}>/mo</Text>
        </View>
      </View>

      {/* Mini donut + usage summary */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, backgroundColor: color + '0d', borderRadius: 12, padding: 12 }}>
        <DonutChart used={1} limit={isUnlimited ? 9999 : plan.tokens_included} color={color} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={{ color, fontSize: 13, fontWeight: '800' }}>
            {isUnlimited ? '∞ Unlimited Stories' : `${plan.tokens_included} stories per month`}
          </Text>
          <Text style={{ color: '#6b5d80', fontSize: 11, marginTop: 2 }}>
            Any number of children can share this plan
          </Text>
        </View>
      </View>

      {/* Features */}
      <View style={{ gap: 6, marginBottom: 14 }}>
        {features.map((f, i) => {
          const isUnlimitedRow = f.toLowerCase().includes('unlimited')
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13 }}>{isUnlimitedRow ? '♾️' : '✓'}</Text>
              <Text style={{ color: isUnlimitedRow ? color : '#ccc4e0', fontSize: 12, flex: 1 }}>{f}</Text>
            </View>
          )
        })}
      </View>

      {/* Action — sole interactive element on this card */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          console.log('[PlanCard] onPress ->', plan.slug, plan.id)
          onSelect(plan)
        }}
        style={{
          borderRadius: 14, padding: 13, alignItems: 'center',
          backgroundColor: isCurrent ? '#22c55e' : color,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>
          {isCurrent ? '✓ Your Current Plan' : `Upgrade to ${plan.name}`}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets()
  const [usage,    setUsage]    = useState<ParentUsage | null>(null)
  const [plans,    setPlans]    = useState<SubscriptionPlan[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showBuy,  setShowBuy]  = useState(false)
  const [showUnsub, setShowUnsub] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, p] = await Promise.all([subscriptionApi.getUsage(), subscriptionApi.getPlans()])
      setUsage(u)
      setPlans(p)
    } catch {}
    finally { setLoading(false) }
  }, [])

  // Silent refresh — used after plan change so we don't flash a full loading screen
  const refreshUsage = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([subscriptionApi.getUsage(), subscriptionApi.getPlans()])
      setUsage(u)
      setPlans(p)
    } catch {}
  }, [])

  useEffect(() => { void load() }, [load])

  const [switching, setSwitching] = useState(false)

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    console.log('[handleSelectPlan] called ->', plan.slug, plan.id, 'current:', usage?.plan_slug)
    if (plan.slug === usage?.plan_slug) {
      console.log('[handleSelectPlan] already on this plan, returning')
      return
    }
    const isUpgrade = plan.price_cents > (usage?.price_cents ?? 0)
    const action    = isUpgrade ? 'Upgrade' : 'Downgrade'

    Alert.alert(
      `${action} to ${plan.name}?`,
      `${PLAN_EMOJI[plan.slug] ?? '✨'} ${plan.name} — $${plan.price_cents / 100}/month\n${plan.tokens_included >= 9999 ? 'Unlimited stories' : `${plan.tokens_included} stories/month`}\n\nYour plan changes immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Yes, ${action} →`,
          onPress: async () => {
            setSwitching(true)
            try {
              const result = await subscriptionApi.changePlan(plan.id)
              if (result.success) {
                // Silently reload usage so badge + card update instantly
                await refreshUsage()
                Alert.alert('✅ Plan Updated!', `You're now on the ${plan.name} plan. Enjoy ${plan.tokens_included >= 9999 ? 'unlimited' : plan.tokens_included} stories this month!`)
              } else {
                Alert.alert('Error', result.error ?? 'Could not switch plan. Try again.')
              }
            } catch {
              Alert.alert('Error', 'Could not switch plan. Check your connection.')
            } finally {
              setSwitching(false)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d1f', paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a35' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#8a7aaa', fontSize: 14 }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>✨ Plans & Usage</Text>
          <Text style={{ color: '#6b5d80', fontSize: 12 }}>Stories · Characters · Unlimited learning</Text>
        </View>
        <TouchableOpacity onPress={load}>
          <Text style={{ color: '#702AE1', fontSize: 13, fontWeight: '700' }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading || switching ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#702AE1" />
          <Text style={{ color: '#6b5d80', fontSize: 13, marginTop: 12 }}>
            {switching ? 'Switching your plan…' : 'Loading your plan…'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

          {/* Live usage card */}
          {usage && <UsageCard usage={usage} onBuyTokens={() => setShowBuy(true)} />}

          {/* Always included banner */}
          <View style={{ backgroundColor: '#702AE115', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#702AE130' }}>
            <Text style={{ color: '#B28CFF', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              ♾️ Unlimited on Every Plan
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                '🎮 Arcade games', '✏️ Spelling arena', '📝 Reading exams',
                '🎯 Quiz challenges', '🏆 Leaderboards', '⭐ XP & rewards',
              ].map(f => (
                <View key={f} style={{ backgroundColor: '#702AE120', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#702AE130' }}>
                  <Text style={{ color: '#B28CFF', fontSize: 11, fontWeight: '700' }}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Token info */}
          <TouchableOpacity
            onPress={() => setShowBuy(true)}
            style={{ backgroundColor: '#f59e0b15', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#f59e0b30', flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Text style={{ fontSize: 28 }}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#f59e0b', fontWeight: '800', fontSize: 14 }}>Need more stories?</Text>
              <Text style={{ color: '#6b5d80', fontSize: 12, marginTop: 2 }}>Buy tokens anytime — $5 = 6 extra stories, never expire</Text>
            </View>
            <Text style={{ color: '#f59e0b', fontSize: 18 }}>→</Text>
          </TouchableOpacity>

          {/* Plan cards */}
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 14 }}>
            📋 All Plans
          </Text>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentSlug={usage?.plan_slug}
              onSelect={handleSelectPlan}
            />
          ))}

          {/* Fine print */}
          <View style={{ backgroundColor: '#12112a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a4a', marginTop: 4 }}>
            <Text style={{ color: '#4a4a6a', fontSize: 11, lineHeight: 18 }}>
              📋 Plans renew monthly. Cancel anytime. Extra tokens are one-time purchases that never expire and stack with your monthly allowance. Story counts reset on the 1st of each month. Arcade, spelling, and exams are always unlimited regardless of plan.
            </Text>
          </View>

          {/* Unsubscribe */}
          <TouchableOpacity
            onPress={() => setShowUnsub(true)}
            style={{
              marginTop: 20, alignItems: 'center', justifyContent: 'center',
              paddingVertical: 14, borderRadius: 14,
              borderWidth: 1, borderColor: '#ef444430',
              backgroundColor: '#ef444408',
              flexDirection: 'row', gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>🚫</Text>
            <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>Unsubscribe from ReadQuest</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <BuyTokensModal visible={showBuy} onClose={() => setShowBuy(false)} />

      {/* Unsubscribe Confirmation */}
      <Modal visible={showUnsub} transparent animationType="fade" onRequestClose={() => setShowUnsub(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#0d0d1f', borderRadius: 22, padding: 24, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#ef444430' }}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 10 }}>🚫</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>Cancel Subscription?</Text>
            <Text style={{ color: '#8a7aaa', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              You'll lose access to story creation at the end of your billing period. Your children's reading progress, XP, and badges are saved forever.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowUnsub(false)
                Alert.alert('Contact Support', 'To cancel your subscription please email\nsupport@readquest.app or manage billing via Stripe.')
              }}
              style={{ backgroundColor: '#ef4444', borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Yes, Cancel Subscription</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowUnsub(false)}
              style={{ padding: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#6b5d80', fontWeight: '700' }}>Keep My Plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}
