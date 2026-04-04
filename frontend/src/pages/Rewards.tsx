import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { rewardsApi } from '../services/api'
import { supabase } from '../lib/supabase'
import { emitXpUpdate } from '../components/XpBadge'
import type { StudentRewards, LeaderboardEntry } from '../types'
import { LEVEL_NAMES } from '../types'
import CalendarPicker, { type CalendarMode, type DateRange } from '../components/CalendarPicker'
import '../styles/rewards.css'
import '../styles/app-shell.css'

// ── Fallback badge definitions (shown greyed-out when DB has none yet) ────────
const FALLBACK_BADGES = [
  { id: '1', slug: 'first_book',   name: 'First Book!',    icon: '📖', description: 'Read your first book',              earned: false },
  { id: '2', slug: 'streak_3',     name: '3-Day Streak',   icon: '🔥', description: 'Read 3 days in a row',              earned: false },
  { id: '3', slug: 'quiz_master',  name: 'Quiz Master',    icon: '🧠', description: 'Get 5 quiz questions right',        earned: false },
  { id: '4', slug: 'speed_reader', name: 'Speed Reader',   icon: '⚡', description: 'Read a book in under 10 min',       earned: false },
  { id: '5', slug: 'streak_7',     name: '7-Day Streak',   icon: '🏆', description: 'Read 7 days in a row',             earned: false },
  { id: '6', slug: 'explorer',     name: 'Genre Explorer', icon: '🗺️', description: 'Read books in 3 different themes', earned: false },
  { id: '7', slug: 'bookworm',     name: 'Bookworm',       icon: '🐛', description: 'Complete 5 books',                 earned: false },
  { id: '8', slug: 'word_wizard',  name: 'Word Wizard',    icon: '🔮', description: 'Reach level 3',                    earned: false },
]

// Empty skeleton — avoids showing fake numbers before the API resolves
const EMPTY_REWARDS: StudentRewards = {
  total_xp: 0,
  level: 1,
  level_name: 'Bookworm 🐛',
  xp_to_next_level: 200,
  xp_progress_pct: 0,
  current_streak: 0,
  badges: [],
  xp_history: [],
  weekly_activity: [],
  stories_read: 0,
}

// ── Sidebar Nav ───────────────────────────────────────────────────────────────
function AppSidebar({ active }: { active: string }) {
  const navigate = useNavigate()
  const handleLogout = useCallback(() => {
    localStorage.clear()
    supabase.auth.signOut()
    navigate('/')
  }, [navigate])

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo" onClick={() => navigate('/dashboard')}>ReadQuest ✨</div>
      <nav className="app-sidebar-nav">
        <button className={`app-sidebar-link ${active === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span>Dashboard</span>
        </button>
        <button className={`app-sidebar-link ${active === 'rewards' ? 'active' : ''}`} onClick={() => navigate('/rewards')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span>Progress & Metrics</span>
        </button>
        <button className={`app-sidebar-link ${active === 'shelf' ? 'active' : ''}`} onClick={() => navigate('/library')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span>Reading Shelf</span>
        </button>
        <button className={`app-sidebar-link ${active === 'generate' ? 'active' : ''}`} onClick={() => navigate('/generate')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>Generate Story</span>
        </button>
        <button className={`app-sidebar-link ${active === 'kids' ? 'active' : ''}`} onClick={() => navigate('/add-kid')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>Manage Children</span>
        </button>
        <button className={`app-sidebar-link ${active === 'profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span>My Profile</span>
        </button>
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-sidebar-logout" onClick={handleLogout}><span>Log out</span></button>
      </div>
    </aside>
  )
}

interface Child { id: string; name: string; grade_level: number }

// ── XP Redeem Shop ────────────────────────────────────────────────────────────

interface RedeemItem {
  id: string
  name: string
  img: string         // real product image URL
  xpCost: number
  grades: number[]   // which grade levels can access this
  tag: 'both' | 'boy' | 'girl'
  desc: string
  color: string      // accent glow color
}

const REDEEM_CATALOG: RedeemItem[] = [
  // ── Kindergarten / Grade 1 (3,000–5,000 XP ≈ 27–45 passed exams to earn) ─
  { id: 'sticker_pack',   name: 'Jumbo Sticker Pack',        img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/81dlmdkRXOL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 3000,  grades: [0,1], tag: 'both', desc: '500+ colorful stickers for notebooks, folders & crafts.', color: '#f97316' },
  { id: 'crayons',        name: 'Crayola 64-Pack',           img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/81jR3NUFdmL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 3500,  grades: [0,1], tag: 'both', desc: 'Classic 64-crayon set with built-in sharpener.', color: '#ec4899' },
  { id: 'dino_toy',       name: 'Dinosaur Figures Set',      img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/81Hh9kZwKvL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 4000,  grades: [0,1], tag: 'boy',  desc: '12 realistic dinosaur figures to collect & display.', color: '#10b981' },
  { id: 'princess_kit',   name: 'Princess Dress-Up Set',     img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71vqRFqsM-L._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 4000,  grades: [0,1], tag: 'girl', desc: 'Crown, wand & cape dress-up kit for little royals.', color: '#f59e0b' },
  { id: 'play_doh',       name: 'Play-Doh 10-Color Pack',    img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/81QqiJH5uCL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 5000,  grades: [0,1], tag: 'both', desc: '10 classic colors of Play-Doh for unlimited creativity.', color: '#7c3aed' },

  // ── Grade 2–3 (6,000–12,000 XP ≈ 55–110 passed exams) ──────────────────
  { id: 'lego_mini',      name: 'LEGO Creator Set',          img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71bv0R9ETQL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 7000,  grades: [2,3], tag: 'both', desc: 'Fun 3-in-1 LEGO Creator set — build 3 different models.', color: '#f97316' },
  { id: 'hot_wheels',     name: 'Hot Wheels 20-Car Pack',    img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/81w2FfVBPML._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 6000,  grades: [2,3], tag: 'boy',  desc: '20 die-cast Hot Wheels cars — collect them all!', color: '#ef4444' },
  { id: 'lol_doll',       name: 'L.O.L. Surprise! Doll',    img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71TP0-I3RQL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 7500,  grades: [2,3], tag: 'girl', desc: 'Unbox 7 surprises in the iconic LOL Surprise ball!', color: '#ec4899' },
  { id: 'nerf_blaster',   name: 'Nerf Elite Blaster',        img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/61lqz8jbZ8L._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 9000,  grades: [2,3], tag: 'boy',  desc: 'Rapid-fire Nerf with 12 official Elite foam darts.', color: '#f59e0b' },
  { id: 'art_kit',        name: 'Deluxe Watercolor Kit',     img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71zKGsJJlUL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 8000,  grades: [2,3], tag: 'both', desc: '24-color watercolor set with brushes & paper pad.', color: '#8b5cf6' },
  { id: 'headband_set',   name: 'Glitter Hair Accessory Kit',img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71G2EAXP2-L._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 6000,  grades: [2,3], tag: 'girl', desc: '50-piece headbands, clips & scrunchies bundle.', color: '#f472b6' },

  // ── Grade 4–5 (12,000–22,000 XP ≈ 110–200 passed exams) ────────────────
  { id: 'minecraft_lego', name: 'Minecraft LEGO Set',        img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/81TpyTYMhQL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 15000, grades: [4,5], tag: 'both', desc: 'Official Minecraft LEGO building kit with Steve & Creeper.', color: '#10b981' },
  { id: 'pokemon_pack',   name: 'Pokémon Booster Bundle',    img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/81Gv3RqCHOL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 12000, grades: [4,5], tag: 'both', desc: '6 booster packs — hunt for rare & holo cards!', color: '#f59e0b' },
  { id: 'barbie_set',     name: 'Barbie Fashion Doll Set',   img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71HqzTgadQL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 14000, grades: [4,5], tag: 'girl', desc: 'Barbie with 5 fashion outfits and accessories.', color: '#ec4899' },
  { id: 'science_kit',    name: 'Science Experiment Kit',    img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71b+GU5LSSL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 12000, grades: [4,5], tag: 'both', desc: '30+ STEM experiments — volcanoes, slime & more!', color: '#06b6d4' },
  { id: 'remote_car',     name: 'RC Off-Road Truck',         img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71t+YZdh3VL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 20000, grades: [4,5], tag: 'boy',  desc: 'Remote-control all-terrain truck, high speed.', color: '#3b82f6' },
  { id: 'bracelet_kit',   name: 'Friendship Bracelet Maker', img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71w9N0WVAWL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 12000, grades: [4,5], tag: 'girl', desc: 'Make 50+ friendship bracelets with loom + threads.', color: '#a78bfa' },

  // ── Grade 6–7 (22,000–40,000 XP ≈ 200–360 passed exams) ─────────────────
  { id: 'roblox_gc',      name: 'Roblox $10 Gift Card',      img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71fvX0dMNaL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 25000, grades: [6,7], tag: 'both', desc: '800 Robux — unlock premium items in your fav games.', color: '#10b981' },
  { id: 'headphones',     name: 'JBL Kids Wireless Headphones', img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/61GNGjMQEYL._AC_SY500_.jpg&w=300&h=300&fit=cover', xpCost: 35000, grades: [6,7], tag: 'both', desc: 'JBL volume-limiting wireless headphones, 12-hour battery.', color: '#8b5cf6' },
  { id: 'skincare_kit',   name: 'Natural Glow Skincare Set', img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71p+CYPq3RL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 22000, grades: [6,7], tag: 'girl', desc: 'Clean & gentle skincare starter set with face mask + SPF.', color: '#f472b6' },
  { id: 'basketball',     name: 'Over-Door Basketball Hoop', img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/61Lf2Q0fOFL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 25000, grades: [6,7], tag: 'boy',  desc: 'Mini hoop + 2 foam balls — perfect for your room.', color: '#f59e0b' },
  { id: 'journal_set',    name: 'Artist Sketchbook + Pens',  img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71gxaHG8UBL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 20000, grades: [6,7], tag: 'both', desc: 'Hardcover sketchbook + 24 Prismacolor fine-liner pens.', color: '#0ea5e9' },
  { id: 'nail_kit',       name: 'Gel Nail Art Studio',       img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71E4sN3N5XL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 24000, grades: [6,7], tag: 'girl', desc: 'Complete nail art kit with UV gel, stickers & tools.', color: '#ec4899' },
  { id: 'nike_shoes',     name: 'Nike Youth Sneakers',       img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71ymDBWO4jL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 40000, grades: [6,7], tag: 'boy',  desc: 'Official Nike youth running shoe — fresh fit.', color: '#f97316' },

  // ── Grade 8 (40,000–80,000 XP ≈ 360–720 passed exams — serious grind!) ──
  { id: 'amazon_gc',      name: 'Amazon $25 Gift Card',      img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/61eRLMGH0ZL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 45000, grades: [8],   tag: 'both', desc: 'Spend $25 on anything you love on Amazon.', color: '#f59e0b' },
  { id: 'ring_light',     name: 'Ring Light + Phone Tripod', img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71NTlLFywSL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 50000, grades: [8],   tag: 'both', desc: '10" ring light + flexible tripod for content creators.', color: '#06b6d4' },
  { id: 'airpods',        name: 'Apple AirPods (3rd Gen)',   img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/61SUj2aKoEL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 80000, grades: [8],   tag: 'both', desc: 'Apple AirPods 3rd generation with Lightning case.', color: '#818cf8' },
  { id: 'nba_jersey',     name: 'NBA Team Jersey',           img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/71H0wdoFHtL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 55000, grades: [8],   tag: 'boy',  desc: 'Official NBA replica jersey of your favorite team.', color: '#10b981' },
  { id: 'perfume_set',    name: 'Ariana Grande Perfume Set', img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/61dkRMB2-kL._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 45000, grades: [8],   tag: 'girl', desc: 'Cloud + Thank U Next travel-size duo gift set.', color: '#f472b6' },
  { id: 'movie_bundle',   name: 'Book + Movie Night Bundle', img: 'https://wsrv.nl/?url=m.media-amazon.com/images/I/91RmBKgd14L._AC_SY500_.jpg&w=300&h=300&fit=cover',  xpCost: 40000, grades: [8],   tag: 'both', desc: 'NYT bestseller + gourmet popcorn + cozy socks bundle.', color: '#7c3aed' },
]

// ── RedeemTab component ───────────────────────────────────────────────────────

function RedeemTab({
  grade, totalXp, cart, onAdd, onRemove,
  cartTotal, canAfford, checkoutDone, onCheckout, name,
}: {
  grade: number; totalXp: number
  cart: RedeemItem[]; onAdd: (i: RedeemItem) => void; onRemove: (id: string) => void
  cartTotal: number; canAfford: boolean; checkoutDone: boolean
  onCheckout: () => void; name: string
}) {
  const [filter, setFilter] = useState<'all' | 'boy' | 'girl'>('all')

  // Show this grade's items + adjacent grade's items (for flexibility)
  const catalog = REDEEM_CATALOG.filter(item => {
    const gradeOk = item.grades.includes(grade) || item.grades.includes(grade - 1) || item.grades.includes(grade + 1)
    const tagOk   = filter === 'all' || item.tag === 'both' || item.tag === filter
    return gradeOk && tagOk
  })

  if (checkoutDone) {
    return (
      <div className="rdm-checkout-done">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220 }}>
          <div className="rdm-done-emoji">🎉</div>
          <h2 className="rdm-done-title">Order Requested!</h2>
          <p className="rdm-done-sub">
            Great job, {name}! Your reward request has been sent to your parent.<br/>
            Keep reading to earn more XP for your next reward!
          </p>
          <div className="rdm-done-stars">⭐ ⭐ ⭐ ⭐ ⭐</div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="rdm-root">
      {/* Left: XP balance + cart */}
      <div className="rdm-sidebar">
        <div className="rdm-balance-card">
          <div className="rdm-balance-label">Your XP Balance</div>
          <div className="rdm-balance-xp">⚡ {totalXp.toLocaleString()} XP</div>
          <div className="rdm-balance-after">
            After checkout: <strong style={{ color: canAfford || cart.length === 0 ? '#4ade80' : '#f87171' }}>
              {(totalXp - cartTotal).toLocaleString()} XP
            </strong>
          </div>
        </div>

        <div className="rdm-cart-title">🛒 My Cart <span className="rdm-cart-count">{cart.length}</span></div>

        {cart.length === 0 ? (
          <div className="rdm-cart-empty">
            <div style={{ fontSize: '2.8rem' }}>🛍️</div>
            <div>Add items from the shop to get started!</div>
          </div>
        ) : (
          <>
            <div className="rdm-cart-items">
              {cart.map(item => (
                <motion.div key={item.id} className="rdm-cart-item"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
                  <div className="rdm-cart-item-img">
                    <img src={item.img} alt={item.name} onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                  </div>
                  <div className="rdm-cart-item-info">
                    <div className="rdm-cart-item-name">{item.name}</div>
                    <div className="rdm-cart-item-xp">⚡ {item.xpCost} XP</div>
                  </div>
                  <button className="rdm-cart-remove" onClick={() => onRemove(item.id)} title="Remove">✕</button>
                </motion.div>
              ))}
            </div>
            <div className="rdm-cart-total">
              <span>Total</span>
              <span>⚡ {cartTotal} XP</span>
            </div>
            {!canAfford && <div className="rdm-cart-warn">⚠️ Not enough XP yet — keep reading!</div>}
            <motion.button
              className={`rdm-checkout-btn${canAfford ? '' : ' disabled'}`}
              whileHover={canAfford ? { scale: 1.03 } : {}}
              whileTap={canAfford ? { scale: 0.97 } : {}}
              onClick={canAfford ? onCheckout : undefined}
            >
              {canAfford ? '🎁 Redeem Rewards' : '🔒 Need More XP'}
            </motion.button>
          </>
        )}
      </div>

      {/* Right: shop catalog */}
      <div className="rdm-catalog">
        <div className="rdm-catalog-header">
          <div>
            <h2 className="rdm-catalog-title">🏪 Reward Shop</h2>
            <p className="rdm-catalog-sub">Grade {grade} picks — spend your hard-earned XP!</p>
          </div>
          <div className="rdm-filter-pills">
            {(['all', 'boy', 'girl'] as const).map(f => (
              <button key={f} className={`rdm-filter-pill${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? '✨ All' : f === 'boy' ? '💙 Boys' : '💗 Girls'}
              </button>
            ))}
          </div>
        </div>

        <div className="rdm-grid">
          {catalog.map((item, idx) => {
            const inCart    = cart.some(c => c.id === item.id)
            const affordable = totalXp >= item.xpCost
            return (
              <motion.div key={item.id} className={`rdm-card${inCart ? ' in-cart' : ''}${!affordable ? ' unaffordable' : ''}`}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{ '--rdm-accent': item.color } as React.CSSProperties}>
                <div className="rdm-card-img-wrap">
                  <div className="rdm-card-glow" />
                  <img
                    src={item.img}
                    alt={item.name}
                    className="rdm-card-img"
                    onError={e => { (e.target as HTMLImageElement).src = 'https://wsrv.nl/?url=via.placeholder.com/300x300/1a0a3a/c084fc?text=🎁' }}
                  />
                  {inCart && <div className="rdm-card-in-cart-badge">✓ In Cart</div>}
                  {!affordable && <div className="rdm-card-locked-badge">🔒</div>}
                </div>
                <div className="rdm-card-body">
                  <div className="rdm-card-name">{item.name}</div>
                  <div className="rdm-card-desc">{item.desc}</div>
                  <div className="rdm-card-footer">
                    <div className="rdm-card-xp">⚡ {item.xpCost} XP</div>
                    <motion.button
                      className={`rdm-add-btn${inCart ? ' in-cart' : ''}${!affordable ? ' locked' : ''}`}
                      whileHover={!inCart && affordable ? { scale: 1.08 } : {}}
                      whileTap={!inCart && affordable ? { scale: 0.95 } : {}}
                      onClick={!inCart && affordable ? () => onAdd(item) : undefined}
                    >
                      {inCart ? '✓ Added' : !affordable ? 'Need XP' : '+ Add'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Rewards() {
  const navigate = useNavigate()
  const [rewards, setRewards]         = useState<StudentRewards>(EMPTY_REWARDS)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [lbLoading, setLbLoading]     = useState(true)
  const [apiError, setApiError]       = useState(false)
  const [tab, setTab] = useState<'overview' | 'badges' | 'leaderboard' | 'redeem'>('overview')
  const [cart, setCart] = useState<RedeemItem[]>([])
  const [checkoutDone, setCheckoutDone] = useState(false)
  const addToCart    = (item: RedeemItem) => setCart(c => c.find(i => i.id === item.id) ? c : [...c, item])
  const removeFromCart = (id: string)   => setCart(c => c.filter(i => i.id !== id))
  const cartTotal    = cart.reduce((s, i) => s + i.xpCost, 0)
  const canAfford    = rewards.total_xp >= cartTotal

  // ── Calendar filter state ──────────────────────────────────────────────────
  const [calMode, setCalMode]     = useState<CalendarMode>('range')
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Default: current week (Sun–Sat)
    const now = new Date()
    const day = now.getDay()
    const sun = new Date(now); sun.setHours(0,0,0,0); sun.setDate(now.getDate() - day)
    const sat = new Date(sun); sat.setDate(sun.getDate() + 6); sat.setHours(23,59,59,999)
    return { start: sun, end: sat }
  })

  // ── Child switcher ─────────────────────────────────────────────────────────
  const [children, setChildren]     = useState<Child[]>([])
  const [activeChild, setActiveChild] = useState<Child | null>(null)

  // Load parent's children once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`)
        .then(r => r.json())
        .then((list: Child[]) => {
          if (!Array.isArray(list) || list.length === 0) return
          setChildren(list)
          // auto-select whatever's in localStorage, else first child
          const savedId = localStorage.getItem('readquest_student_id')
          const match   = list.find(c => c.id === savedId) ?? list[0]
          setActiveChild(match)
          localStorage.setItem('readquest_student_id',   match.id)
          localStorage.setItem('readquest_student_name', match.name)
        })
        .catch(() => {})
    })
  }, [])

  const handleSelectChild = (child: Child) => {
    setActiveChild(child)
    localStorage.setItem('readquest_student_id',   child.id)
    localStorage.setItem('readquest_student_name', child.name)
  }

  const name             = activeChild?.name || localStorage.getItem('readquest_student_name') || 'Reader'
  const currentStudentId = activeChild?.id   || localStorage.getItem('readquest_student_id')   || ''

  // ── Guard: no student selected ─────────────────────────────────────────────
  const hasStudent = !!currentStudentId

  useEffect(() => {
    if (!hasStudent) {
      setLoading(false)
      setLbLoading(false)
      return
    }

    setLoading(true)
    setRewards(EMPTY_REWARDS)

    // Convert Date objects to ISO date strings for the API
    const toISO = (d: Date) => d.toISOString().split('T')[0]

    rewardsApi.getXP(toISO(dateRange.start), toISO(dateRange.end))
      .then(r => {
        const data = r.data as StudentRewards & { weekly_activity?: { date: string; active: boolean }[] }
        setRewards(prev => ({
          ...prev,
          ...data,
          badges: data.badges && data.badges.length > 0 ? data.badges : FALLBACK_BADGES,
          xp_history: data.xp_history ?? prev.xp_history,
          weekly_activity: data.weekly_activity ?? prev.weekly_activity,
        }))
        // Sync real XP to the global badge
        if (data.total_xp != null) emitXpUpdate(data.total_xp)
        setApiError(false)
      })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false))

    // Only re-fetch leaderboard when student changes (not on every date change)
    if (!loading) return
    rewardsApi.getLeaderboard()
      .then(r => setLeaderboard(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLbLoading(false))
  }, [currentStudentId, hasStudent, dateRange.start.toISOString(), dateRange.end.toISOString()])

  // ── Derived display data ────────────────────────────────────────────────────
  // Backend now returns exactly the date window requested — use data as-is
  const xpHistory      = rewards.xp_history ?? []
  const weeklyActivity = rewards.weekly_activity ?? []
  const maxXP          = Math.max(...xpHistory.map(d => d.amount), 1)

  const streakDots = weeklyActivity.map(w => ({
    label: w.date ? new Date(w.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).charAt(0) : '?',
    active: w.active,
    date: w.date,
  }))

  const top3   = leaderboard.slice(0, 3)
  const restLb = leaderboard.slice(3)

  // ── No student selected — prompt ───────────────────────────────────────────
  if (!hasStudent) {
    return (
      <div className="app-shell">
        <AppSidebar active="rewards" />
        <div className="app-content rew-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🧒</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'rgba(233,221,255,0.9)', marginBottom: 8 }}>
              Select a Student First
            </h2>
            <p style={{ color: 'rgba(204,195,216,0.5)', marginBottom: 28, maxWidth: 320 }}>
              Go to the Dashboard and tap a student's name to load their rewards.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/dashboard')}
              style={{ background: 'var(--rq-gradient-primary)', color: 'white', border: 'none', borderRadius: '999px', padding: '14px 32px', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(112,42,225,0.35)' }}>
              🏠 Go to Dashboard
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AppSidebar active="rewards" />

      <div className="app-content rew-root">

        {/* ── Dark hero banner ── */}
        <div className="rew-hero">
          <div className="rew-hero-content">
            <motion.div className="rew-level-circle"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
              <div className="rew-level-label">Level</div>
              <div className="rew-level-num">{loading ? '…' : rewards.level}</div>
            </motion.div>

            <div className="rew-hero-text">
              <motion.h2 className="rew-level-name"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {loading ? 'Loading…' : (rewards.level_name || LEVEL_NAMES[rewards.level])}
              </motion.h2>

              {/* ── Child switcher pills ── */}
              {children.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  {children.map((child, i) => {
                    const isActive = child.id === currentStudentId
                    const hue = (i * 137) % 360
                    return (
                      <motion.button
                        key={child.id}
                        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelectChild(child)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 16px 7px 8px',
                          borderRadius: 999,
                          background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                          border: isActive ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(255,255,255,0.15)',
                          color: 'white',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.85rem',
                          backdropFilter: 'blur(8px)',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
                        }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: `hsl(${hue}, 70%, 60%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.78rem', color: '#fff', flexShrink: 0,
                        }}>
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                        {child.name}
                        {isActive && <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>✓</span>}
                      </motion.button>
                    )
                  })}
                </motion.div>
              )}

              <motion.div className="rew-stats-row"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <div className="rew-stat">
                  <span className="rew-stat-val">⚡ {rewards.total_xp}</span>
                  <span className="rew-stat-lbl">Total XP</span>
                </div>
                <div className="rew-stat-divider" />
                <div className="rew-stat">
                  <span className="rew-stat-val">🔥 {rewards.current_streak}</span>
                  <span className="rew-stat-lbl">Day Streak</span>
                </div>
                <div className="rew-stat-divider" />
                <div className="rew-stat">
                  <span className="rew-stat-val">📚 {rewards.stories_read ?? 0}</span>
                  <span className="rew-stat-lbl">Books Read</span>
                </div>
                <div className="rew-stat-divider" />
                <div className="rew-stat">
                  <span className="rew-stat-val">{name}</span>
                  <span className="rew-stat-lbl">Reader</span>
                </div>
              </motion.div>

              <motion.div className="rew-xp-bar-wrap"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <div className="rew-xp-bar-track">
                  <motion.div className="rew-xp-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${rewards.xp_progress_pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.45 }} />
                </div>
                <div className="rew-xp-bar-labels">
                  <span>{rewards.total_xp} XP</span>
                  <span>{rewards.xp_to_next_level} XP to level up</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── API error banner ── */}
        {apiError && (
          <div style={{ background: '#FEF3C7', borderBottom: '1px solid #FCD34D', padding: '10px 24px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 600, color: '#92400E' }}>
            ⚠️ Couldn't load rewards data. Check your connection or ensure the backend is running.
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="rew-tabs-wrap">
          <div className="rew-tabs">
            {(['overview', 'badges', 'leaderboard', 'redeem'] as const).map(t => (
              <button key={t} className={`rew-tab${tab === t ? ' active' : ''}${t === 'redeem' ? ' rew-tab-redeem' : ''}`} onClick={() => { setTab(t); if (t !== 'redeem') setCheckoutDone(false) }}>
                {t === 'overview' ? '📊 Overview' : t === 'badges' ? '🏅 Achievements' : t === 'leaderboard' ? '🏆 Leaderboard' : '🎁 Redeem XP'}
                {t === 'redeem' && cart.length > 0 && <span className="rew-tab-cart-badge">{cart.length}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="rew-content">
          <AnimatePresence mode="wait">

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <motion.div key="overview" className="rew-overview"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>

                {/* Calendar filter bar — full-width row */}
                <div className="rew-cal-bar">
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(204,195,216,0.45)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Showing activity for
                  </span>
                  <CalendarPicker
                    mode={calMode}
                    onModeChange={setCalMode}
                    dateRange={dateRange}
                    onRangeChange={setDateRange}
                  />
                </div>

                {/* Chart cards — side by side on wide, stacked on narrow */}
                <div className="rew-cards-row">

                  {/* XP Activity bar chart */}
                  <div className="rew-card">
                    <h3 className="rew-card-title">📈 XP Activity</h3>
                    {loading ? (
                      <div className="rew-bar-chart">
                        {[0,1,2,3,4,5,6].map(i => (
                          <div key={i} className="rew-bar-col">
                            <span className="rew-bar-val" />
                            <div className="rew-bar-track-v" style={{ opacity: 0.4 }} />
                            <span className="rew-bar-lbl">—</span>
                          </div>
                        ))}
                      </div>
                    ) : xpHistory.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--rq-text-muted)', fontSize: '0.9rem' }}>
                        No XP earned in this period. Start reading! 📖
                      </div>
                    ) : (
                      <div className="rew-bar-chart">
                        {xpHistory.map((d, i) => (
                          <div key={i} className="rew-bar-col">
                            <span className="rew-bar-val">{d.amount > 0 ? d.amount : ''}</span>
                            <div className="rew-bar-track-v">
                              <motion.div
                                className="rew-bar-fill-v"
                                initial={{ height: 0 }}
                                animate={{ height: `${(d.amount / maxXP) * 100}%` }}
                                transition={{ delay: 0.08 * i + 0.1, duration: 0.55, ease: 'easeOut' }}
                                style={{ background: d.amount === 0 ? 'var(--rq-surface-highest)' : undefined }}
                              />
                            </div>
                            <span className="rew-bar-lbl">{d.date ? new Date(d.date + 'T12:00:00').toLocaleDateString('en-US',{weekday:'short'}).charAt(0) : '?'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reading Consistency */}
                  <div className="rew-card">
                    <h3 className="rew-card-title">🔥 Reading Consistency</h3>
                    {loading ? (
                      <div className="streak-week">
                        {[0,1,2,3,4,5,6].map(i => (
                          <div key={i} className="streak-day">
                            <div className="streak-circle" style={{ opacity: 0.4 }} />
                            <div className="streak-labels">
                              <span className="streak-label">—</span>
                              <span className="streak-date-num">—</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : streakDots.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--rq-text-muted)', fontSize: '0.9rem' }}>
                        No reading activity in this period. 📅
                      </div>
                    ) : (
                      <div className="streak-week">
                        {streakDots.map((dot, i) => {
                          const dayNum = dot.date
                            ? new Date(dot.date + 'T12:00:00').getDate()
                            : null
                          return (
                            <div key={i} className={`streak-day ${dot.active ? 'active' : ''}`}>
                              <div className="streak-circle">
                                {dot.active && (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="streak-labels">
                                <span className="streak-label">{dot.label}</span>
                                {dayNum !== null && <span className="streak-date-num">{dayNum}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                </div>{/* end rew-cards-row */}
              </motion.div>
            )}

            {/* BADGES — real data from DB, fallback to preview if empty */}
            {tab === 'badges' && (
              <motion.div key="badges"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
                {rewards.badges.length === 0 && !loading ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--rq-text-muted)' }}>
                    🏅 No badges yet — read more stories to unlock them!
                  </div>
                ) : (
                  <div className="rew-badges-grid">
                    {rewards.badges.map((b, idx) => (
                      <motion.div key={b.id}
                        className={`rew-badge-card ${b.earned ? 'earned' : 'locked'}`}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}>
                        <div className="rew-badge-icon">
                          {b.earned ? (
                            <span style={{ fontSize: '1.6rem' }}>{b.icon}</span>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </div>
                        <div className="rew-badge-info">
                          <div className="rew-badge-name">{b.icon} {b.name}</div>
                          <div className="rew-badge-desc">{b.description}</div>
                          {b.earned && <div className="rew-badge-status">✅ Earned</div>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* LEADERBOARD */}
            {tab === 'leaderboard' && (
              <motion.div key="leaderboard" className="rew-leaderboard"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>

                {lbLoading ? (
                  <div className="lb-loading">⏳ Loading leaderboard...</div>
                ) : leaderboard.length === 0 ? (
                  <div className="lb-empty">🏆 No students yet — start reading to appear here!</div>
                ) : (
                  <>
                    {/* Podium (top 3) */}
                    {top3.length > 0 && (
                      <div className="lb-podium">
                        {top3.map((entry, i) => {
                          const rank = i + 1
                          const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
                          const isMe = entry.student_id === currentStudentId
                          return (
                            <motion.div key={entry.student_id}
                              className={`lb-podium-slot rank-${rank}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * i, type: 'spring', stiffness: 220 }}>
                              <div className="lb-podium-avatar">
                                {rank === 1 && <span className="lb-podium-crown">👑</span>}
                                {entry.name[0].toUpperCase()}
                              </div>
                              <div className="lb-podium-name">{entry.name}{isMe ? ' 👈' : ''}</div>
                              <div className="lb-podium-xp">⚡ {entry.total_xp} XP</div>
                              <div className="lb-podium-bar">{medalEmoji}</div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}

                    {/* Full table (always show all, including top 3 again for clarity) */}
                    <div className="lb-table">
                      <div className="lb-header">
                        <div className="lb-col-rank">Rank</div>
                        <div className="lb-col-user">Reader</div>
                        <div className="lb-col-score">XP</div>
                      </div>
                      <div className="lb-body">
                        {leaderboard.map((entry, i) => {
                          const isMe = entry.student_id === currentStudentId
                          const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.rank}`
                          return (
                            <motion.div key={entry.student_id + i}
                              className={`lb-row ${isMe ? 'me' : ''}`}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.04 * i }}>
                              <span className={`rank-num rank-${Math.min(entry.rank, 3)}`}>{rankIcon}</span>
                              <div className="lb-col-user">
                                <div className="lb-avatar">{entry.name[0].toUpperCase()}</div>
                                <div className="lb-info">
                                  <div className="lb-name">{entry.name}{isMe ? ' 👈 You' : ''}</div>
                                  <div className="lb-level">{entry.level_name}</div>
                                </div>
                              </div>
                              <div className="lb-col-score">
                                <span className="score-val">{entry.total_xp} XP</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* REDEEM XP SHOP */}
            {tab === 'redeem' && (
              <motion.div key="redeem"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
                <RedeemTab
                  grade={activeChild?.grade_level ?? 1}
                  totalXp={rewards.total_xp}
                  cart={cart}
                  onAdd={addToCart}
                  onRemove={removeFromCart}
                  cartTotal={cartTotal}
                  canAfford={canAfford}
                  checkoutDone={checkoutDone}
                  onCheckout={() => { setCart([]); setCheckoutDone(true) }}
                  name={name}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
