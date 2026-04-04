/**
 * SubscriptionPlans — Reusable pricing component used on:
 *  1. Landing page (embedded in-page)
 *  2. Dedicated /subscriptions route (full-page)
 *
 * Renders 6 subscription tiers ($10–$60/mo) with:
 *  - Monthly/Annual toggle (20% discount on annual)
 *  - Feature list per tier
 *  - Recommended & best-value badges
 *  - Glassmorphic dark-mode card design
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import './subscription-plans.css'

export interface PlanTier {
  id: string
  name: string
  icon: string
  monthlyPrice: number
  stories: number | string
  images: number | string
  videos: number | string
  kids: number | string
  movieStudio: boolean | string
  priorityGen: boolean
  badge?: string
  badgeColor?: string
  recommended?: boolean
}

const PLANS: PlanTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    icon: '🌱',
    monthlyPrice: 10,
    stories: 5,
    images: 25,
    videos: 2,
    kids: 1,
    movieStudio: false,
    priorityGen: false,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    icon: '⭐',
    monthlyPrice: 15,
    stories: 12,
    images: 60,
    videos: 4,
    kids: 2,
    movieStudio: 'Basic',
    priorityGen: false,
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    icon: '📖',
    monthlyPrice: 25,
    stories: 25,
    images: 125,
    videos: 8,
    kids: 3,
    movieStudio: true,
    priorityGen: false,
    badge: 'Most Popular',
    badgeColor: '#7C3AED',
    recommended: true,
  },
  {
    id: 'creator',
    name: 'Creator',
    icon: '🎬',
    monthlyPrice: 35,
    stories: 40,
    images: 200,
    videos: 12,
    kids: 5,
    movieStudio: true,
    priorityGen: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    icon: '🚀',
    monthlyPrice: 45,
    stories: 60,
    images: 300,
    videos: 18,
    kids: 8,
    movieStudio: true,
    priorityGen: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    icon: '👑',
    monthlyPrice: 60,
    stories: 100,
    images: 500,
    videos: 25,
    kids: 'Unlimited',
    movieStudio: true,
    priorityGen: true,
    badge: 'Best Value',
    badgeColor: '#F59E0B',
  },
]

interface SubscriptionPlansProps {
  /** If true, renders as a full page with its own header. If false, renders inline (for embedding in landing page). */
  fullPage?: boolean
  /** Custom class name to add to the root */
  className?: string
}

export default function SubscriptionPlans({ fullPage = false, className = '' }: SubscriptionPlansProps) {
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(false)

  const getPrice = (monthly: number) => {
    if (annual) return Math.round(monthly * 0.8) // 20% discount
    return monthly
  }

  const getAnnualTotal = (monthly: number) => Math.round(monthly * 0.8 * 12)

  const handleSelect = (plan: PlanTier) => {
    // Navigate to signup with plan preselected
    navigate(`/signup?plan=${plan.id}&billing=${annual ? 'annual' : 'monthly'}`)
  }

  const renderFeature = (label: string, value: string | number | boolean) => {
    if (value === false) {
      return (
        <div className="sp-feature sp-feature-disabled" key={label}>
          <span className="sp-feature-x">✕</span>
          <span>{label}</span>
        </div>
      )
    }
    const displayValue = value === true ? '' : typeof value === 'string' ? ` (${value})` : `: ${value}`
    return (
      <div className="sp-feature" key={label}>
        <span className="sp-feature-check">✓</span>
        <span>{label}{displayValue}</span>
      </div>
    )
  }

  return (
    <div className={`sp-root ${fullPage ? 'sp-full-page' : 'sp-inline'} ${className}`} id="subscription-plans">
      {/* Ambient effects */}
      {fullPage && (
        <div className="sp-bg-effects" aria-hidden>
          <div className="sp-bg-orb sp-orb-1" />
          <div className="sp-bg-orb sp-orb-2" />
          <div className="sp-bg-orb sp-orb-3" />
        </div>
      )}

      {/* Header */}
      <div className="sp-header">
        {fullPage && (
          <button className="sp-back-btn" onClick={() => navigate(-1)} id="sp-back-btn">
            ← Back
          </button>
        )}
        <motion.div
          className="sp-header-badge"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          💎 Subscription Plans
        </motion.div>
        <motion.h2
          className="sp-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Choose Your <span className="sp-gradient-text">Adventure</span>
        </motion.h2>
        <motion.p
          className="sp-subtitle"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Plans for every family's reading journey. Start free for 7 days.
        </motion.p>

        {/* Billing toggle */}
        <motion.div
          className="sp-toggle-wrap"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <button
            className={`sp-toggle-btn ${!annual ? 'active' : ''}`}
            onClick={() => setAnnual(false)}
            id="sp-toggle-monthly"
          >
            Monthly
          </button>
          <button
            className={`sp-toggle-btn ${annual ? 'active' : ''}`}
            onClick={() => setAnnual(true)}
            id="sp-toggle-annual"
          >
            Annual
            <span className="sp-save-badge">Save 20%</span>
          </button>
        </motion.div>
      </div>

      {/* Plans Grid */}
      <div className="sp-grid">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            className={`sp-card ${plan.recommended ? 'sp-card-recommended' : ''}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i + 0.25 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
          >
            {/* Badge */}
            {plan.badge && (
              <div
                className="sp-card-badge"
                style={{ background: plan.badgeColor || '#7C3AED' }}
              >
                {plan.badge}
              </div>
            )}

            {/* Plan icon + name */}
            <div className="sp-card-top">
              <span className="sp-card-icon">{plan.icon}</span>
              <h3 className="sp-card-name">{plan.name}</h3>
            </div>

            {/* Price */}
            <div className="sp-card-price">
              <span className="sp-card-currency">$</span>
              <span className="sp-card-amount">{getPrice(plan.monthlyPrice)}</span>
              <span className="sp-card-period">/mo</span>
            </div>
            {annual && (
              <div className="sp-card-annual-note">
                ${getAnnualTotal(plan.monthlyPrice)}/year — saves ${plan.monthlyPrice * 12 - getAnnualTotal(plan.monthlyPrice)}/yr
              </div>
            )}

            {/* Divider */}
            <div className="sp-card-divider" />

            {/* Features */}
            <div className="sp-card-features">
              {renderFeature('AI Stories', `${plan.stories}/mo`)}
              {renderFeature('AI Images', `${plan.images}/mo`)}
              {renderFeature('AI Videos (10s)', `${plan.videos}/mo`)}
              {renderFeature('Kid Profiles', plan.kids)}
              {renderFeature('Spelling Arena', true)}
              {renderFeature('Reading Exams', true)}
              {renderFeature('Leaderboard', true)}
              {renderFeature('Movie Studio', plan.movieStudio)}
              {renderFeature('Priority Generation', plan.priorityGen)}
            </div>

            {/* CTA */}
            <motion.button
              className={`sp-card-cta ${plan.recommended ? 'sp-cta-gold' : ''}`}
              onClick={() => handleSelect(plan)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              id={`sp-cta-${plan.id}`}
            >
              {plan.recommended ? '⭐ Get Started' : 'Get Started'}
            </motion.button>
          </motion.div>
        ))}
      </div>

      {/* Trial banner */}
      <motion.div
        className="sp-trial-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <span className="sp-trial-icon">🎉</span>
        <div className="sp-trial-text">
          <strong>7-day free trial</strong> on all plans — no credit card required
        </div>
      </motion.div>

      {/* FAQ quick info */}
      <div className="sp-faq-strip">
        {[
          { icon: '🔒', label: 'Cancel anytime' },
          { icon: '👨‍👩‍👧‍👦', label: 'Family safe' },
          { icon: '🌍', label: '10 languages' },
          { icon: '📱', label: 'All devices' },
        ].map(f => (
          <div key={f.label} className="sp-faq-item">
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export { PLANS }
